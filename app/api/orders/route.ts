import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { error } = await supabase.from("berrycake_orders").insert({
    client_name: body.client_name || null,
    phone: body.phone || null,
    cake_flavor: body.cake_flavor || null,
    quantity: body.quantity ? Number(body.quantity) : null,
    order_date: body.order_date || null,
    order_time: body.order_time || null,
    address: body.address || null,
    notes: body.notes || null,
    status: "new",
    whatsapp_message_id: `manual_${Date.now()}`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
