"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const s = { bg: "#f5f5f3", card: "#ffffff", gold: "#111827", text: "#111827", muted: "#6b7280", border: "#e5e7eb" };
const FLAVORS = ["ВУПИ", "МОЛОЧКА", "ЯГОДНЫЙ", "НУТЕЛЛА", "СНИКЕРС", "СГУЩЕНКА ОРЕХ"];
const FLAVOR_COLORS: Record<string, string> = {
  "ВУПИ": "#f06292", "МОЛОЧКА": "#64b5f6", "ЯГОДНЫЙ": "#81c784",
  "НУТЕЛЛА": "#a1887f", "СНИКЕРС": "#ffb74d", "СГУЩЕНКА ОРЕХ": "#e57373",
};

export default function ProductionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [flavor, setFlavor] = useState("");
  const [qty, setQty] = useState("");
  const [defects, setDefects] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [todayLog, setTodayLog] = useState<any[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("bc_auth");
    if (!auth) { router.replace("/login"); return; }
    setUser(JSON.parse(auth));
    fetchTodayLog();
  }, []);

  const fetchTodayLog = async () => {
    setLoadingLog(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("berrycake_production")
      .select("*")
      .eq("bake_date", today)
      .order("created_at", { ascending: false });
    if (data) setTodayLog(data);
    setLoadingLog(false);
  };

  const save = async () => {
    if (!qty || parseInt(qty) <= 0) return;
    setSaving(true);
    const auth = JSON.parse(localStorage.getItem("bc_auth") || "{}");
    await supabase.from("berrycake_production").insert({
      bake_date: new Date().toISOString().slice(0, 10),
      flavor,
      quantity: parseInt(qty),
      defects: parseInt(defects) || 0,
      baker_name: auth.name || "Пекарь",
      notes: notes || null,
    });
    setSaving(false);
    setSaved(true);
    fetchTodayLog();
    setTimeout(() => {
      setSaved(false);
      setStep(1);
      setFlavor("");
      setQty("");
      setDefects("0");
      setNotes("");
    }, 2000);
  };

  const todayTotal = todayLog.reduce((s, r) => s + (r.quantity || 0), 0);
  const todayDefects = todayLog.reduce((s, r) => s + (r.defects || 0), 0);
  const todayGood = todayTotal - todayDefects;
  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  if (!user) return null;

  return (
    <div style={{ backgroundColor: s.bg, minHeight: "100vh", color: s.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ backgroundColor: s.card, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>🏭</span>
          <span style={{ color: s.gold, fontWeight: 700, fontSize: 18 }}>BerryCake — Цех</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: s.muted, fontSize: 13 }}>{user.name}</span>
          <button onClick={() => { localStorage.removeItem("bc_auth"); router.replace("/login"); }}
            style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
            Выйти
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 16px" }}>

        {/* Success screen */}
        {saved && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: s.gold, fontSize: 24, fontWeight: 700 }}>Записано!</h2>
            <p style={{ color: s.muted, fontSize: 14, marginTop: 8 }}>{flavor} — {qty} шт выпечено</p>
          </div>
        )}

        {!saved && (
          <>
            {/* Progress indicator */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 }}>
              {[1, 2].map((n) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: step >= n ? s.gold : s.card,
                    border: `2px solid ${step >= n ? s.gold : s.border}`,
                    color: step >= n ? "#ffffff" : s.muted,
                    fontWeight: 700, fontSize: 14,
                  }}>{n}</div>
                  {n < 2 && <div style={{ width: 40, height: 2, backgroundColor: step > n ? s.gold : s.border }} />}
                </div>
              ))}
            </div>

            {/* STEP 1: Pick flavor */}
            {step === 1 && (
              <div>
                <h2 style={{ color: s.gold, fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>
                  Что выпекли? {today}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {FLAVORS.map((f) => {
                    const color = FLAVOR_COLORS[f] || s.gold;
                    return (
                      <button key={f} onClick={() => { setFlavor(f); setStep(2); }}
                        style={{
                          backgroundColor: s.card,
                          border: `2px solid ${s.border}`,
                          borderRadius: 16, padding: "28px 16px",
                          cursor: "pointer", textAlign: "center",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-2px)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.transform = "none"; }}>
                        <div style={{ fontSize: 28, marginBottom: 10 }}>🧁</div>
                        <div style={{ color: color, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>{f}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Quantities */}
            {step === 2 && (
              <div>
                <button onClick={() => setStep(1)}
                  style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, marginBottom: 24 }}>
                  ← Назад
                </button>

                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🧁</div>
                  <h2 style={{ color: FLAVOR_COLORS[flavor] || s.gold, fontSize: 22, fontWeight: 700 }}>{flavor}</h2>
                </div>

                <div style={{ backgroundColor: s.card, borderRadius: 16, padding: 24 }}>
                  {/* Quantity */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 8 }}>ВЫПЕЧЕНО (шт) *</label>
                    <input
                      type="number" min="0" placeholder="0"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      autoFocus
                      style={{ width: "100%", backgroundColor: s.bg, border: `2px solid ${qty ? s.gold : s.border}`, borderRadius: 10, padding: "14px 16px", color: s.text, fontSize: 28, fontWeight: 700, textAlign: "center", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Defects */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 8 }}>ИЗ НИХ БРАК (шт)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setDefects(String(n))}
                          style={{
                            flex: 1, padding: "10px 0", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14,
                            border: `1px solid ${defects === String(n) ? "#e57373" : s.border}`,
                            background: defects === String(n) ? "#e5737322" : "none",
                            color: defects === String(n) ? "#e57373" : s.muted,
                          }}>{n}</button>
                      ))}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="number" min="0" placeholder="или введите вручную"
                        value={parseInt(defects) > 5 ? defects : ""}
                        onChange={(e) => setDefects(e.target.value || "0")}
                        style={{ width: "100%", backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "8px 12px", color: s.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ color: s.muted, fontSize: 12, display: "block", marginBottom: 8 }}>ЗАМЕТКИ (необязательно)</label>
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
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: s.muted, fontSize: 11 }}>Выпечено</div>
                        <div style={{ color: s.gold, fontSize: 22, fontWeight: 700 }}>{qty}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: s.muted, fontSize: 11 }}>Брак</div>
                        <div style={{ color: "#e57373", fontSize: 22, fontWeight: 700 }}>{defects}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: s.muted, fontSize: 11 }}>Годных</div>
                        <div style={{ color: "#81c784", fontSize: 22, fontWeight: 700 }}>{Math.max(0, parseInt(qty) - parseInt(defects || "0"))}</div>
                      </div>
                    </div>
                  )}

                  <button onClick={save} disabled={saving || !qty || parseInt(qty) <= 0}
                    style={{
                      width: "100%", padding: "14px", borderRadius: 10, border: "none", cursor: "pointer",
                      backgroundColor: (saving || !qty || parseInt(qty) <= 0) ? s.border : s.gold,
                      color: (saving || !qty || parseInt(qty) <= 0) ? s.muted : "#ffffff",
                      fontWeight: 700, fontSize: 16,
                    }}>
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
            <h3 style={{ color: s.gold, fontSize: 14, marginBottom: 16 }}>Выпечка сегодня — {today}</h3>

            {/* Summary */}
            {todayTotal > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Выпечено", val: todayTotal, color: s.gold },
                  { label: "Годных", val: todayGood, color: "#81c784" },
                  { label: "Брак", val: todayDefects, color: "#e57373" },
                ].map((st) => (
                  <div key={st.label} style={{ backgroundColor: s.card, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ color: s.muted, fontSize: 11, marginBottom: 4 }}>{st.label}</div>
                    <div style={{ color: st.color, fontSize: 24, fontWeight: 700 }}>{st.val}</div>
                  </div>
                ))}
              </div>
            )}

            {loadingLog
              ? <div style={{ color: s.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Загрузка...</div>
              : todayLog.length === 0
                ? <div style={{ backgroundColor: s.card, borderRadius: 10, padding: 24, textAlign: "center", color: s.muted, fontSize: 13 }}>
                    Записей пока нет. Нажмите кнопку вкуса выше, чтобы добавить первую.
                  </div>
                : todayLog.map((r) => (
                    <div key={r.id} style={{ backgroundColor: s.card, borderRadius: 10, padding: "14px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ color: FLAVOR_COLORS[r.flavor] || s.gold, fontWeight: 700, fontSize: 14 }}>{r.flavor}</div>
                        {r.notes && <div style={{ color: s.muted, fontSize: 12, marginTop: 2 }}>{r.notes}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 16, textAlign: "right" }}>
                        <div>
                          <div style={{ color: s.muted, fontSize: 10 }}>выпечено</div>
                          <div style={{ color: s.gold, fontWeight: 700 }}>{r.quantity}</div>
                        </div>
                        {r.defects > 0 && (
                          <div>
                            <div style={{ color: s.muted, fontSize: 10 }}>брак</div>
                            <div style={{ color: "#e57373", fontWeight: 700 }}>{r.defects}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
