"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const s = { bg: "#f5f5f3", card: "#ffffff", gold: "#111827", text: "#111827", muted: "#6b7280", border: "#e5e7eb" };
const SIZES = ["S", "M", "L", "Другое"];
const STATUS_FLOW: Record<string, string> = { new: "in_progress", in_progress: "done", done: "delivered" };
const STATUSES: Record<string, { label: string; color: string }> = {
  new: { label: "Новый", color: "#c8a96e" },
  in_progress: { label: "В работе", color: "#64b5f6" },
  done: { label: "Готов", color: "#81c784" },
  delivered: { label: "Доставлен", color: "#888" },
  cancellation_requested: { label: "Запрос отмены", color: "#ff9800" },
  cancelled: { label: "Отменён", color: "#e57373" },
};

// Inline SVG icons — no emoji
const IconCake = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h0.01"/><path d="M12 4h0.01"/><path d="M17 4h0.01"/>
  </svg>
);
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconCheck = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#81c784" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);

export default function CashierPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mainTab, setMainTab] = useState<"new" | "accessories" | "orders">("new");

  // Cake order state
  const [step, setStep] = useState(0);
  const [flavors, setFlavors] = useState<string[]>([]);
  const [customFlavor, setCustomFlavor] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInAmount, setWalkInAmount] = useState("");
  const [flavorQtys, setFlavorQtys] = useState<Record<string, number>>({});
  const [size, setSize] = useState<string | null>(null);
  const [customSize, setCustomSize] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Accessories state
  const [accessoryQtys, setAccessoryQtys] = useState<Record<string, number>>({});
  const [accessoryClient, setAccessoryClient] = useState("");
  const [accessoryAmount, setAccessoryAmount] = useState("");
  const [accessorySaving, setAccessorySaving] = useState(false);
  const [accessoryDone, setAccessoryDone] = useState(false);

  // Orders filter
  const [orderFilter, setOrderFilter] = useState("all");

  // Data
  const [clients, setClients] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [dbFlavors, setDbFlavors] = useState<string[]>([]);
  const [accessories, setAccessories] = useState<any[]>([]);

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("bc_auth");
    if (!auth) { router.replace("/login"); return; }
    const parsed = JSON.parse(auth);
    if (parsed.role !== "Менеджер цеха") { router.replace("/dashboard"); return; }
    setUser(parsed);
    loadData();
  }, []);

  const loadData = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [clientsRes, ordersRes, flavorsRes, accRes] = await Promise.all([
      supabase.from("berrycake_clients").select("id,name,phone,price_per_unit,client_type").order("name"),
      supabase.from("berrycake_orders").select("*").gte("created_at", today + "T00:00:00Z").order("created_at", { ascending: false }),
      supabase.from("berrycake_flavors").select("name").eq("active", true).order("sort_order"),
      supabase.from("berrycake_accessories").select("*").eq("active", true).order("sort_order"),
    ]);
    if (clientsRes.data) setClients(clientsRes.data);
    if (ordersRes.data) setMyOrders(ordersRes.data);
    if (flavorsRes.data) setDbFlavors(flavorsRes.data.map((f: any) => f.name));
    if (accRes.data) setAccessories(accRes.data);
  };

  useEffect(() => {
    if (!clientQuery.trim()) { setClientSuggestions([]); return; }
    const q = clientQuery.toLowerCase();
    setClientSuggestions(clients.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || "").includes(q)).slice(0, 6));
  }, [clientQuery, clients]);

  const reset = () => {
    setStep(0); setFlavors([]); setCustomFlavor(""); setShowCustom(false);
    setClientQuery(""); setSelectedClient(null); setIsWalkIn(false);
    setWalkInName(""); setWalkInAmount(""); setFlavorQtys({});
    setSize(null); setCustomSize(""); setDone(false);
  };

  const toggleFlavor = (f: string) =>
    setFlavors((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const selectedFlavorList = [...flavors, ...(showCustom && customFlavor.trim() ? [customFlavor.trim()] : [])];
  const setFlavorQty = (name: string, qty: number) =>
    setFlavorQtys((prev) => ({ ...prev, [name]: Math.max(1, qty) }));
  const totalQuantity = selectedFlavorList.reduce((sum, f) => sum + (flavorQtys[f] ?? 1), 0);
  const finalFlavor = selectedFlavorList.length > 1
    ? selectedFlavorList.map((f) => `${f} ×${flavorQtys[f] ?? 1}`).join(" + ")
    : selectedFlavorList.join(" + ");
  const finalSize = size === "Другое" ? (customSize || null) : size;

  const saveOrder = async () => {
    setSaving(true);
    try {
      const clientName = isWalkIn ? (walkInName || "Физ. лицо") : (selectedClient?.name || "");
      const rate = isWalkIn ? null : (selectedClient?.price_per_unit || null);
      const totalAmount = isWalkIn
        ? (walkInAmount ? Number(walkInAmount) : null)
        : (rate && totalQuantity ? rate * totalQuantity : null);
      await supabase.from("berrycake_orders").insert({
        client_name: clientName,
        phone: isWalkIn ? null : (selectedClient?.phone || null),
        cake_flavor: finalFlavor,
        quantity: totalQuantity,
        order_date: new Date().toISOString().slice(0, 10),
        status: "new",
        total_amount: totalAmount,
        payment_type: isWalkIn ? "наличные" : (selectedClient?.client_type || null),
        notes: finalSize ? `Размер: ${finalSize}` : null,
      });
      setDone(true);
      loadData();
    } finally { setSaving(false); }
  };

  // Auto-calculate accessories total
  const accessoryTotal = Object.entries(accessoryQtys).reduce((sum, [name, qty]) => {
    if (qty <= 0) return sum;
    const acc = accessories.find((a) => a.name === name);
    return sum + (acc?.price ? acc.price * qty : 0);
  }, 0);

  const saveAccessoryOrder = async () => {
    const items = Object.entries(accessoryQtys).filter(([, q]) => q > 0);
    if (!items.length) return;
    setAccessorySaving(true);
    try {
      const itemStr = items.map(([name, qty]) => `${name} ×${qty}`).join(", ");
      const total = accessoryAmount ? Number(accessoryAmount) : (accessoryTotal > 0 ? accessoryTotal : null);
      await supabase.from("berrycake_orders").insert({
        client_name: accessoryClient || "Физ. лицо",
        cake_flavor: "прочее",
        quantity: items.reduce((s, [, q]) => s + q, 0),
        order_date: new Date().toISOString().slice(0, 10),
        status: "done",
        total_amount: total,
        payment_type: "наличные",
        notes: itemStr,
      });
      setAccessoryDone(true);
      loadData();
    } finally { setAccessorySaving(false); }
  };

  const advanceStatus = async (order: any) => {
    const next = STATUS_FLOW[order.status];
    if (!next) return;
    await supabase.from("berrycake_orders").update({ status: next }).eq("id", order.id);
    setMyOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: next } : o));
  };

  const requestCancel = async () => {
    if (!cancelReason.trim()) return;
    setCancelSaving(true);
    try {
      await supabase.from("berrycake_orders").update({
        previous_status: cancelTarget.status,
        status: "cancellation_requested",
        cancellation_reason: cancelReason,
      }).eq("id", cancelTarget.id);
      setCancelTarget(null); setCancelReason("");
      loadData();
    } finally { setCancelSaving(false); }
  };

  if (!user) return null;

  const hasAccessoryItems = Object.values(accessoryQtys).some((q) => q > 0);
  const pendingCancel = myOrders.filter((o) => o.status === "cancellation_requested").length;

  const filteredOrders = orderFilter === "all"
    ? myOrders
    : myOrders.filter((o) => (o.status || "new") === orderFilter);

  const btnBase: React.CSSProperties = {
    border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif",
    transition: "all 0.15s", display: "inline-flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: s.bg, color: s.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ backgroundColor: s.card, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: s.gold }}>
          <IconCake />
          <span style={{ fontWeight: 700, fontSize: 16 }}>BerryCake — Касса</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: s.muted, fontSize: 13 }}>{user.name}</span>
          <button onClick={() => { localStorage.removeItem("bc_auth"); router.replace("/login"); }}
            style={{ ...btnBase, gap: 6, background: "none", border: `1px solid ${s.border}`, color: s.muted, padding: "5px 12px", borderRadius: 8, fontSize: 12 }}>
            <IconLogout /> Выйти
          </button>
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${s.border}`, backgroundColor: s.card }}>
        {([["new", "Торты"], ["accessories", "Прочее"], ["orders", "Мои заказы"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setMainTab(key as any)}
            style={{ ...btnBase, flex: 1, padding: "13px 8px", background: "none",
              color: mainTab === key ? s.gold : s.muted, fontWeight: mainTab === key ? 700 : 400,
              fontSize: 13, borderBottom: mainTab === key ? `2px solid ${s.gold}` : "2px solid transparent",
              position: "relative" }}>
            {label}
            {key === "orders" && pendingCancel > 0 && (
              <span style={{ marginLeft: 5, backgroundColor: "#ff9800", color: "#fff", borderRadius: "50%", fontSize: 10, padding: "1px 5px", fontWeight: 700, display: "inline-block" }}>
                {pendingCancel}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── TAB: Торты ── */}
        {mainTab === "new" && (
          <>
            {done ? (
              <div style={{ textAlign: "center", padding: "60px 0", animation: "fadeIn 0.2s ease" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><IconCheck /></div>
                <h2 style={{ color: s.gold, fontSize: 24, marginBottom: 8 }}>Заказ принят!</h2>
                <p style={{ color: s.muted, fontSize: 14, marginBottom: 32, lineHeight: 2 }}>
                  {finalFlavor} · {totalQuantity} шт{finalSize ? ` · ${finalSize}` : ""}<br />
                  {isWalkIn ? (walkInName || "Физ. лицо") : selectedClient?.name}
                </p>
                <button onClick={reset}
                  style={{ ...btnBase, backgroundColor: s.gold, borderRadius: 12, padding: "14px 40px", color: "#ffffff", fontWeight: 700, fontSize: 16 }}>
                  Новый заказ
                </button>
              </div>
            ) : (
              <>
                {/* Progress — clickable for completed steps */}
                <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
                  {["Вкус", "Клиент", "Кол-во", "Размер"].map((label, i) => (
                    <div key={i} onClick={() => i < step && setStep(i)}
                      style={{ flex: 1, textAlign: "center", cursor: i < step ? "pointer" : "default" }}>
                      <div style={{ height: 4, borderRadius: 2, marginBottom: 6,
                        backgroundColor: i <= step ? s.gold : s.border,
                        transition: "background-color 0.2s",
                        opacity: i < step ? 0.6 : 1 }} />
                      <span style={{ fontSize: 12, color: i === step ? s.gold : s.muted,
                        fontWeight: i === step ? 600 : 400,
                        textDecoration: i < step ? "underline dotted" : "none" }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Step 0: Flavor */}
                {step === 0 && (
                  <div>
                    <h2 style={{ color: s.gold, fontSize: 18, marginBottom: 6, textAlign: "center" }}>Выберите вкус(ы)</h2>
                    <p style={{ color: s.muted, fontSize: 13, textAlign: "center", marginBottom: 20 }}>Можно выбрать несколько для комбо-торта</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
                      {dbFlavors.map((f) => {
                        const sel = flavors.includes(f);
                        return (
                          <button key={f} onClick={() => toggleFlavor(f)}
                            style={{ ...btnBase, backgroundColor: sel ? s.gold : s.card, border: `2px solid ${sel ? s.gold : s.border}`,
                              borderRadius: 14, padding: "18px 10px", color: sel ? "#ffffff" : s.text,
                              fontSize: 12, fontWeight: 700, textAlign: "center", lineHeight: 1.3, minHeight: 70,
                              position: "relative", flexDirection: "column" }}>
                            {sel && <span style={{ position: "absolute", top: 5, right: 8, fontSize: 13 }}>✓</span>}
                            {f}
                          </button>
                        );
                      })}
                      <button onClick={() => setShowCustom((v) => !v)}
                        style={{ ...btnBase, backgroundColor: showCustom ? "#11182715" : s.card,
                          border: `2px dashed ${showCustom ? s.gold : s.border}`,
                          borderRadius: 14, padding: "18px 10px", color: showCustom ? s.gold : s.muted,
                          fontSize: 12, minHeight: 70 }}>
                        + Другой
                      </button>
                    </div>
                    {showCustom && (
                      <input autoFocus placeholder="Введите вкус..." value={customFlavor} onChange={(e) => setCustomFlavor(e.target.value)}
                        style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 10, padding: "12px 16px",
                          color: s.text, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
                    )}
                    {finalFlavor && (
                      <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>
                        <span style={{ color: "#166534", fontWeight: 600 }}>Выбрано: </span>
                        <span style={{ color: s.text }}>{finalFlavor}</span>
                      </div>
                    )}
                    <button onClick={() => setStep(1)} disabled={!finalFlavor}
                      style={{ ...btnBase, width: "100%", backgroundColor: finalFlavor ? s.gold : s.border, borderRadius: 12, padding: "14px",
                        color: finalFlavor ? "#ffffff" : s.muted, fontWeight: 700, fontSize: 16 }}>
                      Далее →
                    </button>
                  </div>
                )}

                {/* Step 1: Client */}
                {step === 1 && (
                  <div>
                    <h2 style={{ color: s.gold, fontSize: 18, marginBottom: 20, textAlign: "center" }}>Выберите клиента</h2>
                    {!isWalkIn ? (
                      <>
                        <div style={{ position: "relative", marginBottom: 12 }}>
                          <input autoFocus placeholder="Поиск по имени или телефону..."
                            value={clientQuery} onChange={(e) => { setClientQuery(e.target.value); setSelectedClient(null); }}
                            style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${selectedClient ? s.gold : s.border}`,
                              borderRadius: 10, padding: "12px 16px", color: s.text, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
                          {clientSuggestions.length > 0 && !selectedClient && (
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: s.card, border: `1px solid ${s.border}`,
                              borderRadius: 10, zIndex: 10, overflow: "hidden", marginTop: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                              {clientSuggestions.map((c) => (
                                <div key={c.id} onClick={() => { setSelectedClient(c); setClientQuery(c.name); setClientSuggestions([]); }}
                                  style={{ padding: "12px 16px", cursor: "pointer", borderBottom: `1px solid ${s.border}`, fontSize: 14, color: s.text, backgroundColor: s.card }}>
                                  <span style={{ color: s.gold, fontWeight: 600 }}>{c.name}</span>
                                  {c.phone && <span style={{ color: s.muted, fontSize: 12, marginLeft: 10 }}>{c.phone}</span>}
                                  <span style={{ color: s.muted, fontSize: 11, marginLeft: 10, backgroundColor: s.bg, padding: "1px 6px", borderRadius: 4 }}>{c.client_type}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {selectedClient && (
                          <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 12, fontSize: 13 }}>
                            <span style={{ color: "#166534", fontWeight: 700 }}>✓ {selectedClient.name}</span>
                            <span style={{ color: s.muted, marginLeft: 10 }}>{selectedClient.client_type}</span>
                            {selectedClient.price_per_unit && <span style={{ color: s.gold, marginLeft: 10, fontWeight: 600 }}>{selectedClient.price_per_unit} ₸/шт</span>}
                          </div>
                        )}
                        <button onClick={() => setIsWalkIn(true)}
                          style={{ ...btnBase, width: "100%", background: "none", border: `1px dashed ${s.border}`, borderRadius: 10, padding: "12px", color: s.muted, fontSize: 14, marginBottom: 16 }}>
                          Физ. лицо / разовый заказ
                        </button>
                        <div style={{ display: "flex", gap: 12 }}>
                          <button onClick={() => setStep(0)} style={{ ...btnBase, flex: 1, backgroundColor: s.border, borderRadius: 12, padding: "14px", color: s.muted, fontSize: 15 }}>← Назад</button>
                          <button onClick={() => setStep(2)} disabled={!selectedClient}
                            style={{ ...btnBase, flex: 2, backgroundColor: selectedClient ? s.gold : s.border, borderRadius: 12, padding: "14px",
                              color: selectedClient ? "#ffffff" : s.muted, fontWeight: 700, fontSize: 16 }}>
                            Далее →
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <input autoFocus placeholder="Имя клиента (необязательно)" value={walkInName} onChange={(e) => setWalkInName(e.target.value)}
                          style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: "12px 16px", color: s.text, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
                        <input placeholder="Сумма заказа (₸)" value={walkInAmount} onChange={(e) => setWalkInAmount(e.target.value.replace(/\D/g, ""))} inputMode="numeric"
                          style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: "12px 16px", color: s.text, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 20 }} />
                        <div style={{ display: "flex", gap: 12 }}>
                          <button onClick={() => setIsWalkIn(false)} style={{ ...btnBase, flex: 1, backgroundColor: s.border, borderRadius: 12, padding: "14px", color: s.muted, fontSize: 15 }}>← Назад</button>
                          <button onClick={() => setStep(2)} style={{ ...btnBase, flex: 2, backgroundColor: s.gold, borderRadius: 12, padding: "14px", color: "#ffffff", fontWeight: 700, fontSize: 16 }}>Далее →</button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 2: Quantity per selected flavor */}
                {step === 2 && (
                  <div>
                    <h2 style={{ color: s.gold, fontSize: 18, marginBottom: 20, textAlign: "center" }}>Количество</h2>
                    <div style={{ backgroundColor: s.card, borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
                      {selectedFlavorList.map((f, i) => {
                        const qty = flavorQtys[f] ?? 1;
                        return (
                          <div key={f} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "14px 20px", borderBottom: i < selectedFlavorList.length - 1 ? `1px solid ${s.border}` : "none" }}>
                            <div style={{ color: s.text, fontWeight: 600, fontSize: 15 }}>{f}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                              <button onClick={() => setFlavorQty(f, qty - 1)}
                                style={{ ...btnBase, width: 40, height: 40, borderRadius: "50%", border: `1px solid ${s.border}`, background: "none", color: s.text, fontSize: 20 }}>
                                −
                              </button>
                              <span style={{ color: s.gold, fontWeight: 700, fontSize: 18, minWidth: 24, textAlign: "center" }}>{qty}</span>
                              <button onClick={() => setFlavorQty(f, qty + 1)}
                                style={{ ...btnBase, width: 40, height: 40, borderRadius: "50%", border: `1px solid ${s.gold}`, background: "none", color: s.gold, fontSize: 20 }}>
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ textAlign: "center", color: s.muted, fontSize: 14, marginBottom: 28 }}>
                      Итого: <strong style={{ color: s.gold }}>{totalQuantity} шт</strong>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button onClick={() => setStep(1)} style={{ ...btnBase, flex: 1, backgroundColor: s.border, borderRadius: 12, padding: "14px", color: s.muted, fontSize: 15 }}>← Назад</button>
                      <button onClick={() => setStep(3)} style={{ ...btnBase, flex: 2, backgroundColor: s.gold, borderRadius: 12, padding: "14px", color: "#ffffff", fontWeight: 700, fontSize: 16 }}>Далее →</button>
                    </div>
                  </div>
                )}

                {/* Step 3: Size (optional) + confirm */}
                {step === 3 && (
                  <div>
                    <h2 style={{ color: s.gold, fontSize: 18, marginBottom: 8, textAlign: "center" }}>Размер</h2>
                    <p style={{ color: s.muted, fontSize: 13, textAlign: "center", marginBottom: 16 }}>Необязательно — можно пропустить</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
                      {SIZES.map((sz) => (
                        <button key={sz} onClick={() => { setSize(size === sz ? null : sz); if (sz !== "Другое") setCustomSize(""); }}
                          style={{ ...btnBase, backgroundColor: size === sz ? s.gold : s.card, border: `2px solid ${size === sz ? s.gold : s.border}`,
                            borderRadius: 14, padding: "24px 8px", color: size === sz ? "#ffffff" : s.text,
                            fontSize: 18, fontWeight: 700, minHeight: 80 }}>
                          {sz}
                        </button>
                      ))}
                    </div>
                    {size === "Другое" && (
                      <input autoFocus placeholder="Вес или размер (напр. 1 кг, 20 см)..." value={customSize} onChange={(e) => setCustomSize(e.target.value)}
                        style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 10, padding: "12px 16px",
                          color: s.text, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12, textAlign: "center" }} />
                    )}
                    <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                      <div style={{ color: s.muted, fontSize: 12, marginBottom: 8 }}>Итог заказа</div>
                      <div style={{ fontSize: 14, lineHeight: 2 }}>
                        <div><span style={{ color: s.muted }}>Вкус:</span> <strong>{finalFlavor}</strong></div>
                        <div><span style={{ color: s.muted }}>Клиент:</span> <strong>{isWalkIn ? (walkInName || "Физ. лицо") : selectedClient?.name}</strong></div>
                        <div><span style={{ color: s.muted }}>Количество:</span> <strong>{totalQuantity} шт</strong></div>
                        {size && <div><span style={{ color: s.muted }}>Размер:</span> <strong>{finalSize || size}</strong></div>}
                        {(isWalkIn ? walkInAmount : selectedClient?.price_per_unit) && (
                          <div><span style={{ color: s.muted }}>Сумма:</span> <strong style={{ color: s.gold }}>
                            {isWalkIn ? walkInAmount : (selectedClient?.price_per_unit * totalQuantity).toLocaleString("ru-RU")} ₸
                          </strong></div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button onClick={() => setStep(2)} style={{ ...btnBase, flex: 1, backgroundColor: s.border, borderRadius: 12, padding: "14px", color: s.muted, fontSize: 15 }}>← Назад</button>
                      <button onClick={saveOrder} disabled={saving || (size === "Другое" && !customSize)}
                        style={{ ...btnBase, flex: 2, backgroundColor: (saving || (size === "Другое" && !customSize)) ? s.border : "#4caf50",
                          borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 16,
                          color: (saving || (size === "Другое" && !customSize)) ? s.muted : "#fff" }}>
                        {saving ? "Сохранение..." : "✓ Принять заказ"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── TAB: Прочее (аксессуары) ── */}
        {mainTab === "accessories" && (
          <div>
            {accessoryDone ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><IconCheck /></div>
                <h2 style={{ color: s.gold, fontSize: 24, marginBottom: 24 }}>Продажа оформлена!</h2>
                <button onClick={() => { setAccessoryDone(false); setAccessoryQtys({}); setAccessoryClient(""); setAccessoryAmount(""); }}
                  style={{ ...btnBase, backgroundColor: s.gold, borderRadius: 12, padding: "14px 40px", color: "#ffffff", fontWeight: 700, fontSize: 16 }}>
                  Новая продажа
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ color: s.gold, fontSize: 18, marginBottom: 20 }}>Продажа аксессуаров</h2>
                {accessories.length === 0 ? (
                  <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 32, textAlign: "center", color: s.muted }}>
                    Нет позиций. Добавьте их в разделе «Настройки» дашборда.
                  </div>
                ) : (
                  <div style={{ backgroundColor: s.card, borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
                    {accessories.map((acc, i) => {
                      const qty = accessoryQtys[acc.name] || 0;
                      return (
                        <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "14px 20px", borderBottom: i < accessories.length - 1 ? `1px solid ${s.border}` : "none" }}>
                          <div>
                            <div style={{ color: s.text, fontWeight: 600, fontSize: 15 }}>{acc.name}</div>
                            {acc.price && <div style={{ color: s.muted, fontSize: 12 }}>{Number(acc.price).toLocaleString("ru-RU")} ₸/шт</div>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <button onClick={() => setAccessoryQtys((p) => ({ ...p, [acc.name]: Math.max(0, (p[acc.name] || 0) - 1) }))}
                              style={{ ...btnBase, width: 44, height: 44, borderRadius: "50%", border: `1px solid ${s.border}`, background: "none", color: s.text, fontSize: 22 }}>−</button>
                            <span style={{ color: qty > 0 ? s.gold : s.muted, fontWeight: 700, fontSize: 20, minWidth: 28, textAlign: "center" }}>{qty}</span>
                            <button onClick={() => setAccessoryQtys((p) => ({ ...p, [acc.name]: (p[acc.name] || 0) + 1 }))}
                              style={{ ...btnBase, width: 44, height: 44, borderRadius: "50%", border: `1px solid ${s.gold}`, background: "none", color: s.gold, fontSize: 22 }}>+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {hasAccessoryItems && (
                  <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <div style={{ color: s.muted, fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {Object.entries(accessoryQtys).filter(([, q]) => q > 0).map(([n, q]) => `${n} ×${q}`).join(", ")}
                    </div>
                    {accessoryTotal > 0 && (
                      <div style={{ color: s.gold, fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
                        Итого: {accessoryTotal.toLocaleString("ru-RU")} ₸
                      </div>
                    )}
                    <input placeholder="Клиент (необязательно)" value={accessoryClient} onChange={(e) => setAccessoryClient(e.target.value)}
                      style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "12px 14px", color: s.text, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
                    <input
                      placeholder={accessoryTotal > 0 ? `Сумма (по умолчанию ${accessoryTotal.toLocaleString("ru-RU")} ₸)` : "Сумма (₸)"}
                      inputMode="numeric" value={accessoryAmount}
                      onChange={(e) => setAccessoryAmount(e.target.value.replace(/\D/g, ""))}
                      style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "12px 14px", color: s.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                )}

                <button onClick={saveAccessoryOrder} disabled={accessorySaving || !hasAccessoryItems}
                  style={{ ...btnBase, width: "100%", backgroundColor: hasAccessoryItems ? "#4caf50" : s.border, borderRadius: 12, padding: "14px",
                    color: hasAccessoryItems ? "#ffffff" : s.muted, fontWeight: 700, fontSize: 16 }}>
                  {accessorySaving ? "Сохранение..." : "✓ Оформить продажу"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── TAB: Мои заказы ── */}
        {mainTab === "orders" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ color: s.gold, fontSize: 16, margin: 0 }}>Заказы сегодня</h2>
              <button onClick={loadData} style={{ ...btnBase, background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "6px 14px", fontSize: 12 }}>Обновить</button>
            </div>

            {/* Status filter chips */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
              {([["all", "Все"], ["new", "Новые"], ["in_progress", "В работе"], ["done", "Готово"], ["delivered", "Доставлен"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setOrderFilter(key)}
                  style={{ ...btnBase, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                    backgroundColor: orderFilter === key ? s.gold : s.card,
                    color: orderFilter === key ? "#fff" : s.muted,
                    border: `1px solid ${orderFilter === key ? s.gold : s.border}` }}>
                  {label}
                  {key !== "all" && (
                    <span style={{ marginLeft: 5, opacity: 0.7 }}>
                      {myOrders.filter((o) => (o.status || "new") === key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 && <div style={{ color: s.muted, textAlign: "center", padding: "40px 0" }}>Нет заказов</div>}
            {filteredOrders.map((o) => {
              const st = (o.status in STATUSES) ? STATUSES[o.status] : STATUSES.new;
              const canNext = o.status in STATUS_FLOW;
              const canCancel = o.status !== "cancelled" && o.status !== "cancellation_requested";
              return (
                <div key={o.id} style={{ backgroundColor: s.card, borderRadius: 12, padding: 16, marginBottom: 12,
                  border: `1px solid ${o.status === "cancellation_requested" ? "#ff9800" : s.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                      <div style={{ color: s.gold, fontWeight: 700, fontSize: 15 }}>{o.client_name || "—"}</div>
                      <div style={{ color: s.muted, fontSize: 13, marginTop: 4 }}>
                        {o.cake_flavor || "—"} · {o.quantity || "—"} шт
                        {o.notes && <span style={{ marginLeft: 8, color: s.muted }}>{o.notes}</span>}
                      </div>
                      {o.total_amount && (
                        <div style={{ color: s.gold, fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                          {Number(o.total_amount).toLocaleString("ru-RU")} ₸
                        </div>
                      )}
                      {o.status === "cancellation_requested" && (
                        <div style={{ color: "#ff9800", fontSize: 12, marginTop: 6 }}>Ожидает подтверждения: «{o.cancellation_reason}»</div>
                      )}
                      {o.status === "cancelled" && (
                        <div style={{ color: "#e57373", fontSize: 12, marginTop: 6 }}>Отменён: «{o.cancellation_reason}»</div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => canNext && advanceStatus(o)} disabled={!canNext}
                        style={{ ...btnBase, backgroundColor: `${st.color}22`, color: st.color, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600,
                          border: `1px solid ${st.color}55`, whiteSpace: "nowrap" }}>
                        {st.label}{canNext ? " →" : ""}
                      </button>
                      {canCancel && (
                        <button onClick={() => { setCancelTarget(o); setCancelReason(""); }}
                          style={{ ...btnBase, background: "none", border: "1px solid #e5737444", color: "#e57373", borderRadius: 8, padding: "5px 12px", fontSize: 12 }}>
                          Отмена
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {cancelTarget && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}>
          <div style={{ backgroundColor: s.card, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 640, boxSizing: "border-box" }}>
            <h2 style={{ color: "#e57373", fontSize: 16, marginBottom: 8 }}>Запрос на отмену</h2>
            <p style={{ color: s.muted, fontSize: 13, marginBottom: 20 }}>
              <strong style={{ color: s.text }}>{cancelTarget.client_name}</strong> · {cancelTarget.cake_flavor} · {cancelTarget.quantity} шт
            </p>
            <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 6 }}>Причина отмены *</label>
            <textarea autoFocus rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Клиент отказался, ошибка при вводе..."
              style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "10px 14px",
                color: s.text, fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 20 }} />
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setCancelTarget(null)} style={{ ...btnBase, flex: 1, backgroundColor: s.border, borderRadius: 10, padding: "12px", color: s.muted, fontSize: 14 }}>Назад</button>
              <button onClick={requestCancel} disabled={!cancelReason.trim() || cancelSaving}
                style={{ ...btnBase, flex: 2, backgroundColor: cancelReason.trim() ? "#e57373" : s.border, borderRadius: 10, padding: "12px",
                  color: cancelReason.trim() ? "#fff" : s.muted, fontWeight: 700, fontSize: 14 }}>
                {cancelSaving ? "Отправка..." : "Отправить запрос"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
