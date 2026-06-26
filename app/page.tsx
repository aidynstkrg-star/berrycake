"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function Dashboard() {
  const [todayStats, setTodayStats] = useState({ orders: 0, cakes: 0 });
  const [totalOrders, setTotalOrders] = useState(0);
  const [dailyStats, setDailyStats] = useState([]);
  const [flavorStats, setFlavorStats] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const [todayRes, dailyRes, flavorRes, ordersRes, totalRes] =
        await Promise.all([
          supabase.from("today_stats").select("*").single(),
          supabase.from("daily_stats").select("*").order("order_date", { ascending: true }),
          supabase.from("flavor_stats").select("*").order("order_count", { ascending: false }),
          supabase
            .from("berrycake_orders")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20),
          supabase.from("berrycake_orders").select("id", { count: "exact", head: true }),
        ]);

      if (todayRes.data) setTodayStats({ orders: todayRes.data.orders_today ?? 0, cakes: todayRes.data.cakes_today ?? 0 });
      if (dailyRes.data) setDailyStats(dailyRes.data.map((r) => ({ ...r, day: r.order_date })));
      if (flavorRes.data) setFlavorStats(flavorRes.data.map((r) => ({ flavor: r.cake_flavor, count: r.order_count })));
      if (ordersRes.data) setRecentOrders(ordersRes.data);
      if (totalRes.count !== null) setTotalOrders(totalRes.count);
    }

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const maxFlavor = flavorStats.length > 0 ? flavorStats[0].count : 1;

  return (
    <div style={{ backgroundColor: "#0f0e0c", minHeight: "100vh", color: "#f5f0e8", fontFamily: "sans-serif", padding: "24px" }}>
      <h1 style={{ color: "#c8a96e", fontSize: "24px", marginBottom: "24px", fontWeight: 700 }}>
        BerryCake Analytics
      </h1>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        <KPICard label="Заказов сегодня" value={todayStats.orders} />
        <KPICard label="Тортов сегодня" value={todayStats.cakes} />
        <KPICard label="Всего заказов" value={totalOrders} />
      </div>

      {/* Bar Chart */}
      <div style={{ backgroundColor: "#1a1815", borderRadius: "12px", padding: "20px", marginBottom: "32px" }}>
        <h2 style={{ color: "#c8a96e", marginBottom: "16px", fontSize: "16px" }}>Заказы по дням</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dailyStats}>
            <XAxis dataKey="day" stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
            <YAxis stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1815", border: "1px solid #c8a96e", borderRadius: "8px" }}
              labelStyle={{ color: "#c8a96e" }}
              itemStyle={{ color: "#f5f0e8" }}
            />
            <Bar dataKey="orders" fill="#c8a96e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Top Flavors */}
        <div style={{ backgroundColor: "#1a1815", borderRadius: "12px", padding: "20px" }}>
          <h2 style={{ color: "#c8a96e", marginBottom: "16px", fontSize: "16px" }}>Топ вкусов</h2>
          {flavorStats.slice(0, 8).map((f) => (
            <div key={f.flavor} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "13px" }}>
                <span>{f.flavor || "Не указан"}</span>
                <span style={{ color: "#c8a96e" }}>{f.count}</span>
              </div>
              <div style={{ backgroundColor: "#2a2825", borderRadius: "4px", height: "6px" }}>
                <div
                  style={{
                    backgroundColor: "#c8a96e",
                    height: "6px",
                    borderRadius: "4px",
                    width: `${(f.count / maxFlavor) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        <div style={{ backgroundColor: "#1a1815", borderRadius: "12px", padding: "20px" }}>
          <h2 style={{ color: "#c8a96e", marginBottom: "16px", fontSize: "16px" }}>Последние заказы</h2>
          <div style={{ overflowY: "auto", maxHeight: "300px" }}>
            {recentOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  borderBottom: "1px solid #2a2825",
                  paddingBottom: "10px",
                  marginBottom: "10px",
                  fontSize: "13px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#c8a96e", fontWeight: 600 }}>{order.client_name || order.customer_name || "—"}</span>
                  <span style={{ color: "#888", fontSize: "11px" }}>
                    {order.order_date || (order.created_at ? new Date(order.created_at).toLocaleDateString("ru-RU") : "")}
                  </span>
                </div>
                <div style={{ color: "#aaa", marginTop: "2px" }}>
                  {order.cake_flavor || order.flavor || ""} {order.quantity ? `· ${order.quantity} шт` : ""} {order.address ? `· ${order.address}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value }) {
  return (
    <div
      style={{
        backgroundColor: "#1a1815",
        borderRadius: "12px",
        padding: "20px",
        borderLeft: "3px solid #c8a96e",
      }}
    >
      <div style={{ color: "#888", fontSize: "13px", marginBottom: "8px" }}>{label}</div>
      <div style={{ color: "#c8a96e", fontSize: "36px", fontWeight: 700 }}>{value}</div>
    </div>
  );
}
