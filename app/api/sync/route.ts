import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

const GREEN_INSTANCE = process.env.GREEN_API_INSTANCE || "";
const GREEN_TOKEN = process.env.GREEN_API_TOKEN || "";
const CHAT_ID = process.env.BERRYCAKE_CHAT_ID || "";

const ORDER_KEYWORDS = ["название","дата","количество","адрес","номер для связи","бенто","время","оплата"];

function looksLikeOrder(text: string) {
  if (!text || text.length < 20) return false;
  const lower = text.toLowerCase();
  return ORDER_KEYWORDS.filter((kw) => lower.includes(kw)).length >= 2;
}

function getField(text: string, ...keys: string[]) {
  for (const key of keys) {
    const m = text.match(new RegExp(`${key}\\s*[:\\-]\\s*(.+)`, "i"));
    if (m) return m[1].trim();
  }
  return null;
}

function cleanTime(val: string | null) {
  if (!val) return null;
  const m = val.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : null;
}

function parseDate(raw: string | null) {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  return null;
}

function parseNumber(raw: string | null): number | null {
  if (!raw) return null;
  const s = raw.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

async function getClientRate(name: string | null, phone: string | null): Promise<number | null> {
  if (!name && !phone) return null;
  const q = supabase.from("berrycake_clients").select("price_per_unit").limit(1);
  if (phone) q.eq("phone", phone);
  else if (name) q.ilike("name", `%${name}%`);
  const { data } = await q.single();
  return data?.price_per_unit ?? null;
}

function parseOrder(text: string) {
  const phoneRaw = getField(text, "номер для связи", "номер", "телефон");
  let phone = phoneRaw ? phoneRaw.replace(/[^\d+]/g, "") : null;
  if (phone && phone.length < 7) phone = null;

  const qtyMatch = text.match(/количество\s*[:\-]\s*(\d{1,3})(?:\s|$|[^\d])/i);
  const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : null;

  const paymentType = getField(text, "оплата", "тип оплаты");
  const prepaidRaw = getField(text, "предоплата");
  const paid = parseNumber(prepaidRaw);

  const notes: string[] = [];
  const decor = getField(text, "оформление");
  if (decor) notes.push(`Оформление: ${decor.slice(0, 80)}`);

  return {
    client_name: getField(text, "название", "клиент"),
    phone,
    cake_flavor: getField(text, "бенто", "вкус", "начинка"),
    quantity: qty,
    order_date: parseDate(getField(text, "дата")),
    order_time: cleanTime(getField(text, "время")),
    address: getField(text, "адрес"),
    payment_type: paymentType,
    paid_amount: paid,
    notes: notes.join("; ") || null,
  };
}

async function runSync() {
  try {
    const res = await fetch(
      `https://api.green-api.com/waInstance${GREEN_INSTANCE}/getChatHistory/${GREEN_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: CHAT_ID.includes("@") ? CHAT_ID : `${CHAT_ID}@g.us`, count: 700 }),
      }
    );
    const messages = await res.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Bad response from Green API", raw: messages });
    }

    const orderMessages = messages.filter(
      (m) =>
        (m.typeMessage === "textMessage" || m.typeMessage === "extendedTextMessage") &&
        looksLikeOrder(m.textMessage || "")
    );

    let inserted = 0;
    let skipped = 0;

    for (const msg of orderMessages) {
      const text = msg.textMessage || "";
      const parsed = parseOrder(text);
      const createdAt = new Date(msg.timestamp * 1000).toISOString();

      // Auto-calculate total from client rate × quantity
      let total_amount: number | null = null;
      const rate = await getClientRate(parsed.client_name, parsed.phone);
      if (rate && parsed.quantity) total_amount = rate * parsed.quantity;

      const { error } = await supabase.from("berrycake_orders").upsert(
        {
          whatsapp_message_id: msg.idMessage,
          raw_message: text,
          ...parsed,
          total_amount,
          created_at: createdAt,
          status: "new",
        },
        { onConflict: "whatsapp_message_id", ignoreDuplicates: true }
      );

      if (error) skipped++;
      else inserted++;
    }

    return NextResponse.json({
      ok: true,
      fetched: messages.length,
      orderMessages: orderMessages.length,
      inserted,
      skipped,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — вызов с дашборда (без авторизации, внутренний)
export async function POST() {
  return runSync();
}

// GET — Vercel Cron (требует CRON_SECRET)
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSync();
}
