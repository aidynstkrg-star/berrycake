import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

const GREEN_INSTANCE = process.env.GREEN_API_INSTANCE || "";
const GREEN_TOKEN = process.env.GREEN_API_TOKEN || "";
const EXPENSES_CHAT_ID = process.env.EXPENSES_CHAT_ID || "";

const CATEGORIES: Record<string, string[]> = {
  "аренда":     ["аренда", "цех", "офис", "помещение"],
  "ингредиенты":["мука", "сахар", "масло", "яйца", "шоколад", "сливки", "творог", "продукты", "ингредиент"],
  "упаковка":   ["коробк", "упаковк", "пакет", "лент", "бумаг"],
  "зарплата":   ["зарплат", "аванс", "оклад", "выплат"],
  "доставка":   ["доставк", "курьер", "яндекс", "казпочт"],
  "реклама":    ["реклам", "instagram", "инстаграм", "таргет", "smm"],
  "оборудование":["миксер", "духовк", "форм", "инструмент", "оборудован"],
  "обед":       ["обед", "еда", "питани", "кофе"],
  "налоги":     ["налог", "есп", "пенсион"],
};

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "прочее";
}

function parseAmount(text: string): number | null {
  // Matches: -300.000, 300 000, 300000, 300к, 300тг
  const clean = text.replace(/\s/g, "");
  const m = clean.match(/[-]?(\d[\d.,]*\d|\d+)(к|тг|тенге)?/i);
  if (!m) return null;
  let num = parseFloat(m[1].replace(/,/g, ".").replace(/\./g, ""));
  // Handle "300.000" → 300000 (Kazakh notation: dot as thousands separator)
  const raw = m[1];
  if (raw.includes(".") && raw.split(".")[1]?.length === 3) {
    num = parseFloat(raw.replace(".", ""));
  }
  if (m[2]?.toLowerCase() === "к") num *= 1000;
  return isNaN(num) ? null : Math.abs(num);
}

function parseDate(text: string, fallback: string): string {
  const m = text.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?/);
  if (m) {
    const y = m[3] || new Date().getFullYear().toString();
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return fallback;
}

function isExpense(text: string): boolean {
  if (!text || text.length < 5) return false;
  const lower = text.toLowerCase();
  // Must have: amount pattern + expense keyword, OR explicit template fields
  const hasAmount = /[-]?\d[\d\s.,]*\d?\s*(к|тг|тенге|000)?/i.test(text);
  const hasKeyword = ["расход", "сумма:", "категория:", "трат", "-"].some((kw) =>
    lower.includes(kw)
  );
  const isSystem = ["прикреплено", "добавил", "изменил", "создал", "аудио", "фото"].some((s) =>
    lower.includes(s)
  );
  return hasAmount && hasKeyword && !isSystem;
}

async function runExpenseSync() {
  if (!EXPENSES_CHAT_ID) {
    return NextResponse.json({ error: "EXPENSES_CHAT_ID не настроен" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.green-api.com/waInstance${GREEN_INSTANCE}/getChatHistory/${GREEN_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: EXPENSES_CHAT_ID.includes("@") ? EXPENSES_CHAT_ID : `${EXPENSES_CHAT_ID}@g.us`,
          count: 500,
        }),
      }
    );

    const messages = await res.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Bad response from Green API", raw: messages });
    }

    let inserted = 0;
    let skipped = 0;

    for (const msg of messages) {
      const text: string = msg.textMessage || msg.extendedTextMessage?.text || "";
      if (!isExpense(text)) continue;

      const createdAt = new Date(msg.timestamp * 1000).toISOString();
      const dateStr = createdAt.slice(0, 10);
      const amount = parseAmount(text);
      const hasReceipt =
        msg.typeMessage === "imageMessage" ||
        msg.typeMessage === "documentMessage" ||
        msg.typeMessage === "extendedTextMessage";

      const { error } = await supabase.from("berrycake_expenses").upsert(
        {
          whatsapp_message_id: msg.idMessage,
          raw_message: text.slice(0, 1000),
          amount,
          category: detectCategory(text),
          description: text.split("\n")[0].slice(0, 200),
          expense_date: parseDate(text, dateStr),
          confirmed_by: msg.senderName || null,
          has_receipt: hasReceipt,
          created_at: createdAt,
        },
        { onConflict: "whatsapp_message_id", ignoreDuplicates: true }
      );

      if (error) skipped++;
      else inserted++;
    }

    return NextResponse.json({
      ok: true,
      fetched: messages.length,
      inserted,
      skipped,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST() {
  return runExpenseSync();
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runExpenseSync();
}
