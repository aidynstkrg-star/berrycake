import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

export async function POST(req: NextRequest) {
  const body = await req.json();

  const chatId = process.env.BERRYCAKE_CHAT_ID || "";
  const senderChatId = body?.senderData?.chatId || body?.body?.senderData?.chatId || "";

  if (!senderChatId.includes(chatId)) {
    return NextResponse.json({ ok: true });
  }

  const messageText =
    body?.messageData?.textMessageData?.textMessage ||
    body?.body?.messageData?.textMessageData?.textMessage ||
    "";

  if (!messageText) {
    return NextResponse.json({ ok: true });
  }

  const whatsappMessageId =
    body?.idMessage || body?.body?.idMessage || `msg_${Date.now()}`;

  let parsed;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Из текста заказа торта извлеки данные в JSON. Верни только JSON без пояснений.
Поля: customer_name (string), phone (string), flavor (string), weight (number, кг), price (number, тенге), delivery_date (string ISO или null), notes (string или null).
Если поле не упоминается — null.

Текст заказа:
${messageText}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    parsed = {};
  }

  await supabase.from("berrycake_orders").upsert(
    {
      whatsapp_message_id: whatsappMessageId,
      raw_text: messageText,
      customer_name: parsed.customer_name || null,
      phone: parsed.phone || null,
      flavor: parsed.flavor || null,
      weight: parsed.weight || null,
      price: parsed.price || null,
      delivery_date: parsed.delivery_date || null,
      notes: parsed.notes || null,
    },
    { onConflict: "whatsapp_message_id" }
  );

  return NextResponse.json({ ok: true });
}
