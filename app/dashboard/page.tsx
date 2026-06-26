"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const STATUSES = { new: { label: "Новый", color: "#c8a96e" }, in_progress: { label: "В работе", color: "#64b5f6" }, done: { label: "Готов", color: "#81c784" }, delivered: { label: "Доставлен", color: "#888" } };
const TABS = ["Обзор", "Заказы", "Клиенты", "Аналитика ИИ"];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(0);
  const [todayStats, setTodayStats] = useState({ orders: 0, cakes: 0 });
  const [totalOrders, setTotalOrders] = useState(0);
  const [dailyStats, setDailyStats] = useState([]);
  const [flavorStats, setFlavorStats] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [notification, setNotification] = useState(null);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ client_name: "", phone: "", cake_flavor: "", quantity: "", order_date: "", order_time: "", address: "", notes: "" });
  const [topClients, setTopClients] = useState([]);

  useEffect(() => {
    const auth = localStorage.getItem("bc_auth");
    if (!auth) { router.replace("/login"); return; }
    setUser(JSON.parse(auth));
    fetchAll();

    const channel = supabase.channel("orders_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "berrycake_orders" }, (payload) => {
        const o = payload.new;
        setNotification(`🆕 Новый заказ: ${o.client_name || "—"} | ${o.cake_flavor || ""}`);
        setTimeout(() => setNotification(null), 5000);
        fetchAll();
      })
      .subscribe();

    const interval = setInterval(fetchAll, 60000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const fetchAll = async () => {
    const [todayRes, dailyRes, flavorRes, ordersRes, totalRes] = await Promise.all([
      supabase.from("today_stats").select("*").single(),
      supabase.from("daily_stats").select("*").order("order_date", { ascending: true }),
      supabase.from("flavor_stats").select("*").order("order_count", { ascending: false }),
      supabase.from("berrycake_orders").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("berrycake_orders").select("id", { count: "exact", head: true }),
    ]);
    if (todayRes.data) setTodayStats({ orders: todayRes.data.orders_today ?? 0, cakes: todayRes.data.cakes_today ?? 0 });
    if (dailyRes.data) setDailyStats(dailyRes.data.map((r) => ({ ...r, day: r.order_date?.slice(5) })));
    if (flavorRes.data) setFlavorStats(flavorRes.data.map((r) => ({ flavor: r.cake_flavor, count: r.order_count })));
    if (totalRes.count !== null) setTotalOrders(totalRes.count);
    if (ordersRes.data) {
      setOrders(ordersRes.data);
      buildTopClients(ordersRes.data);
    }
  };

  const buildTopClients = (data) => {
    const map = {};
    data.forEach((o) => {
      const name = o.client_name || o.customer_name;
      if (!name) return;
      if (!map[name]) map[name] = { name, orders: 0, cakes: 0 };
      map[name].orders++;
      map[name].cakes += o.quantity || 1;
    });
    setTopClients(Object.values(map).sort((a, b) => b.cakes - a.cakes).slice(0, 10));
  };

  useEffect(() => {
    let res = [...orders];
    if (search) res = res.filter((o) => JSON.stringify(o).toLowerCase().includes(search.toLowerCase()));
    if (filterStatus !== "all") res = res.filter((o) => (o.status || "new") === filterStatus);
    if (filterDate) res = res.filter((o) => o.order_date === filterDate || o.created_at?.startsWith(filterDate));
    res.sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    setFiltered(res);
  }, [orders, search, filterStatus, filterDate, sortField, sortDir]);

  const updateStatus = async (id, status) => {
    await fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
  };

  const exportCSV = () => {
    const cols = ["client_name", "phone", "cake_flavor", "quantity", "order_date", "order_time", "address", "status", "notes"];
    const header = ["Клиент", "Телефон", "Вкус", "Кол-во", "Дата", "Время", "Адрес", "Статус", "Заметки"].join(";");
    const rows = filtered.map((o) => cols.map((c) => `"${(o[c] ?? "").toString().replace(/"/g, '""')}"`).join(";"));
    const blob = new Blob(["﻿" + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `berrycake_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const runAI = async () => {
    setAiLoading(true); setAiResult("");
    try {
      const res = await fetch("/api/ai-analytics", { method: "POST" });
      const data = await res.json();
      setAiResult(data.analysis || data.error || "Ошибка");
    } finally { setAiLoading(false); }
  };

  const addOrder = async () => {
    await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addForm) });
    setShowAddModal(false);
    setAddForm({ client_name: "", phone: "", cake_flavor: "", quantity: "", order_date: "", order_time: "", address: "", notes: "" });
    fetchAll();
  };

  const sortBy = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  if (!user) return null;

  const s = { bg: "#0f0e0c", card: "#1a1815", gold: "#c8a96e", text: "#f5f0e8", muted: "#888", border: "#2a2825" };

  return (
    <div style={{ backgroundColor: s.bg, minHeight: "100vh", color: s.text, fontFamily: "sans-serif" }}>
      {/* Notification */}
      {notification && (
        <div style={{ position: "fixed", top: 16, right: 16, backgroundColor: "#1a1815", border: `1px solid ${s.gold}`, borderRadius: 10, padding: "12px 20px", zIndex: 1000, color: s.text, fontSize: 14 }}>
          {notification}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${s.border}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>🍰</span>
          <span style={{ color: s.gold, fontWeight: 700, fontSize: 18 }}>BerryCake Analytics</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: s.muted, fontSize: 13 }}>{user.name}</span>
          <button onClick={() => { localStorage.removeItem("bc_auth"); router.replace("/login"); }}
            style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
            Выйти
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "16px 24px 0", borderBottom: `1px solid ${s.border}` }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            background: "none", border: "none", color: tab === i ? s.gold : s.muted, fontWeight: tab === i ? 700 : 400,
            fontSize: 14, padding: "8px 16px", cursor: "pointer", borderBottom: tab === i ? `2px solid ${s.gold}` : "2px solid transparent",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        {/* ── TAB 0: Обзор ── */}
        {tab === 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
              {[["Заказов сегодня", todayStats.orders], ["Тортов сегодня", todayStats.cakes], ["Всего заказов", totalOrders]].map(([label, val]) => (
                <div key={label} style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, borderLeft: `3px solid ${s.gold}` }}>
                  <div style={{ color: s.muted, fontSize: 13, marginBottom: 8 }}>{label}</div>
                  <div style={{ color: s.gold, fontSize: 36, fontWeight: 700 }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, marginBottom: 32 }}>
              <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Заказы по дням</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyStats}>
                  <XAxis dataKey="day" stroke={s.muted} tick={{ fill: s.muted, fontSize: 11 }} />
                  <YAxis stroke={s.muted} tick={{ fill: s.muted, fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 8 }} labelStyle={{ color: s.gold }} itemStyle={{ color: s.text }} />
                  <Bar dataKey="orders" fill={s.gold} radius={[4,4,0,0]} name="Заказы" />
                  <Bar dataKey="cakes" fill="#64b5f6" radius={[4,4,0,0]} name="Торты" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
                <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Топ вкусов</h2>
                {flavorStats.slice(0, 8).map((f) => (
                  <div key={f.flavor} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: s.text }}>{f.flavor || "Не указан"}</span>
                      <span style={{ color: s.gold }}>{f.count}</span>
                    </div>
                    <div style={{ backgroundColor: s.border, borderRadius: 4, height: 6 }}>
                      <div style={{ backgroundColor: s.gold, height: 6, borderRadius: 4, width: `${(f.count / (flavorStats[0]?.count || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
                <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Последние заказы</h2>
                <div style={{ overflowY: "auto", maxHeight: 280 }}>
                  {orders.slice(0, 10).map((o) => (
                    <div key={o.id} style={{ borderBottom: `1px solid ${s.border}`, paddingBottom: 10, marginBottom: 10, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: s.gold, fontWeight: 600 }}>{o.client_name || o.customer_name || "—"}</span>
                        <span style={{ fontSize: 11, color: s.muted }}>{o.order_date || o.created_at?.slice(0,10)}</span>
                      </div>
                      <div style={{ color: "#aaa", marginTop: 2 }}>
                        {o.cake_flavor || o.flavor || ""}{o.quantity ? ` · ${o.quantity} шт` : ""}
                        <span style={{ marginLeft: 8, padding: "1px 8px", borderRadius: 10, fontSize: 11, backgroundColor: `${(STATUSES[o.status || "new"] || STATUSES.new).color}22`, color: (STATUSES[o.status || "new"] || STATUSES.new).color }}>
                          {(STATUSES[o.status || "new"] || STATUSES.new).label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── TAB 1: Заказы ── */}
        {tab === 1 && (
          <>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <input placeholder="🔍 Поиск..." value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 180, backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 14px", color: s.text, fontSize: 13, outline: "none" }} />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                style={{ backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 14px", color: s.text, fontSize: 13, cursor: "pointer" }}>
                <option value="all">Все статусы</option>
                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                style={{ backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 14px", color: s.text, fontSize: 13, outline: "none" }} />
              <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterDate(""); }}
                style={{ backgroundColor: s.border, border: "none", borderRadius: 8, padding: "8px 14px", color: s.muted, cursor: "pointer", fontSize: 13 }}>
                Сброс
              </button>
              <button onClick={exportCSV}
                style={{ backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 8, padding: "8px 14px", color: s.gold, cursor: "pointer", fontSize: 13 }}>
                ↓ Excel
              </button>
              <button onClick={() => setShowAddModal(true)}
                style={{ backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "8px 16px", color: "#0f0e0c", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                + Заказ
              </button>
            </div>

            <div style={{ color: s.muted, fontSize: 13, marginBottom: 12 }}>Найдено: {filtered.length}</div>

            {/* Table */}
            <div style={{ backgroundColor: s.card, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                      {[["client_name","Клиент"],["cake_flavor","Вкус"],["quantity","Кол-во"],["order_date","Дата"],["order_time","Время"],["address","Адрес"],["phone","Телефон"],["status","Статус"]].map(([f,l]) => (
                        <th key={f} onClick={() => sortBy(f)} style={{ padding: "12px 14px", textAlign: "left", color: s.muted, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
                          {l}{sortField === f ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 200).map((o) => (
                      <tr key={o.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                        <td style={{ padding: "10px 14px", color: s.gold, fontWeight: 600 }}>{o.client_name || o.customer_name || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{o.cake_flavor || o.flavor || "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>{o.quantity ?? "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{o.order_date || o.created_at?.slice(0,10) || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{o.order_time || "—"}</td>
                        <td style={{ padding: "10px 14px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.address || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{o.phone || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <select value={o.status || "new"} onChange={(e) => updateStatus(o.id, e.target.value)}
                            style={{ backgroundColor: `${(STATUSES[o.status || "new"] || STATUSES.new).color}22`, border: `1px solid ${(STATUSES[o.status || "new"] || STATUSES.new).color}`, borderRadius: 6, padding: "3px 8px", color: (STATUSES[o.status || "new"] || STATUSES.new).color, fontSize: 12, cursor: "pointer" }}>
                            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── TAB 2: Клиенты ── */}
        {tab === 2 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
              <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
                <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Топ клиентов по тортам</h2>
                {topClients.map((c, i) => (
                  <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: s.muted, fontSize: 12, width: 20 }}>#{i + 1}</span>
                      <span style={{ fontSize: 13 }}>{c.name}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: s.gold, fontWeight: 700 }}>{c.cakes} <span style={{ color: s.muted, fontWeight: 400, fontSize: 11 }}>тортов</span></div>
                      <div style={{ color: s.muted, fontSize: 11 }}>{c.orders} заказов</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
                <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Торты по клиентам (топ 8)</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topClients.slice(0,8)} layout="vertical">
                    <XAxis type="number" stroke={s.muted} tick={{ fill: s.muted, fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" stroke={s.muted} tick={{ fill: s.muted, fontSize: 10 }} width={120} />
                    <Tooltip contentStyle={{ backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 8 }} itemStyle={{ color: s.text }} />
                    <Bar dataKey="cakes" fill={s.gold} radius={[0,4,4,0]} name="Тортов" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
              <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Все клиенты</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                    {["#","Клиент","Заказов","Тортов"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: s.muted, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((c, i) => (
                    <tr key={c.name} style={{ borderBottom: `1px solid ${s.border}` }}>
                      <td style={{ padding: "10px 14px", color: s.muted }}>{i + 1}</td>
                      <td style={{ padding: "10px 14px", color: s.gold, fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: "10px 14px" }}>{c.orders}</td>
                      <td style={{ padding: "10px 14px", color: s.gold, fontWeight: 700 }}>{c.cakes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── TAB 3: Аналитика ИИ ── */}
        {tab === 3 && (
          <div style={{ maxWidth: 720 }}>
            <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 8 }}>ИИ-аналитик BerryCake</h2>
              <p style={{ color: s.muted, fontSize: 13, marginBottom: 20 }}>Claude проанализирует последние 200 заказов и даст рекомендации по вкусам, клиентам и трендам.</p>
              <button onClick={runAI} disabled={aiLoading}
                style={{ backgroundColor: aiLoading ? s.border : s.gold, border: "none", borderRadius: 8, padding: "10px 24px", color: aiLoading ? s.muted : "#0f0e0c", fontWeight: 700, fontSize: 14, cursor: aiLoading ? "default" : "pointer" }}>
                {aiLoading ? "⏳ Анализирую..." : "✨ Запустить анализ"}
              </button>
            </div>

            {aiResult && (
              <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 24 }}>
                <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 16 }}>Результат анализа</h3>
                <div style={{ color: s.text, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aiResult}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Order Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 28, width: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ color: s.gold, fontSize: 16, marginBottom: 20 }}>Новый заказ</h2>
            {[
              ["client_name","Клиент / магазин"],["phone","Телефон"],["cake_flavor","Вкус"],
              ["quantity","Количество (шт)"],["order_date","Дата (ГГГГ-ММ-ДД)"],["order_time","Время (ЧЧ:ММ)"],
              ["address","Адрес"],["notes","Заметки"],
            ].map(([field, label]) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>{label}</label>
                <input value={addForm[field]} onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))}
                  style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={addOrder}
                style={{ flex: 1, backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "10px", color: "#0f0e0c", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Добавить
              </button>
              <button onClick={() => setShowAddModal(false)}
                style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 8, padding: "10px", color: s.muted, cursor: "pointer", fontSize: 14 }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
