import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const CHAT_ID = process.env.BERRYCAKE_CHAT_ID;

async function parseOrder(text: string) {
  const res = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Извлеки данные из заявки на бенто торт. Верни ТОЛЬКО JSON.

Заявка:
${text}

JSON:
{
  "client_name": "имя или null",
  "order_date": "YYYY-MM-DD или null",
  "order_time": "HH:MM или null",
  "quantity": число или null,
  "cake_flavor": "вкус или null",
  "decoration": "оформление или null",
  "address": "адрес или null",
  "phone": "телефон или null",
  "notes": "доп. детали или null",
  "is_order": true/false
}`
    }]
  });

  try { return JSON.parse(res.content[0].text.trim()); }
  catch { return null; }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (
    body.typeWebhook !== "incomingMessageReceived" ||
    body.senderData?.chatId !== CHAT_ID
  ) {
    return NextResponse.json({ ok: true });
  }

  const text = body.messageData?.textMessageData?.textMessage;
  if (!text) return NextResponse.json({ ok: true });

  const parsed = await parseOrder(text);
  if (!parsed?.is_order) return NextResponse.json({ ok: true });

  await supabase.from("berrycake_orders").upsert({
    client_name: parsed.client_name,
    order_date: parsed.order_date,
    order_time: parsed.order_time,
    quantity: parsed.quantity,
    cake_flavor: parsed.cake_flavor,
    decoration: parsed.decoration,
    address: parsed.address,
    phone: parsed.phone,
    notes: parsed.notes,
    raw_message: text,
    whatsapp_message_id: body.idMessage,
    message_timestamp: new Date(body.timestamp * 1000).toISOString(),
    status: "new",
  }, { onConflict: "whatsapp_message_id" });

  return NextResponse.json({ ok: true });
}
