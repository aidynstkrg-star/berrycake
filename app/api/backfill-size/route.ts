import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

// One-off migration: records created before the "size" field existed have
// no S/M/L tag, so the flavor+size stock balance silently skips them.
// This backfills a default size so old stock isn't invisible to the tracker.
const DEFAULT_SIZE = "S";

export async function POST() {
  const { data: prodRows, error: prodErr } = await supabase
    .from("berrycake_production")
    .select("id")
    .is("size", null);
  if (prodErr) return NextResponse.json({ error: "production select: " + prodErr.message });

  if (prodRows && prodRows.length) {
    const { error } = await supabase
      .from("berrycake_production")
      .update({ size: DEFAULT_SIZE })
      .is("size", null);
    if (error) return NextResponse.json({ error: "production update: " + error.message });
  }

  const { data: orders, error: ordersErr } = await supabase
    .from("berrycake_orders")
    .select("id,cake_flavor");
  if (ordersErr) return NextResponse.json({ error: "orders select: " + ordersErr.message });

  let updatedOrders = 0;
  for (const o of orders || []) {
    const raw = o.cake_flavor || "";
    if (!raw || raw === "прочее") continue;
    const parts = raw.split(" + ").map((p: string) => p.trim()).filter(Boolean);
    if (!parts.length) continue;

    let changed = false;
    const newParts = parts.map((part: string) => {
      if (/\s+(S|M|L)(\s*×\s*\d+)?$/.test(part)) return part; // already tagged
      changed = true;
      const m = part.match(/^(.*?)\s*×\s*(\d+)$/);
      return m ? `${m[1].trim()} ${DEFAULT_SIZE} ×${m[2]}` : `${part} ${DEFAULT_SIZE}`;
    });
    if (!changed) continue;

    const { error } = await supabase
      .from("berrycake_orders")
      .update({ cake_flavor: newParts.join(" + ") })
      .eq("id", o.id);
    if (!error) updatedOrders++;
  }

  return NextResponse.json({ ok: true, productionBackfilled: prodRows?.length || 0, ordersBackfilled: updatedOrders });
}
