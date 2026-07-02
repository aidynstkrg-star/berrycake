import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const { data, error } = await supabase
    .from("berrycake_users")
    .select("id, name, role")
    .eq("pin", String(pin))
    .single();
  if (error || !data) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, name: data.name, role: data.role });
}
