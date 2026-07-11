"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { calcFlavorBalance, flavorSizeKey, flavorTotalBalance, SIZES } from "@/lib/flavorStock";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const s = { bg: "#FAF6F1", card: "#ffffff", gold: "#8C1B3B", text: "#3E2723", muted: "#9E8070", border: "#E2CEB8" };

const FLAVOR_COLORS: Record<string, string> = {
  "ВУПИ": "#f06292", "МОЛОЧКА": "#64b5f6", "ЯГОДНЫЙ": "#81c784",
  "НУТЕЛЛА": "#a1887f", "СНИКЕРС": "#ffb74d", "СГУЩЕНКА ОРЕХ": "#e57373",
};

const IconFactory = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>
  </svg>
);
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconCheck = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#81c784" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);

export default function ProductionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [flavor, setFlavor] = useState("");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState("");
  const [defects, setDefects] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [todayLog, setTodayLog] = useState<any[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);
  const [dbFlavors, setDbFlavors] = useState<string[]>([]);
  const [flavorBalance, setFlavorBalance] = useState<Record<string, number>>({});

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editDefects, setEditDefects] = useState("0");
  const [editSaving, setEditSaving] = useState(false);

  // Bake date (defaults to today, can be changed)
  const [bakeDate, setBakeDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const auth = localStorage.getItem("bc_auth");
    if (!auth) { router.replace("/login"); return; }
    setUser(JSON.parse(auth));
    fetchFlavors();
    fetchTodayLog();
    fetchFlavorBalance();
  }, []);

  useEffect(() => {
    fetchTodayLog();
  }, [bakeDate]);

  const fetchFlavors = async () => {
    const { data } = await supabase
      .from("berrycake_flavors")
      .select("name")
      .eq("active", true)
      .order("sort_order");
    if (data) setDbFlavors(data.map((f: any) => f.name));
  };

  const fetchTodayLog = async () => {
    setLoadingLog(true);
    const { data } = await supabase
      .from("berrycake_production")
      .select("*")
      .eq("bake_date", bakeDate)
      .order("created_at", { ascending: false });
    if (data) setTodayLog(data);
    setLoadingLog(false);
  };

  const fetchFlavorBalance = async () => {
    const [ordersRes, productionRes] = await Promise.all([
      supabase.from("berrycake_orders").select("cake_flavor,quantity,status").neq("status", "cancelled"),
      supabase.from("berrycake_production").select("flavor,quantity,defects,size"),
    ]);
    if (ordersRes.data && productionRes.data) setFlavorBalance(calcFlavorBalance(productionRes.data, ordersRes.data));
  };

  const save = async () => {
    const qtyNum = parseInt(qty);
    const defNum = parseInt(defects) || 0;
    if (!size) return;
    if (!qtyNum || qtyNum <= 0) return;
    if (defNum > qtyNum) {
      alert(`Брак (${defNum}) не может быть больше выпечено (${qtyNum})`);
      return;
    }
    setSaving(true);
    const auth = JSON.parse(localStorage.getItem("bc_auth") || "{}");
    await supabase.from("berrycake_production").insert({
      bake_date: bakeDate,
      flavor,
      size,
      quantity: qtyNum,
      defects: defNum,
      baker_name: auth.name || "Пекарь",
      notes: notes || null,
    });
    setSaving(false);
    setSaved(true);
    fetchTodayLog();
    fetchFlavorBalance();
    setTimeout(() => {
      setSaved(false);
      setStep(1);
      setFlavor("");
      setSize("");
      setQty("");
      setDefects("0");
      setNotes("");
    }, 3000);
  };

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setEditQty(String(r.quantity));
    setEditDefects(String(r.defects || 0));
  };

  const saveEdit = async (id: string) => {
    const qtyNum = parseInt(editQty);
    const defNum = parseInt(editDefects) || 0;
    if (!qtyNum || qtyNum <= 0) return;
    if (defNum > qtyNum) {
      alert(`Брак (${defNum}) не может быть больше выпечено (${qtyNum})`);
      return;
    }
    setEditSaving(true);
    await supabase.from("berrycake_production").update({ quantity: qtyNum, defects: defNum }).eq("id", id);
    setEditingId(null);
    setEditSaving(false);
    fetchTodayLog();
    fetchFlavorBalance();
  };

  const todayTotal = todayLog.reduce((s, r) => s + (r.quantity || 0), 0);
  const todayDefects = todayLog.reduce((s, r) => s + (r.defects || 0), 0);
  const todayGood = todayTotal - todayDefects;
  const today = new Date().toISOString().slice(0, 10);
  const isToday = bakeDate === today;
  const dateLabel = isToday
    ? new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
    : new Date(bakeDate + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  const btnBase: React.CSSProperties = {
    border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif",
    transition: "all 0.15s", display: "inline-flex", alignItems: "center", justifyContent: "center",
  };

  if (!user) return null;

  return (
    <div style={{ backgroundColor: s.bg, minHeight: "100vh", color: s.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ backgroundColor: s.card, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: s.gold }}>
          <IconFactory />
          <span style={{ fontWeight: 700, fontSize: 18 }}>BerryCake — Цех</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: s.muted, fontSize: 13 }}>{user.name}</span>
          <button onClick={() => { localStorage.removeItem("bc_auth"); router.replace("/login"); }}
            style={{ ...btnBase, gap: 6, background: "none", border: `1px solid ${s.border}`, color: s.muted, padding: "6px 14px", borderRadius: 8, fontSize: 13 }}>
            <IconLogout /> Выйти
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 16px" }}>

        {/* Success screen */}
        {saved && (
          <div style={{ textAlign: "center", padding: "60px 0", animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><IconCheck /></div>
            <h2 style={{ color: s.gold, fontSize: 24, fontWeight: 700 }}>Записано!</h2>
            <p style={{ color: s.muted, fontSize: 14, marginTop: 8 }}>{flavor} {size} — {qty} шт выпечено</p>
            <p style={{ color: s.muted, fontSize: 12, marginTop: 4 }}>Форма сбросится через 3 сек...</p>
          </div>
        )}

        {!saved && (
          <>
            {/* Progress indicator */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}>
              {[1, 2].map((n) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: step >= n ? s.gold : s.card,
                    border: `2px solid ${step >= n ? s.gold : s.border}`,
                    color: step >= n ? "#ffffff" : s.muted,
                    fontWeight: 700, fontSize: 14,
                    cursor: n < step ? "pointer" : "default",
                  }} onClick={() => n < step && setStep(n)}>{n}</div>
                  {n < 2 && <div style={{ width: 40, height: 2, backgroundColor: step > n ? s.gold : s.border }} />}
                </div>
              ))}
            </div>

            {/* Date picker */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, backgroundColor: s.card, borderRadius: 10, padding: "10px 16px" }}>
              <span style={{ color: s.muted, fontSize: 13 }}>Дата выпечки:</span>
              <input
                type="date"
                value={bakeDate}
                max={today}
                onChange={(e) => setBakeDate(e.target.value)}
                style={{ border: "none", outline: "none", backgroundColor: "transparent", color: s.gold, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              />
              {!isToday && (
                <button onClick={() => setBakeDate(today)}
                  style={{ ...btnBase, background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>
                  Сегодня
                </button>
              )}
            </div>

            {/* STEP 1: Pick flavor */}
            {step === 1 && (
              <div>
                <h2 style={{ color: s.gold, fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>
                  Что выпекли? {dateLabel}
                </h2>
                {dbFlavors.length === 0 ? (
                  <div style={{ backgroundColor: s.card, borderRadius: 12, padding: 32, textAlign: "center", color: s.muted }}>
                    Загрузка вкусов...
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {dbFlavors.map((f) => {
                      const color = FLAVOR_COLORS[f] || s.gold;
                      const balance = Math.round(flavorTotalBalance(flavorBalance, f));
                      return (
                        <button key={f} onClick={() => { setFlavor(f); setStep(2); }}
                          style={{ ...btnBase, flexDirection: "column", backgroundColor: s.card,
                            border: `2px solid ${s.border}`, borderRadius: 16, padding: "24px 16px",
                            gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: color, opacity: 0.8 }} />
                          <div style={{ color, fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>{f}</div>
                          <div style={{ color: balance <= 0 ? "#e57373" : s.muted, fontSize: 11, fontWeight: 600 }}>
                            Остаток: {balance}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Quantities */}
            {step === 2 && (
              <div>
                <button onClick={() => { setStep(1); setSize(""); }}
                  style={{ ...btnBase, background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "6px 14px", fontSize: 13, marginBottom: 24 }}>
                  ← Назад
                </button>

                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: FLAVOR_COLORS[flavor] || s.gold, opacity: 0.85, margin: "0 auto 12px" }} />
                  <h2 style={{ color: FLAVOR_COLORS[flavor] || s.gold, fontSize: 22, fontWeight: 700 }}>{flavor}</h2>
                </div>

                <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 24 }}>
                  {/* Size */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 8, fontWeight: 600 }}>РАЗМЕР ЗАГОТОВКИ *</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {SIZES.map((sz) => {
                        const bal = Math.round(flavorBalance[flavorSizeKey(flavor, sz)] ?? 0);
                        const chosen = size === sz;
                        return (
                          <button key={sz} onClick={() => setSize(sz)}
                            style={{ ...btnBase, flex: 1, flexDirection: "column", padding: "12px 0", borderRadius: 10,
                              border: `2px solid ${chosen ? s.gold : s.border}`,
                              backgroundColor: chosen ? s.gold : s.bg,
                              color: chosen ? "#ffffff" : s.text }}>
                            <span style={{ fontWeight: 700, fontSize: 16 }}>{sz}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: chosen ? "#ffffffcc" : (bal <= 0 ? "#e57373" : s.muted) }}>
                              ост. {bal}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 8, fontWeight: 600 }}>ВЫПЕЧЕНО (шт) *</label>
                    <input
                      type="number" min="1" placeholder="0"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      autoFocus
                      inputMode="numeric"
                      style={{ width: "100%", backgroundColor: s.bg, border: `2px solid ${qty ? s.gold : s.border}`, borderRadius: 10, padding: "14px 16px", color: s.text, fontSize: 28, fontWeight: 700, textAlign: "center", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Defects */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 8, fontWeight: 600 }}>ИЗ НИХ БРАК (шт)</label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setDefects(String(n))}
                          style={{ ...btnBase, flex: 1, padding: "10px 0", borderRadius: 8, fontWeight: 700, fontSize: 14,
                            border: `1px solid ${defects === String(n) ? "#e57373" : s.border}`,
                            background: defects === String(n) ? "#e5737322" : "none",
                            color: defects === String(n) ? "#e57373" : s.muted }}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number" min="0" placeholder="Другое число брака..."
                      value={parseInt(defects) > 5 ? defects : ""}
                      onChange={(e) => setDefects(e.target.value || "0")}
                      inputMode="numeric"
                      style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 8, fontWeight: 600 }}>ЗАМЕТКИ (необязательно)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Особенности выпечки, причины брака..."
                      rows={2}
                      style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "10px 12px", color: s.text, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Summary preview */}
                  {qty && (
                    <div style={{ backgroundColor: s.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-around" }}>
                      {[
                        { label: "Выпечено", val: qty, color: s.gold },
                        { label: "Брак", val: defects, color: "#e57373" },
                        { label: "Годных", val: Math.max(0, parseInt(qty) - parseInt(defects || "0")), color: "#81c784" },
                      ].map((st) => (
                        <div key={st.label} style={{ textAlign: "center" }}>
                          <div style={{ color: s.muted, fontSize: 12 }}>{st.label}</div>
                          <div style={{ color: st.color, fontSize: 22, fontWeight: 700 }}>{st.val}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={save} disabled={saving || !size || !qty || parseInt(qty) <= 0}
                    style={{ ...btnBase, width: "100%", padding: "14px", borderRadius: 10,
                      backgroundColor: (saving || !size || !qty || parseInt(qty) <= 0) ? s.border : s.gold,
                      color: (saving || !size || !qty || parseInt(qty) <= 0) ? s.muted : "#ffffff",
                      fontWeight: 700, fontSize: 16 }}>
                    {saving ? "Сохранение..." : "Записать"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Today's log */}
        {!saved && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 16 }}>Выпечка — {dateLabel}</h3>

            {/* Summary */}
            {todayTotal > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Выпечено", val: todayTotal, color: s.gold },
                  { label: "Годных", val: todayGood, color: "#81c784" },
                  { label: "Брак", val: todayDefects, color: "#e57373" },
                ].map((st) => (
                  <div key={st.label} style={{ backgroundColor: s.card, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ color: s.muted, fontSize: 12, marginBottom: 4 }}>{st.label}</div>
                    <div style={{ color: st.color, fontSize: 24, fontWeight: 700 }}>{st.val}</div>
                  </div>
                ))}
              </div>
            )}

            {loadingLog ? (
              /* Skeleton */
              [1, 2, 3].map((i) => (
                <div key={i} style={{ backgroundColor: s.card, borderRadius: 10, padding: "14px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ width: 80, height: 14, backgroundColor: s.border, borderRadius: 6 }} />
                  <div style={{ width: 40, height: 14, backgroundColor: s.border, borderRadius: 6 }} />
                </div>
              ))
            ) : todayLog.length === 0 ? (
              <div style={{ backgroundColor: s.card, borderRadius: 10, padding: 24, textAlign: "center", color: s.muted, fontSize: 13 }}>
                Записей нет. Выберите вкус выше, чтобы добавить.
              </div>
            ) : (
              todayLog.map((r) => (
                <div key={r.id} style={{ backgroundColor: s.card, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
                  {editingId === r.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ color: FLAVOR_COLORS[r.flavor] || s.gold, fontWeight: 700, fontSize: 14, flex: "0 0 auto" }}>{r.flavor} {r.size}</div>
                      <input
                        type="number" min="1" value={editQty} onChange={(e) => setEditQty(e.target.value)}
                        inputMode="numeric"
                        style={{ width: 70, backgroundColor: s.bg, border: `1px solid ${s.gold}`, borderRadius: 6, padding: "4px 8px", color: s.text, fontSize: 14, outline: "none", textAlign: "center" }}
                      />
                      <span style={{ color: s.muted, fontSize: 12 }}>брак</span>
                      <input
                        type="number" min="0" value={editDefects} onChange={(e) => setEditDefects(e.target.value)}
                        inputMode="numeric"
                        style={{ width: 60, backgroundColor: s.bg, border: `1px solid #e57373`, borderRadius: 6, padding: "4px 8px", color: "#e57373", fontSize: 14, outline: "none", textAlign: "center" }}
                      />
                      <button onClick={() => saveEdit(r.id)} disabled={editSaving}
                        style={{ ...btnBase, backgroundColor: s.gold, color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600 }}>
                        {editSaving ? "..." : "Сохранить"}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        style={{ ...btnBase, background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "5px 10px", fontSize: 12 }}>
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ color: FLAVOR_COLORS[r.flavor] || s.gold, fontWeight: 700, fontSize: 14 }}>{r.flavor} {r.size}</div>
                        {r.notes && <div style={{ color: s.muted, fontSize: 12, marginTop: 2 }}>{r.notes}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: s.muted, fontSize: 12 }}>выпечено</div>
                          <div style={{ color: s.gold, fontWeight: 700 }}>{r.quantity}</div>
                        </div>
                        {r.defects > 0 && (
                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: s.muted, fontSize: 12 }}>брак</div>
                            <div style={{ color: "#e57373", fontWeight: 700 }}>{r.defects}</div>
                          </div>
                        )}
                        <button onClick={() => startEdit(r)}
                          style={{ ...btnBase, background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "6px 10px" }}>
                          <IconEdit />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
