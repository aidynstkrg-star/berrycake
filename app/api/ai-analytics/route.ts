import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

export async function POST() {
  const [ordersRes, flavorRes, dailyRes] = await Promise.all([
    supabase.from("berrycake_orders").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("flavor_stats").select("*").order("order_count", { ascending: false }).limit(10),
    supabase.from("daily_stats").select("*").order("order_date", { ascending: false }).limit(30),
  ]);

  const summary = {
    totalOrders: ordersRes.data?.length ?? 0,
    topFlavors: (flavorRes.data as any[])?.slice(0, 5).map((f) => `${f.cake_flavor}: ${f.order_count} заказов, ${f.total_cakes} тортов`),
    dailyTrend: (dailyRes.data as any[])?.slice(0, 7).map((d) => `${d.order_date}: ${d.orders} заказов, ${d.cakes} тортов`),
    topClients: Object.entries(
      (ordersRes.data || []).reduce((acc: Record<string, number>, o) => {
        const name = o.client_name || o.customer_name;
        if (name) acc[name] = (acc[name] || 0) + (Number(o.quantity) || 1);
        return acc;
      }, {})
    ).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5).map(([name, qty]) => `${name}: ${qty} тортов`),
  };

  const prompt = `Ты аналитик кондитерского бизнеса BerryCake. Проанализируй данные и дай конкретные рекомендации.

Данные за последние 30 дней:
- Всего заказов в выборке: ${summary.totalOrders}
- Топ вкусов: ${summary.topFlavors?.join("; ")}
- Топ клиентов (по кол-ву тортов): ${summary.topClients?.join("; ")}
- Тренд последних 7 дней: ${summary.dailyTrend?.join("; ")}

Дай анализ в формате:
1. 📈 Тренды (2-3 пункта)
2. 🏆 Инсайты по клиентам (2-3 пункта)
3. 🍰 Инсайты по вкусам (2-3 пункта)
4. 💡 Конкретные рекомендации (3-4 пункта)

Пиши кратко и по делу, на русском.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content[0];
  const text = block.type === "text" ? (block as { type: "text"; text: string }).text : "";

  return NextResponse.json({ analysis: text, data: summary });
}
