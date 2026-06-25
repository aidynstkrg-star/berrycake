// app/page.tsx — BerryCake Analytics Dashboard
// Next.js 14 App Router + Supabase + Recharts

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DailyStat { order_date: string; orders: number; cakes: number }
interface FlavorStat { cake_flavor: string; order_count: number; total_cakes: number }
interface Order {
  id: string; client_name: string; order_date: string;
  order_time: string; quantity: number; cake_flavor: string;
  address: string; phone: string; status: string;
}

export default function Dashboard() {
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [flavors, setFlavors] = useState<FlavorStat[]>([]);
  const [recent, setRecent] = useState<Order[]>([]);
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayCakes, setTodayCakes] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    // Обновление каждые 5 минут
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAll() {
    const [dailyRes, flavorsRes, recentRes, todayRes, totalRes] = await Promise.all([
      supabase.from("daily_stats").select("*").limit(30),
      supabase.from("flavor_stats").select("*").limit(10),
      supabase.from("berrycake_orders").select("*").order("message_timestamp", { ascending: false }).limit(20),
      supabase.from("today_stats").select("*").single(),
      supabase.from("berrycake_orders").select("id", { count: "exact", head: true }),
    ]);

    if (dailyRes.data) setDaily([...dailyRes.data].reverse());
    if (flavorsRes.data) setFlavors(flavorsRes.data);
    if (recentRes.data) setRecent(recentRes.data);
    if (todayRes.data) {
      setTodayOrders(todayRes.data.orders_today || 0);
      setTodayCakes(todayRes.data.cakes_today || 0);
    }
    if (totalRes.count) setTotalOrders(totalRes.count);
    setLoading(false);
  }

  const statusColor: Record<string, string> = {
    new: "#c8a96e",
    confirmed: "#4caf78",
    done: "#555",
    cancelled: "#e55",
    imported: "#444",
  };

  const statusLabel: Record<string, string> = {
    new: "Новый", confirmed: "Подтверждён",
    done: "Выполнен", cancelled: "Отменён", imported: "Импорт"
  };

  if (loading) return (
    <div style={{ background: "#0f0e0c", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#c8a96e", fontFamily: "sans-serif", fontSize: 14 }}>Загрузка...</div>
    </div>
  );

  return (
    <div style={{ background: "#0f0e0c", minHeight: "100vh", color: "#e8e4dd", fontFamily: "'Inter', sans-serif", padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, background: "rgba(200,169,110,0.12)", border: "1px solid #c8a96e", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍰</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e4dd" }}>BerryCake</div>
          <div style={{ fontSize: 12, color: "#7a7570" }}>Аналитика заказов · Алматы</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#7a7570" }}>
          Обновлено: {new Date().toLocaleTimeString("ru")}
        </div>
      </div>

      {/* KPI карточки */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Заказов сегодня", value: todayOrders, unit: "шт" },
          { label: "Тортов сегодня", value: todayCakes, unit: "шт" },
          { label: "Всего заказов", value: totalOrders, unit: "" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "#1a1916", border: "1px solid #2a2825", borderRadius: 12, padding: "14px 12px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#c8a96e" }}>{kpi.value}<span style={{ fontSize: 12, color: "#7a7570", marginLeft: 4 }}>{kpi.unit}</span></div>
            <div style={{ fontSize: 11, color: "#7a7570", marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* График по дням */}
      <div style={{ background: "#1a1916", border: "1px solid #2a2825", borderRadius: 12, padding: "16px 12px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#e8e4dd" }}>Заказы по дням (30 дней)</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={daily} barSize={14}>
            <XAxis dataKey="order_date" tick={{ fill: "#7a7570", fontSize: 10 }} tickFormatter={(v) => v?.slice(5)} />
            <YAxis tick={{ fill: "#7a7570", fontSize: 10 }} width={24} />
            <Tooltip
              contentStyle={{ background: "#1a1916", border: "1px solid #2a2825", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#c8a96e" }}
            />
            <Bar dataKey="cakes" name="Тортов" fill="#c8a96e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Топ вкусов */}
      <div style={{ background: "#1a1916", border: "1px solid #2a2825", borderRadius: 12, padding: "16px 12px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#e8e4dd" }}>Топ вкусов</div>
        {flavors.slice(0, 6).map((f, i) => {
          const max = flavors[0]?.total_cakes || 1;
          const pct = Math.round((f.total_cakes / max) * 100);
          return (
            <div key={f.cake_flavor} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#e8e4dd" }}>{i + 1}. {f.cake_flavor}</span>
                <span style={{ fontSize: 12, color: "#c8a96e", fontWeight: 600 }}>{f.total_cakes} шт</span>
              </div>
              <div style={{ height: 4, background: "#2a2825", borderRadius: 2 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#c8a96e", borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Последние заказы */}
      <div style={{ background: "#1a1916", border: "1px solid #2a2825", borderRadius: 12, padding: "16px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#e8e4dd" }}>Последние заказы</div>
        {recent.map((o) => (
          <div key={o.id} style={{ borderBottom: "1px solid #2a2825", paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e4dd" }}>{o.client_name || "—"}</div>
                <div style={{ fontSize: 11, color: "#7a7570", marginTop: 3 }}>
                  {o.order_date} {o.order_time} · {o.cake_flavor || "—"} · {o.quantity || 1} шт
                </div>
                {o.address && <div style={{ fontSize: 11, color: "#7a7570" }}>{o.address}</div>}
              </div>
              <div style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 10,
                background: "rgba(200,169,110,0.1)",
                color: statusColor[o.status] || "#7a7570",
                border: `1px solid ${statusColor[o.status] || "#2a2825"}`,
                whiteSpace: "nowrap"
              }}>
                {statusLabel[o.status] || o.status}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
