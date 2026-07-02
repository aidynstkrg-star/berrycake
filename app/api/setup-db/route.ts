import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

export async function POST() {
  // Test table access
  const { data: testData, error: testErr } = await supabase
    .from("berrycake_clients")
    .select("id")
    .limit(1);

  if (testErr) {
    return NextResponse.json({ error: "Table not accessible: " + testErr.message });
  }

  // Fetch all unique clients from orders
  const { data: orders } = await supabase
    .from("berrycake_orders")
    .select("client_name, phone")
    .limit(5000);

  const seen: Record<string, any> = {};
  for (const o of orders || []) {
    const name = (o.client_name || "").trim();
    const phone = (o.phone || "").trim();
    if (!name || name.length < 2) continue;
    const key = name.toLowerCase();
    if (!seen[key]) seen[key] = { name, phone: phone || null, client_type: "розница" };
    else if (phone && !seen[key].phone) seen[key].phone = phone;
  }

  const clients = Object.values(seen);

  // Upsert clients
  const { data: inserted, error: insertErr } = await supabase
    .from("berrycake_clients")
    .upsert(clients, { onConflict: "name", ignoreDuplicates: true });

  if (insertErr) {
    return NextResponse.json({ error: "Insert error: " + insertErr.message });
  }

  return NextResponse.json({ ok: true, clients: clients.length, message: `Загружено ${clients.length} клиентов` });
}
