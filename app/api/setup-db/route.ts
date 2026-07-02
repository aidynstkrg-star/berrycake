import { NextResponse } from "next/server";

export async function POST() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";
  const url = process.env.SUPABASE_URL || "";

  const sql = `
    CREATE TABLE IF NOT EXISTS berrycake_clients (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      name text NOT NULL UNIQUE,
      phone text,
      price_per_unit numeric,
      client_type text DEFAULT 'розница',
      notes text,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE berrycake_clients DISABLE ROW LEVEL SECURITY;
    ALTER TABLE berrycake_orders ADD COLUMN IF NOT EXISTS total_amount numeric;
    ALTER TABLE berrycake_orders ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;
    ALTER TABLE berrycake_orders ADD COLUMN IF NOT EXISTS payment_type text;
  `;

  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  // fallback: try pg endpoint
  if (!res.ok) {
    // Try raw pg query via supabase management
    const pgRes = await fetch(`${url.replace("supabase.co", "supabase.co")}/pg/query`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });
    const pgBody = await pgRes.text();
    return NextResponse.json({ pg: pgBody, pgStatus: pgRes.status });
  }

  const body = await res.text();
  return NextResponse.json({ ok: true, body, status: res.status });
}
