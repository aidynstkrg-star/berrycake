import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

const DEFAULT_FLAVORS = ["ВУПИ", "МОЛОЧКА", "ЯГОДНЫЙ", "НУТЕЛЛА", "СНИКЕРС", "СГУЩЕНКА ОРЕХ"];

export async function POST() {
  const rows = DEFAULT_FLAVORS.map((name, i) => ({ name, active: true, sort_order: i + 1 }));

  const { error: insertErr } = await supabase
    .from("berrycake_flavors")
    .upsert(rows, { onConflict: "name", ignoreDuplicates: true });

  if (insertErr) {
    return NextResponse.json({ error: "Insert error: " + insertErr.message });
  }

  const { data, error: listErr } = await supabase
    .from("berrycake_flavors")
    .select("name,active,sort_order")
    .order("sort_order");

  if (listErr) {
    return NextResponse.json({ error: "List error: " + listErr.message });
  }

  return NextResponse.json({ ok: true, flavors: data });
}
