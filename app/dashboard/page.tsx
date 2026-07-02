"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const STATUSES: Record<string, { label: string; color: string }> = { new: { label: "Новый", color: "#c8a96e" }, in_progress: { label: "В работе", color: "#64b5f6" }, done: { label: "Готов", color: "#81c784" }, delivered: { label: "Доставлен", color: "#888" }, cancellation_requested: { label: "Запрос отмены", color: "#ff9800" }, cancelled: { label: "Отменён", color: "#e57373" } };
const CANCEL_APPROVERS = ["Дархан", "Айдын"];
const TABS = ["Обзор", "Заказы", "Клиенты", "Расходы", "Аналитика ИИ", "Настройки"];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(0);
  const [todayStats, setTodayStats] = useState({ orders: 0, cakes: 0 });
  const [totalOrders, setTotalOrders] = useState(0);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [flavorStats, setFlavorStats] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [orders, setOrders] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [notification, setNotification] = useState(null);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ client_name: "", phone: "", cake_flavor: "", quantity: "", order_date: new Date().toISOString().slice(0,10), order_time: "", address: "", notes: "", total_amount: "", payment_type: "" });
  const [addClientQuery, setAddClientQuery] = useState("");
  const [addClientSuggestions, setAddClientSuggestions] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseSyncing, setExpenseSyncing] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState("all");
  const [expenseMonth, setExpenseMonth] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [clientForm, setClientForm] = useState({ name: "", phone: "", price_per_unit: "", client_type: "розница", notes: "" });
  const [users, setUsers] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ name: "", role: "", pin: "" });
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [orderEditForm, setOrderEditForm] = useState<any>({});

  const fetchClients = async () => {
    const { data } = await supabase.from("berrycake_clients").select("*").order("name");
    if (data) setClients(data);
  };

  const saveClient = async () => {
    const payload = {
      name: clientForm.name,
      phone: clientForm.phone || null,
      price_per_unit: clientForm.price_per_unit ? parseFloat(clientForm.price_per_unit) : null,
      client_type: clientForm.client_type,
      notes: clientForm.notes || null,
    };
    if (editingClient) {
      await supabase.from("berrycake_clients").update(payload).eq("id", editingClient.id);
    } else {
      await supabase.from("berrycake_clients").insert(payload);
    }
    setShowClientModal(false);
    setEditingClient(null);
    setClientForm({ name: "", phone: "", price_per_unit: "", client_type: "розница", notes: "" });
    fetchClients();
  };

  const deleteClient = async (id: string) => {
    await supabase.from("berrycake_clients").delete().eq("id", id);
    fetchClients();
  };

  const openEditClient = (c: any) => {
    setEditingClient(c);
    setClientForm({ name: c.name, phone: c.phone || "", price_per_unit: c.price_per_unit?.toString() || "", client_type: c.client_type || "розница", notes: c.notes || "" });
    setShowClientModal(true);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("berrycake_users").select("id,name,role,pin").order("id");
    if (data) setUsers(data);
  };

  const saveUser = async () => {
    const payload = { name: userForm.name, role: userForm.role, pin: userForm.pin };
    if (editingUser) {
      await supabase.from("berrycake_users").update(payload).eq("id", editingUser.id);
    } else {
      await supabase.from("berrycake_users").insert(payload);
    }
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm({ name: "", role: "", pin: "" });
    fetchUsers();
  };

  const deleteUser = async (id: number) => {
    await supabase.from("berrycake_users").delete().eq("id", id);
    fetchUsers();
  };

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from("berrycake_expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .limit(300);
    if (data) setExpenses(data);
  };

  const syncExpenses = async () => {
    setExpenseSyncing(true);
    try {
      const res = await fetch("/api/sync-expenses", { method: "POST" });
      const data = await res.json();
      if (data.inserted > 0) fetchExpenses();
    } finally {
      setExpenseSyncing(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      const added = data.inserted ?? 0;
      setLastSync(`Синхронизировано: +${added} новых`);
      if (added > 0) fetchAll();
    } catch {
      setLastSync("Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const auth = localStorage.getItem("bc_auth");
    if (!auth) { router.replace("/login"); return; }
    setUser(JSON.parse(auth));
    fetchAll();
    fetchExpenses();
    fetchClients();
    fetchUsers();

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
    const { data: allOrders } = await supabase
      .from("berrycake_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!allOrders) return;
    setOrders(allOrders);
    setTotalOrders(allOrders.length);
    buildTopClients(allOrders);

    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = allOrders.filter((o) => (o.order_date || o.created_at?.slice(0, 10)) === today);
    setTodayStats({
      orders: todayOrders.length,
      cakes: todayOrders.reduce((s, o) => s + (o.quantity || 1), 0),
    });

    // Daily stats from raw data (last 30 days)
    const dailyMap: Record<string, { order_date: string; orders: number; cakes: number }> = {};
    allOrders.forEach((o) => {
      const d = o.order_date || o.created_at?.slice(0, 10);
      if (!d) return;
      if (!dailyMap[d]) dailyMap[d] = { order_date: d, orders: 0, cakes: 0 };
      dailyMap[d].orders++;
      dailyMap[d].cakes += o.quantity || 1;
    });
    const daily = Object.values(dailyMap).sort((a, b) => a.order_date.localeCompare(b.order_date));
    setDailyStats(daily.map((r) => ({ ...r, day: r.order_date.slice(5) })));

    // Flavor stats from raw data
    const flavorMap: Record<string, number> = {};
    allOrders.forEach((o) => {
      const f = (o.cake_flavor || "").trim();
      if (!f) return;
      flavorMap[f] = (flavorMap[f] || 0) + (o.quantity || 1);
    });
    setFlavorStats(Object.entries(flavorMap).map(([flavor, count]) => ({ flavor, count })).sort((a, b) => b.count - a.count));
  };

  useEffect(() => {
    if (!addClientQuery.trim()) { setAddClientSuggestions([]); return; }
    const q = addClientQuery.toLowerCase();
    setAddClientSuggestions(clients.filter((c) => c.name.toLowerCase().includes(q) || (c.phone||"").includes(q)).slice(0, 6));
  }, [addClientQuery, clients]);

  const buildTopClients = (data) => {
    const map = {};
    data.forEach((o) => {
      const name = o.client_name || o.customer_name;
      if (!name) return;
      if (!map[name]) map[name] = { name, orders: 0, cakes: 0 };
      map[name].orders++;
      map[name].cakes += o.quantity || 1;
    });
    setTopClients((Object.values(map) as { name: string; orders: number; cakes: number }[]).sort((a, b) => b.cakes - a.cakes).slice(0, 10));
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

  const openEditOrder = (o: any) => {
    setEditingOrder(o);
    setOrderEditForm({
      client_name: o.client_name || "",
      phone: o.phone || "",
      cake_flavor: o.cake_flavor || "",
      quantity: o.quantity ?? "",
      order_date: o.order_date || "",
      order_time: o.order_time || "",
      address: o.address || "",
      notes: o.notes || "",
      status: o.status || "new",
      payment_type: o.payment_type || "",
      paid_amount: o.paid_amount ?? "",
      total_amount: o.total_amount ?? "",
    });
  };

  const saveOrderEdit = async () => {
    const payload = {
      ...orderEditForm,
      quantity: orderEditForm.quantity !== "" ? Number(orderEditForm.quantity) : null,
      paid_amount: orderEditForm.paid_amount !== "" ? Number(orderEditForm.paid_amount) : null,
      total_amount: orderEditForm.total_amount !== "" ? Number(orderEditForm.total_amount) : null,
    };
    await supabase.from("berrycake_orders").update(payload).eq("id", editingOrder.id);
    setOrders((prev) => prev.map((o) => o.id === editingOrder.id ? { ...o, ...payload } : o));
    setEditingOrder(null);
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Удалить заказ?")) return;
    await supabase.from("berrycake_orders").delete().eq("id", id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
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
    const payload = {
      ...addForm,
      quantity: addForm.quantity ? Number(addForm.quantity) : null,
      total_amount: addForm.total_amount ? Number(addForm.total_amount) : null,
      status: "new",
    };
    await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setShowAddModal(false);
    setAddForm({ client_name: "", phone: "", cake_flavor: "", quantity: "", order_date: new Date().toISOString().slice(0,10), order_time: "", address: "", notes: "", total_amount: "", payment_type: "" });
    setAddClientQuery("");
    fetchAll();
  };

  const approveCancellation = async (order: any) => {
    await supabase.from("berrycake_orders").update({ status: "cancelled" }).eq("id", order.id);
    fetchAll();
  };

  const rejectCancellation = async (order: any) => {
    await supabase.from("berrycake_orders").update({ status: order.previous_status || "new", cancellation_reason: null }).eq("id", order.id);
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
          {lastSync && <span style={{ color: s.muted, fontSize: 12 }}>{lastSync}</span>}
          <button onClick={syncNow} disabled={syncing}
            style={{ background: syncing ? "#2a2825" : s.gold, border: "none", color: syncing ? s.muted : "#0f0e0c", padding: "6px 14px", borderRadius: 8, cursor: syncing ? "default" : "pointer", fontSize: 13, fontWeight: 600 }}>
            {syncing ? "Синхронизация..." : "Обновить"}
          </button>
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
        {tab === 0 && (() => {
          const prevMonth = () => {
            const [y, m] = selectedMonth.split("-").map(Number);
            const d = new Date(y, m - 2, 1);
            setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          };
          const nextMonth = () => {
            const [y, m] = selectedMonth.split("-").map(Number);
            const d = new Date(y, m, 1);
            setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          };
          const monthLabel = new Date(selectedMonth + "-01").toLocaleString("ru-RU", { month: "long", year: "numeric" });
          const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);

          const mOrders = orders.filter((o) => {
            const d = o.order_date || o.created_at?.slice(0, 10);
            return d?.startsWith(selectedMonth);
          });
          const mCakes = mOrders.reduce((s, o) => s + (o.quantity || 1), 0);

          const mDailyMap: Record<string, { day: string; orders: number; cakes: number }> = {};
          mOrders.forEach((o) => {
            const d = (o.order_date || o.created_at?.slice(0, 10)) || "";
            const day = d.slice(5);
            if (!mDailyMap[d]) mDailyMap[d] = { day, orders: 0, cakes: 0 };
            mDailyMap[d].orders++;
            mDailyMap[d].cakes += o.quantity || 1;
          });
          const mDaily = Object.values(mDailyMap).sort((a, b) => a.day.localeCompare(b.day));

          const mFlavorMap: Record<string, number> = {};
          mOrders.forEach((o) => {
            const f = (o.cake_flavor || "").trim();
            if (!f) return;
            mFlavorMap[f] = (mFlavorMap[f] || 0) + (o.quantity || 1);
          });
          const mFlavors = Object.entries(mFlavorMap).map(([flavor, count]) => ({ flavor, count })).sort((a, b) => b.count - a.count);

          return (
            <>
              {/* Month navigation */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 28 }}>
                <button onClick={prevMonth}
                  style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>
                  ‹
                </button>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: s.gold, fontWeight: 700, fontSize: 20, textTransform: "capitalize" }}>{monthLabel}</div>
                  {isCurrentMonth && <div style={{ color: s.muted, fontSize: 11, marginTop: 2 }}>текущий месяц</div>}
                </div>
                <button onClick={nextMonth} disabled={isCurrentMonth}
                  style={{ background: "none", border: `1px solid ${isCurrentMonth ? s.bg : s.border}`, color: isCurrentMonth ? s.bg : s.muted, borderRadius: 8, padding: "6px 16px", cursor: isCurrentMonth ? "default" : "pointer", fontSize: 20, lineHeight: 1 }}>
                  ›
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
                {[
                  ["Заказов за месяц", mOrders.length],
                  ["Тортов за месяц", mCakes],
                  ["Заказов сегодня", todayStats.orders],
                  ["Тортов сегодня", todayStats.cakes],
                ].map(([label, val]) => (
                  <div key={label} style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, borderLeft: `3px solid ${s.gold}` }}>
                    <div style={{ color: s.muted, fontSize: 12, marginBottom: 8 }}>{label}</div>
                    <div style={{ color: s.gold, fontSize: 32, fontWeight: 700 }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, marginBottom: 32 }}>
                <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Заказы по дням — {monthLabel}</h2>
                {mDaily.length === 0
                  ? <div style={{ color: s.muted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Нет заказов в этом месяце</div>
                  : <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={mDaily}>
                        <XAxis dataKey="day" stroke={s.muted} tick={{ fill: s.muted, fontSize: 11 }} />
                        <YAxis stroke={s.muted} tick={{ fill: s.muted, fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 8 }} labelStyle={{ color: s.gold }} itemStyle={{ color: s.text }} />
                        <Bar dataKey="orders" fill={s.gold} radius={[4,4,0,0]} name="Заказы" />
                        <Bar dataKey="cakes" fill="#64b5f6" radius={[4,4,0,0]} name="Торты" />
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
                  <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Топ вкусов — {monthLabel}</h2>
                  {mFlavors.length === 0
                    ? <div style={{ color: s.muted, fontSize: 13 }}>Нет данных</div>
                    : mFlavors.slice(0, 8).map((f) => (
                        <div key={f.flavor} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                            <span style={{ color: s.text }}>{f.flavor}</span>
                            <span style={{ color: s.gold }}>{f.count} шт</span>
                          </div>
                          <div style={{ backgroundColor: s.border, borderRadius: 4, height: 6 }}>
                            <div style={{ backgroundColor: s.gold, height: 6, borderRadius: 4, width: `${(f.count / (mFlavors[0]?.count || 1)) * 100}%` }} />
                          </div>
                        </div>
                      ))
                  }
                </div>

                <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
                  <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 16 }}>Заказы месяца</h2>
                  <div style={{ overflowY: "auto", maxHeight: 280 }}>
                    {mOrders.length === 0
                      ? <div style={{ color: s.muted, fontSize: 13 }}>Нет заказов</div>
                      : mOrders.slice(0, 15).map((o) => (
                          <div key={o.id} style={{ borderBottom: `1px solid ${s.border}`, paddingBottom: 10, marginBottom: 10, fontSize: 13 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: s.gold, fontWeight: 600 }}>{o.client_name || o.customer_name || "—"}</span>
                              <span style={{ fontSize: 11, color: s.muted }}>{o.order_date || o.created_at?.slice(0,10)}</span>
                            </div>
                            <div style={{ color: "#aaa", marginTop: 2 }}>
                              {o.cake_flavor || ""}{o.quantity ? ` · ${o.quantity} шт` : ""}
                              <span style={{ marginLeft: 8, padding: "1px 8px", borderRadius: 10, fontSize: 11, backgroundColor: `${(STATUSES[o.status || "new"] || STATUSES.new).color}22`, color: (STATUSES[o.status || "new"] || STATUSES.new).color }}>
                                {(STATUSES[o.status || "new"] || STATUSES.new).label}
                              </span>
                            </div>
                          </div>
                        ))
                    }
                  </div>
                </div>
              </div>
            </>
          );
        })()}

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
                      <th style={{ padding: "12px 14px", color: s.muted, fontWeight: 600 }}></th>
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
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <button onClick={() => openEditOrder(o)}
                            style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12, marginRight: 6 }}>
                            ✏️
                          </button>
                          <button onClick={() => deleteOrder(o.id)}
                            style={{ background: "none", border: "1px solid #e5737344", color: "#e57373", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>
                            ✕
                          </button>
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
        {tab === 2 && (() => {
          const totalDebt = clients.reduce((sum, c) => {
            const orders = filtered.filter((o) => o.client_name === c.name || o.phone === c.phone);
            const debt = orders.reduce((s, o) => s + ((o.total_amount || 0) - (o.paid_amount || 0)), 0);
            return sum + debt;
          }, 0);
          return (
          <>
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Клиентов", val: clients.length },
                { label: "Консигнация", val: clients.filter((c) => c.client_type === "консигнация").length },
                { label: "Общий долг", val: totalDebt > 0 ? `${totalDebt.toLocaleString()} ₸` : "0 ₸" },
              ].map((st) => (
                <div key={st.label} style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
                  <div style={{ color: s.muted, fontSize: 12, marginBottom: 6 }}>{st.label}</div>
                  <div style={{ color: s.gold, fontSize: 22, fontWeight: 700 }}>{st.val}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ color: s.gold, fontSize: 15, margin: 0 }}>Клиенты и ставки</h2>
                <button onClick={() => { setEditingClient(null); setClientForm({ name: "", phone: "", price_per_unit: "", client_type: "розница", notes: "" }); setShowClientModal(true); }}
                  style={{ background: s.gold, border: "none", color: "#0f0e0c", padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  + Добавить клиента
                </button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                    {["Клиент","Телефон","Тип","Ставка (₸/шт)","Долг","Заметки",""].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: s.muted, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: s.muted }}>Нет клиентов. Добавьте первого.</td></tr>
                  )}
                  {clients.map((c) => {
                    const clientOrders = orders.filter((o) => o.client_name === c.name || (c.phone && o.phone === c.phone));
                    const debt = clientOrders.reduce((s, o) => s + ((o.total_amount || 0) - (o.paid_amount || 0)), 0);
                    return (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                        <td style={{ padding: "10px 14px", color: s.gold, fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: "10px 14px", color: s.muted }}>{c.phone || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: c.client_type === "консигнация" ? "#7c3aed22" : c.client_type === "опт" ? "#c8a96e22" : "#1a1815", color: c.client_type === "консигнация" ? "#a78bfa" : c.client_type === "опт" ? s.gold : s.muted, padding: "2px 8px", borderRadius: 6, fontSize: 11 }}>
                            {c.client_type}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: s.gold, fontWeight: 700 }}>
                          {c.price_per_unit ? `${Number(c.price_per_unit).toLocaleString()} ₸` : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", color: debt > 0 ? "#f87171" : s.muted, fontWeight: debt > 0 ? 700 : 400 }}>
                          {debt > 0 ? `${debt.toLocaleString()} ₸` : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", color: s.muted, fontSize: 12 }}>{c.notes || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => openEditClient(c)} style={{ background: "none", border: `1px solid ${s.border}`, color: s.text, padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✏️</button>
                            <button onClick={() => { if (confirm("Удалить клиента?")) deleteClient(c.id); }} style={{ background: "none", border: `1px solid ${s.border}`, color: "#f87171", padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Client modal */}
            {showClientModal && (
              <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                <div style={{ background: s.card, borderRadius: 16, padding: 28, width: 420, border: `1px solid ${s.border}` }}>
                  <h3 style={{ color: s.gold, marginBottom: 20 }}>{editingClient ? "Редактировать клиента" : "Добавить клиента"}</h3>
                  {[
                    { label: "Имя / название *", key: "name", type: "text" },
                    { label: "Телефон", key: "phone", type: "text" },
                    { label: "Ставка за 1 шт (₸)", key: "price_per_unit", type: "number" },
                    { label: "Заметки", key: "notes", type: "text" },
                  ].map(({ label, key, type }) => (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <div style={{ color: s.muted, fontSize: 12, marginBottom: 4 }}>{label}</div>
                      <input type={type} value={clientForm[key]} onChange={(e) => setClientForm((f) => ({ ...f, [key]: e.target.value }))}
                        style={{ width: "100%", background: s.bg, border: `1px solid ${s.border}`, color: s.text, padding: "8px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ color: s.muted, fontSize: 12, marginBottom: 4 }}>Тип клиента</div>
                    <select value={clientForm.client_type} onChange={(e) => setClientForm((f) => ({ ...f, client_type: e.target.value }))}
                      style={{ width: "100%", background: s.bg, border: `1px solid ${s.border}`, color: s.text, padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
                      <option>розница</option>
                      <option>опт</option>
                      <option>консигнация</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setShowClientModal(false)} style={{ flex: 1, background: "none", border: `1px solid ${s.border}`, color: s.text, padding: "9px 0", borderRadius: 8, cursor: "pointer" }}>Отмена</button>
                    <button onClick={saveClient} disabled={!clientForm.name}
                      style={{ flex: 2, background: clientForm.name ? s.gold : s.border, color: clientForm.name ? "#0f0e0c" : s.muted, border: "none", padding: "9px 0", borderRadius: 8, cursor: clientForm.name ? "pointer" : "default", fontWeight: 700 }}>
                      {editingClient ? "Сохранить" : "Добавить"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
          );
        })()}

        {/* ── TAB 3: Расходы ── */}
        {tab === 3 && (() => {
          const EXPENSE_CATS = ["all","аренда","ингредиенты","упаковка","зарплата","доставка","реклама","оборудование","обед","налоги","прочее"];
          const filtered = expenses.filter((e) => {
            if (expenseFilter !== "all" && e.category !== expenseFilter) return false;
            if (expenseMonth && !e.expense_date?.startsWith(expenseMonth)) return false;
            return true;
          });
          const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);
          const byCategory = EXPENSE_CATS.slice(1).map((cat) => ({
            cat, sum: expenses.filter((e) => e.category === cat).reduce((s,e) => s + (e.amount||0), 0)
          })).filter((c) => c.sum > 0).sort((a,b) => b.sum - a.sum);

          return (
            <div>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ color: s.gold, fontSize: 16, margin: 0 }}>Расходы</h2>
                <button onClick={syncExpenses} disabled={expenseSyncing}
                  style={{ background: expenseSyncing ? s.border : s.gold, border: "none", color: expenseSyncing ? s.muted : "#0f0e0c", padding: "7px 18px", borderRadius: 8, cursor: expenseSyncing ? "default" : "pointer", fontSize: 13, fontWeight: 600 }}>
                  {expenseSyncing ? "Синхронизация..." : "Обновить расходы"}
                </button>
              </div>

              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
                <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
                  <div style={{ color: s.muted, fontSize: 12 }}>Итого (фильтр)</div>
                  <div style={{ color: s.gold, fontSize: 26, fontWeight: 700 }}>{total.toLocaleString("ru-RU")} ₸</div>
                </div>
                <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
                  <div style={{ color: s.muted, fontSize: 12 }}>Записей</div>
                  <div style={{ color: s.text, fontSize: 26, fontWeight: 700 }}>{filtered.length}</div>
                </div>
                <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
                  <div style={{ color: s.muted, fontSize: 12 }}>С чеком/накладной</div>
                  <div style={{ color: "#81c784", fontSize: 26, fontWeight: 700 }}>{filtered.filter((e) => e.has_receipt).length}</div>
                </div>
              </div>

              {/* Category breakdown */}
              {byCategory.length > 0 && (
                <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, marginBottom: 24 }}>
                  <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 16 }}>По категориям</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byCategory} layout="vertical">
                      <XAxis type="number" stroke={s.muted} tick={{ fill: s.muted, fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}к`} />
                      <YAxis type="category" dataKey="cat" stroke={s.muted} tick={{ fill: s.muted, fontSize: 11 }} width={90} />
                      <Tooltip contentStyle={{ backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 8 }} formatter={(v: any) => [`${v.toLocaleString("ru-RU")} ₸`, "Сумма"]} />
                      <Bar dataKey="sum" fill="#e57373" radius={[0,4,4,0]} name="Сумма" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Filters */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <select value={expenseFilter} onChange={(e) => setExpenseFilter(e.target.value)}
                  style={{ backgroundColor: s.card, border: `1px solid ${s.border}`, color: s.text, padding: "7px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                  {EXPENSE_CATS.map((c) => <option key={c} value={c}>{c === "all" ? "Все категории" : c}</option>)}
                </select>
                <input type="month" value={expenseMonth} onChange={(e) => setExpenseMonth(e.target.value)}
                  style={{ backgroundColor: s.card, border: `1px solid ${s.border}`, color: s.text, padding: "7px 12px", borderRadius: 8, fontSize: 13 }} />
                {(expenseFilter !== "all" || expenseMonth) && (
                  <button onClick={() => { setExpenseFilter("all"); setExpenseMonth(""); }}
                    style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, padding: "7px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                    Сбросить
                  </button>
                )}
              </div>

              {/* Table */}
              <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                      {["Дата","Категория","Описание","Сумма","Чек","Кто"].map((h) => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: s.muted, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: s.muted }}>Нет данных. Создайте WhatsApp чат для расходов и настройте EXPENSES_CHAT_ID.</td></tr>
                    )}
                    {filtered.map((e) => (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                        <td style={{ padding: "10px 14px", color: s.muted }}>{e.expense_date || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: "#2a2825", borderRadius: 6, padding: "3px 8px", fontSize: 11 }}>{e.category || "прочее"}</span>
                        </td>
                        <td style={{ padding: "10px 14px", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description || e.raw_message?.slice(0,80)}</td>
                        <td style={{ padding: "10px 14px", color: "#e57373", fontWeight: 700 }}>{e.amount ? `${e.amount.toLocaleString("ru-RU")} ₸` : "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>{e.has_receipt ? "✅" : "—"}</td>
                        <td style={{ padding: "10px 14px", color: s.muted, fontSize: 12 }}>{e.confirmed_by || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* WhatsApp template */}
              <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 20, marginTop: 24, borderLeft: `3px solid ${s.gold}` }}>
                <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 12 }}>Шаблон для WhatsApp чата расходов</h3>
                <pre style={{ backgroundColor: s.bg, borderRadius: 8, padding: 16, fontSize: 12, color: s.text, lineHeight: 1.8, margin: 0, overflowX: "auto" }}>
{`— Одна статья:
💸 РАСХОД
Категория: ингредиенты
Сумма: 15000 тг
Описание: мука, масло
Дата: 01.07.2026
📎 [фото чека]

— Накладная с позициями:
💸 РАСХОД
Категория: ингредиенты
Дата: 01.07.2026
мука 25кг — 9 000
кремчиз 1,5кг — 2 880
масло 82% 1кг — 1 200
Итого: 13 080
📎 [фото накладной]`}
                </pre>
                <p style={{ color: s.muted, fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                  Отправляйте в чат расходов. Система автоматически распознает сумму, категорию и наличие чека.
                </p>
              </div>
            </div>
          );
        })()}

        {/* ── Cancellation requests banner (visible on all tabs for approvers) ── */}
        {CANCEL_APPROVERS.includes(user?.name) && (() => {
          const pending = orders.filter((o) => o.status === "cancellation_requested");
          if (!pending.length) return null;
          return (
            <div style={{ backgroundColor:"#1a1200", border:"1px solid #ff980066", borderRadius:12, padding:16, marginBottom:24 }}>
              <div style={{ color:"#ff9800", fontWeight:700, fontSize:14, marginBottom:12 }}>⚠️ Запросы на отмену заказов ({pending.length})</div>
              {pending.map((o)=>(
                <div key={o.id} style={{ backgroundColor:"#0f0e0c", borderRadius:10, padding:"12px 14px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div>
                    <div style={{ color:s.text, fontWeight:600, fontSize:14 }}>{o.client_name||"—"} · {o.cake_flavor||"—"} · {o.quantity||"—"} шт</div>
                    <div style={{ color:s.muted, fontSize:12, marginTop:4 }}>Дата: {o.order_date||"—"}</div>
                    <div style={{ color:"#ff9800", fontSize:13, marginTop:4 }}>Причина: «{o.cancellation_reason}»</div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <button onClick={()=>approveCancellation(o)}
                      style={{ backgroundColor:"#e5737322", border:"1px solid #e57373", color:"#e57373", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>
                      Подтвердить
                    </button>
                    <button onClick={()=>rejectCancellation(o)}
                      style={{ backgroundColor:"#4caf5022", border:"1px solid #4caf50", color:"#81c784", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── TAB 5: Настройки ── */}
        {tab === 5 && (
          <div style={{ maxWidth: 720 }}>
            {/* Профиль */}
            <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h2 style={{ color: s.gold, fontSize: 15, marginBottom: 20 }}>Профиль</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: s.bg, border: `2px solid ${s.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                  {user?.name?.[0] || "?"}
                </div>
                <div>
                  <div style={{ color: s.text, fontWeight: 700, fontSize: 18 }}>{user?.name}</div>
                  <div style={{ color: s.muted, fontSize: 13, marginTop: 2 }}>{user?.role}</div>
                </div>
              </div>
            </div>

            {/* Пользователи */}
            <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ color: s.gold, fontSize: 15, margin: 0 }}>Пользователи</h2>
                <button onClick={() => { setEditingUser(null); setUserForm({ name: "", role: "", pin: "" }); setShowUserModal(true); }}
                  style={{ backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "7px 16px", color: "#0f0e0c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  + Добавить
                </button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                    {["Имя", "Должность", "PIN", ""].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", color: s.muted, fontSize: 12, textAlign: "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                      <td style={{ padding: "12px 12px", fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: "12px 12px", color: s.muted, fontSize: 13 }}>{u.role}</td>
                      <td style={{ padding: "12px 12px", fontFamily: "monospace", color: s.muted, fontSize: 13, letterSpacing: 2 }}>
                        {"•".repeat(u.pin?.length || 6)}
                      </td>
                      <td style={{ padding: "12px 12px", textAlign: "right" }}>
                        <button onClick={() => { setEditingUser(u); setUserForm({ name: u.name, role: u.role, pin: u.pin }); setShowUserModal(true); }}
                          style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, marginRight: 8 }}>
                          Ред.
                        </button>
                        {users.length > 1 && (
                          <button onClick={() => deleteUser(u.id)}
                            style={{ background: "none", border: "1px solid #e5737344", color: "#e57373", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>
                            Удалить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: Аналитика ИИ ── */}
        {tab === 4 && (
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

      {/* Edit Order Modal */}
      {editingOrder && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ color: s.gold, fontSize: 16, marginBottom: 20 }}>Редактировать заказ</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["client_name","Клиент"],["phone","Телефон"],
                ["cake_flavor","Вкус"],["quantity","Количество (шт)"],
                ["order_date","Дата (ГГГГ-ММ-ДД)"],["order_time","Время (ЧЧ:ММ)"],
                ["address","Адрес"],["payment_type","Тип оплаты"],
                ["paid_amount","Оплачено (₸)"],["total_amount","Сумма (₸)"],
              ].map(([field, label]) => (
                <div key={field}>
                  <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 4 }}>{label}</label>
                  <input value={orderEditForm[field] ?? ""} onChange={(e) => setOrderEditForm((f) => ({ ...f, [field]: e.target.value }))}
                    style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "7px 10px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 4 }}>Заметки</label>
              <textarea value={orderEditForm.notes ?? ""} onChange={(e) => setOrderEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "7px 10px", color: s.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ color: s.muted, fontSize: 11, display: "block", marginBottom: 4 }}>Статус</label>
              <select value={orderEditForm.status} onChange={(e) => setOrderEditForm((f) => ({ ...f, status: e.target.value }))}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "7px 10px", color: s.text, fontSize: 13 }}>
                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={saveOrderEdit}
                style={{ flex: 1, backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "10px", color: "#0f0e0c", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Сохранить
              </button>
              <button onClick={() => setEditingOrder(null)}
                style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 8, padding: "10px", color: s.muted, cursor: "pointer", fontSize: 14 }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 28, width: 400 }}>
            <h2 style={{ color: s.gold, fontSize: 16, marginBottom: 20 }}>{editingUser ? "Редактировать" : "Новый пользователь"}</h2>
            {[["name","Имя"], ["pin","PIN-код (4-6 цифр)"]].map(([field, label]) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>{label}</label>
                <input
                  value={userForm[field]}
                  onChange={(e) => setUserForm((f) => ({ ...f, [field]: e.target.value }))}
                  maxLength={field === "pin" ? 6 : 50}
                  inputMode={field === "pin" ? "numeric" : "text"}
                  style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Роль</label>
              <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 13 }}>
                <option value="">— выберите —</option>
                <option value="Соучредитель">Соучредитель</option>
                <option value="Операционный Директор">Операционный Директор</option>
                <option value="Менеджер цеха">Менеджер цеха</option>
                <option value="Менеджер">Менеджер</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={saveUser} disabled={!userForm.name || !userForm.pin || userForm.pin.length < 4 || !userForm.role}
                style={{ flex: 1, backgroundColor: s.gold, border: "none", borderRadius: 8, padding: "10px", color: "#0f0e0c", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Сохранить
              </button>
              <button onClick={() => setShowUserModal(false)}
                style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 8, padding: "10px", color: s.muted, cursor: "pointer", fontSize: 14 }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ color: s.gold, fontSize: 16, marginBottom: 20 }}>Новый заказ</h2>

            {/* Client search */}
            <div style={{ marginBottom: 14, position: "relative" }}>
              <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Клиент</label>
              <input
                value={addClientQuery}
                onChange={(e) => {
                  setAddClientQuery(e.target.value);
                  setAddForm((f) => ({ ...f, client_name: e.target.value, phone: "" }));
                }}
                placeholder="Поиск из базы или введите имя..."
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
              {addClientSuggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#222", border: `1px solid ${s.border}`, borderRadius: 8, zIndex: 10, overflow: "hidden", marginTop: 2 }}>
                  {addClientSuggestions.map((c) => (
                    <div key={c.id}
                      onClick={() => { setAddForm((f) => ({ ...f, client_name: c.name, phone: c.phone || "" })); setAddClientQuery(c.name); setAddClientSuggestions([]); }}
                      style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${s.border}`, fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = s.card}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                      <span style={{ color: s.gold, fontWeight: 600 }}>{c.name}</span>
                      {c.phone && <span style={{ color: s.muted, fontSize: 12, marginLeft: 10 }}>{c.phone}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["phone","Телефон"], ["cake_flavor","Вкус"],
                ["quantity","Количество (шт)"], ["order_date","Дата"],
                ["order_time","Время (ЧЧ:ММ)"], ["address","Адрес"],
                ["total_amount","Сумма (₸)"], ["payment_type","Тип оплаты"],
              ].map(([field, label]) => (
                <div key={field}>
                  <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>{label}</label>
                  <input
                    type={field === "order_date" ? "date" : "text"}
                    value={addForm[field]}
                    onChange={(e) => setAddForm((f) => ({ ...f, [field]: e.target.value }))}
                    style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 10px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Заметки</label>
              <textarea value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={addOrder} disabled={!addForm.client_name}
                style={{ flex: 2, backgroundColor: addForm.client_name ? s.gold : s.border, border: "none", borderRadius: 8, padding: "11px", color: addForm.client_name ? "#0f0e0c" : s.muted, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Добавить заказ
              </button>
              <button onClick={() => { setShowAddModal(false); setAddClientQuery(""); setAddClientSuggestions([]); }}
                style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 8, padding: "11px", color: s.muted, cursor: "pointer", fontSize: 14 }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
