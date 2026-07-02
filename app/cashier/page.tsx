"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const s = { bg: "#0f0e0c", card: "#1a1815", gold: "#c8a96e", text: "#f5f0e8", muted: "#888", border: "#2a2825" };

const SIZES = [
  { label: "8 шт", value: 8 },
  { label: "12 шт", value: 12 },
  { label: "Другой", value: 0 },
];

const DEFAULT_FLAVORS = [
  "Молочная девочка", "Фисташка", "Шоколад", "Красный бархат",
  "Карамель", "Ваниль", "Клубника", "Манго", "Лимон", "Орео",
];

export default function CashierPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(0); // 0=flavor, 1=client, 2=quantity, 3=size, 4=confirm
  const [flavor, setFlavor] = useState("");
  const [customFlavor, setCustomFlavor] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null); // null = физ. лицо
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInAmount, setWalkInAmount] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState<number | null>(null);
  const [customSize, setCustomSize] = useState("");
  const [flavors, setFlavors] = useState<string[]>(DEFAULT_FLAVORS);
  const [clients, setClients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const clientInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const auth = localStorage.getItem("bc_auth");
    if (!auth) { router.replace("/login"); return; }
    const parsed = JSON.parse(auth);
    if (parsed.role !== "Менеджер цеха") { router.replace("/dashboard"); return; }
    setUser(parsed);
    loadData();
  }, []);

  const loadData = async () => {
    const [clientsRes, ordersRes] = await Promise.all([
      supabase.from("berrycake_clients").select("id,name,phone,price_per_unit,client_type").order("name"),
      supabase.from("berrycake_orders").select("cake_flavor").not("cake_flavor", "is", null).limit(500),
    ]);
    if (clientsRes.data) setClients(clientsRes.data);
    if (ordersRes.data) {
      const fromDB = [...new Set(ordersRes.data.map((o) => (o.cake_flavor || "").trim()).filter(Boolean))];
      const merged = [...new Set([...DEFAULT_FLAVORS, ...fromDB])];
      setFlavors(merged);
    }
  };

  useEffect(() => {
    if (!clientQuery.trim()) { setClientSuggestions([]); return; }
    const q = clientQuery.toLowerCase();
    setClientSuggestions(clients.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || "").includes(q)).slice(0, 6));
  }, [clientQuery, clients]);

  const reset = () => {
    setStep(0); setFlavor(""); setCustomFlavor(""); setClientQuery("");
    setSelectedClient(null); setIsWalkIn(false); setWalkInName(""); setWalkInAmount("");
    setQuantity(1); setSize(null); setCustomSize(""); setDone(false);
  };

  const finalFlavor = flavor === "__custom__" ? customFlavor : flavor;
  const finalSize = size === 0 ? Number(customSize) || null : size;

  const saveOrder = async () => {
    setSaving(true);
    try {
      const clientName = isWalkIn ? (walkInName || "Физ. лицо") : (selectedClient?.name || "");
      const clientPhone = isWalkIn ? null : (selectedClient?.phone || null);
      const rate = isWalkIn ? null : (selectedClient?.price_per_unit || null);
      const totalAmount = isWalkIn
        ? (walkInAmount ? Number(walkInAmount) : null)
        : (rate && quantity ? rate * quantity : null);

      await supabase.from("berrycake_orders").insert({
        client_name: clientName,
        phone: clientPhone,
        cake_flavor: finalFlavor,
        quantity,
        order_date: new Date().toISOString().slice(0, 10),
        status: "new",
        total_amount: totalAmount,
        payment_type: isWalkIn ? "наличные" : (selectedClient?.client_type || null),
        notes: finalSize ? `Размер: ${finalSize} шт` : null,
      });
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: s.bg, color: s.text, fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${s.border}`, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🍰</span>
          <span style={{ color: s.gold, fontWeight: 700, fontSize: 16 }}>BerryCake — Касса</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: s.muted, fontSize: 13 }}>{user.name}</span>
          <button onClick={() => { localStorage.removeItem("bc_auth"); router.replace("/login"); }}
            style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
            Выйти
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px" }}>

        {/* Done screen */}
        {done && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: s.gold, fontSize: 24, marginBottom: 8 }}>Заказ принят!</h2>
            <p style={{ color: s.muted, fontSize: 14, marginBottom: 32 }}>
              {finalFlavor} · {quantity} шт{finalSize ? ` · ${finalSize} в боксе` : ""}<br />
              {isWalkIn ? (walkInName || "Физ. лицо") : selectedClient?.name}
            </p>
            <button onClick={reset}
              style={{ backgroundColor: s.gold, border: "none", borderRadius: 12, padding: "14px 40px", color: "#0f0e0c", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
              Новый заказ
            </button>
          </div>
        )}

        {!done && (
          <>
            {/* Progress */}
            <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
              {["Продукт", "Клиент", "Количество", "Размер"].map((label, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    height: 4, borderRadius: 2, marginBottom: 6,
                    backgroundColor: i <= step ? s.gold : s.border,
                    transition: "background-color 0.2s",
                  }} />
                  <span style={{ fontSize: 10, color: i === step ? s.gold : s.muted }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Step 0: Flavor */}
            {step === 0 && (
              <div>
                <h2 style={{ color: s.gold, fontSize: 18, marginBottom: 20, textAlign: "center" }}>Выберите продукт</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                  {flavors.map((f) => (
                    <button key={f} onClick={() => { setFlavor(f); setStep(1); }}
                      style={{
                        backgroundColor: flavor === f ? s.gold : s.card,
                        border: `2px solid ${flavor === f ? s.gold : s.border}`,
                        borderRadius: 14, padding: "20px 12px", cursor: "pointer",
                        color: flavor === f ? "#0f0e0c" : s.text,
                        fontSize: 13, fontWeight: 600, textAlign: "center",
                        lineHeight: 1.3, minHeight: 80,
                        transition: "all 0.15s",
                      }}>
                      {f}
                    </button>
                  ))}
                  <button onClick={() => setFlavor("__custom__")}
                    style={{
                      backgroundColor: flavor === "__custom__" ? s.gold : s.card,
                      border: `2px dashed ${s.border}`, borderRadius: 14, padding: "20px 12px",
                      cursor: "pointer", color: s.muted, fontSize: 13, minHeight: 80,
                    }}>
                    + Другой
                  </button>
                </div>
                {flavor === "__custom__" && (
                  <div style={{ marginBottom: 16 }}>
                    <input
                      autoFocus
                      placeholder="Введите вкус..."
                      value={customFlavor}
                      onChange={(e) => setCustomFlavor(e.target.value)}
                      style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 10, padding: "12px 16px", color: s.text, fontSize: 15, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                )}
                {flavor === "__custom__" && customFlavor && (
                  <button onClick={() => setStep(1)}
                    style={{ width: "100%", backgroundColor: s.gold, border: "none", borderRadius: 12, padding: "14px", color: "#0f0e0c", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                    Далее →
                  </button>
                )}
              </div>
            )}

            {/* Step 1: Client */}
            {step === 1 && (
              <div>
                <h2 style={{ color: s.gold, fontSize: 18, marginBottom: 20, textAlign: "center" }}>Выберите клиента</h2>

                {!isWalkIn && (
                  <>
                    <div style={{ position: "relative", marginBottom: 12 }}>
                      <input
                        ref={clientInputRef}
                        autoFocus
                        placeholder="🔍 Поиск по имени или телефону..."
                        value={clientQuery}
                        onChange={(e) => { setClientQuery(e.target.value); setSelectedClient(null); }}
                        style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${selectedClient ? s.gold : s.border}`, borderRadius: 10, padding: "12px 16px", color: s.text, fontSize: 15, outline: "none", boxSizing: "border-box" }}
                      />
                      {clientSuggestions.length > 0 && !selectedClient && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#222", border: `1px solid ${s.border}`, borderRadius: 10, zIndex: 10, overflow: "hidden", marginTop: 4 }}>
                          {clientSuggestions.map((c) => (
                            <div key={c.id} onClick={() => { setSelectedClient(c); setClientQuery(c.name); setClientSuggestions([]); }}
                              style={{ padding: "12px 16px", cursor: "pointer", borderBottom: `1px solid ${s.border}`, fontSize: 14 }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = s.card)}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                              <span style={{ color: s.gold, fontWeight: 600 }}>{c.name}</span>
                              {c.phone && <span style={{ color: s.muted, fontSize: 12, marginLeft: 10 }}>{c.phone}</span>}
                              <span style={{ color: s.muted, fontSize: 11, marginLeft: 10, backgroundColor: s.border, padding: "1px 6px", borderRadius: 4 }}>{c.client_type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedClient && (
                      <div style={{ backgroundColor: "#1e2a1e", border: "1px solid #4caf5044", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
                        <span style={{ color: "#81c784", fontWeight: 700 }}>✓ {selectedClient.name}</span>
                        <span style={{ color: s.muted, marginLeft: 10 }}>{selectedClient.client_type}</span>
                      </div>
                    )}

                    <button onClick={() => setIsWalkIn(true)}
                      style={{ width: "100%", background: "none", border: `1px dashed ${s.border}`, borderRadius: 10, padding: "12px", color: s.muted, cursor: "pointer", fontSize: 14, marginBottom: 16 }}>
                      Физ. лицо / разовый заказ
                    </button>

                    <div style={{ display: "flex", gap: 12 }}>
                      <button onClick={() => setStep(0)}
                        style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 12, padding: "14px", color: s.muted, cursor: "pointer", fontSize: 15 }}>
                        ← Назад
                      </button>
                      <button onClick={() => setStep(2)} disabled={!selectedClient}
                        style={{ flex: 2, backgroundColor: selectedClient ? s.gold : s.border, border: "none", borderRadius: 12, padding: "14px", color: selectedClient ? "#0f0e0c" : s.muted, fontWeight: 700, fontSize: 16, cursor: selectedClient ? "pointer" : "default" }}>
                        Далее →
                      </button>
                    </div>
                  </>
                )}

                {isWalkIn && (
                  <div>
                    <input
                      autoFocus
                      placeholder="Имя клиента (необязательно)"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: "12px 16px", color: s.text, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
                    />
                    <input
                      placeholder="Сумма заказа (₸)"
                      value={walkInAmount}
                      onChange={(e) => setWalkInAmount(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                      style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: "12px 16px", color: s.text, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 20 }}
                    />
                    <div style={{ display: "flex", gap: 12 }}>
                      <button onClick={() => setIsWalkIn(false)}
                        style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 12, padding: "14px", color: s.muted, cursor: "pointer", fontSize: 15 }}>
                        ← Назад
                      </button>
                      <button onClick={() => setStep(2)}
                        style={{ flex: 2, backgroundColor: s.gold, border: "none", borderRadius: 12, padding: "14px", color: "#0f0e0c", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                        Далее →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Quantity */}
            {step === 2 && (
              <div style={{ textAlign: "center" }}>
                <h2 style={{ color: s.gold, fontSize: 18, marginBottom: 32 }}>Количество</h2>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, marginBottom: 48 }}>
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: s.card, border: `2px solid ${s.border}`, color: s.text, fontSize: 28, cursor: "pointer", fontWeight: 300 }}>
                    −
                  </button>
                  <span style={{ color: s.gold, fontSize: 64, fontWeight: 700, minWidth: 80 }}>{quantity}</span>
                  <button onClick={() => setQuantity((q) => q + 1)}
                    style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: s.card, border: `2px solid ${s.gold}`, color: s.gold, fontSize: 28, cursor: "pointer", fontWeight: 300 }}>
                    +
                  </button>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => setStep(1)}
                    style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 12, padding: "14px", color: s.muted, cursor: "pointer", fontSize: 15 }}>
                    ← Назад
                  </button>
                  <button onClick={() => setStep(3)}
                    style={{ flex: 2, backgroundColor: s.gold, border: "none", borderRadius: 12, padding: "14px", color: "#0f0e0c", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                    Далее →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Size */}
            {step === 3 && (
              <div>
                <h2 style={{ color: s.gold, fontSize: 18, marginBottom: 20, textAlign: "center" }}>Размер бенто</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                  {SIZES.map((sz) => (
                    <button key={sz.label} onClick={() => setSize(sz.value)}
                      style={{
                        backgroundColor: size === sz.value ? s.gold : s.card,
                        border: `2px solid ${size === sz.value ? s.gold : s.border}`,
                        borderRadius: 14, padding: "28px 12px", cursor: "pointer",
                        color: size === sz.value ? "#0f0e0c" : s.text,
                        fontSize: 18, fontWeight: 700, minHeight: 90,
                        transition: "all 0.15s",
                      }}>
                      {sz.label}
                    </button>
                  ))}
                </div>
                {size === 0 && (
                  <input
                    autoFocus
                    placeholder="Введите размер..."
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.gold}`, borderRadius: 10, padding: "12px 16px", color: s.text, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 16, textAlign: "center" }}
                  />
                )}

                {/* Summary */}
                <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <div style={{ color: s.muted, fontSize: 12, marginBottom: 8 }}>Итог заказа</div>
                  <div style={{ fontSize: 14, lineHeight: 2 }}>
                    <div><span style={{ color: s.muted }}>Продукт:</span> <strong>{finalFlavor}</strong></div>
                    <div><span style={{ color: s.muted }}>Клиент:</span> <strong>{isWalkIn ? (walkInName || "Физ. лицо") : selectedClient?.name}</strong></div>
                    <div><span style={{ color: s.muted }}>Кол-во:</span> <strong>{quantity} шт</strong></div>
                    {(size !== null && (size > 0 || customSize)) && (
                      <div><span style={{ color: s.muted }}>Размер бенто:</span> <strong>{size === 0 ? customSize : size} шт в боксе</strong></div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => setStep(2)}
                    style={{ flex: 1, backgroundColor: s.border, border: "none", borderRadius: 12, padding: "14px", color: s.muted, cursor: "pointer", fontSize: 15 }}>
                    ← Назад
                  </button>
                  <button onClick={saveOrder} disabled={saving || size === null || (size === 0 && !customSize)}
                    style={{ flex: 2, backgroundColor: (saving || size === null || (size === 0 && !customSize)) ? s.border : "#4caf50", border: "none", borderRadius: 12, padding: "14px", color: (saving || size === null || (size === 0 && !customSize)) ? s.muted : "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
                    {saving ? "Сохранение..." : "✓ Принять заказ"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
