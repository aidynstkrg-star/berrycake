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

function parseNumber(raw: string): number | null {
  // "9 000", "9.000", "9000", "9к"
  const s = raw.trim();
  const m = s.match(/^([\d\s.,]+)(к)?$/i);
  if (!m) return null;
  let clean = m[1].replace(/\s/g, "");
  // "9.000" or "9,000" → 9000 (thousands separator)
  if (clean.includes(".") && clean.split(".").pop()?.length === 3) clean = clean.replace(".", "");
  if (clean.includes(",") && clean.split(",").pop()?.length === 3) clean = clean.replace(",", "");
  clean = clean.replace(",", ".");
  let num = parseFloat(clean);
  if (m[2]?.toLowerCase() === "к") num *= 1000;
  return isNaN(num) ? null : num;
}

// Parses multi-line nakładna:
// "мука 25кг 9000\nкремчиз 1,5кг 2880\nИтого: 11880"
// Returns total (from "Итого" line if present, else sum of detected numbers)
function parseAmount(text: string): number | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Look for explicit "Итого" / "Сумма:" line first
  for (const line of lines) {
    const m = line.match(/^(итого|сумма|total)\s*[:\-]?\s*([\d\s.,к]+)/i);
    if (m) {
      const v = parseNumber(m[2]);
      if (v) return v;
    }
  }

  // Single-line: find last standalone number in text
  // "Сумма: 15000 тг" or "-300.000 аренда"
  const singleM = text.match(/(?:сумма|расход)[:\s]+(-?[\d\s.,к]+)/i);
  if (singleM) {
    const v = parseNumber(singleM[1]);
    if (v) return Math.abs(v);
  }

  // Multi-line nakładna without "Итого": sum all line amounts
  // Each line: "мука 25кг 9000" → last number on the line
  let lineSum = 0;
  let lineCount = 0;
  for (const line of lines) {
    const skip = /^(дата|категория|описание|чат|от|итого|накладная|расход)/i.test(line);
    if (skip) continue;
    const nums = [...line.matchAll(/([\d][\d\s.,]*)(к|тг|тенге)?\s*$/gi)];
    if (nums.length > 0) {
      const last = nums[nums.length - 1];
      const v = parseNumber(last[1] + (last[2] || ""));
      if (v && v > 0) { lineSum += v; lineCount++; }
    }
  }
  if (lineCount >= 2) return lineSum;

  // Fallback: first big number in text
  const allNums = [...text.matchAll(/\b(\d[\d\s.,]{2,})\b/g)];
  for (const n of allNums) {
    const v = parseNumber(n[1]);
    if (v && v >= 100) return v;
  }
  return null;
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
