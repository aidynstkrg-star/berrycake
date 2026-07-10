"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const s = { bg: "#FAF6F1", card: "#ffffff", gold: "#8C1B3B", text: "#3E2723", muted: "#9E8070", border: "#E2CEB8" };

const IconCashier = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
    <path d="M7 8h.01M12 8h.01M17 8h.01M7 12h.01M12 12h.01M17 12h.01"/>
  </svg>
);
const IconDashboard = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconFactory = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h20"/>
    <path d="M7 20V8l5 4V8l5 4V4"/>
    <path d="M2 20V12l5-4"/>
  </svg>
);
const IconCake = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/>
    <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/>
    <path d="M2 21h20"/>
    <path d="M7 8v2M12 8v2M17 8v2"/>
    <path d="M7 4h.01M12 4h.01M17 4h.01"/>
  </svg>
);

const SECTIONS = [
  { key: "cashier",    label: "КАССА",       Icon: IconCashier,   digits: 4, hint: "Менеджер цеха" },
  { key: "management", label: "РУКОВОДСТВО", Icon: IconDashboard, digits: 6, hint: "Руководство" },
  { key: "production", label: "ПРОИЗВОДСТВО", Icon: IconFactory,  digits: 4, hint: "Производство" },
];

export default function LoginPage() {
  const router = useRouter();
  const [section, setSection] = useState<typeof SECTIONS[0] | null>(null);
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("bc_auth")) {
      const { role } = JSON.parse(localStorage.getItem("bc_auth")!);
      router.replace(role === "Менеджер цеха" ? "/cashier" : "/dashboard");
    }
  }, []);

  const selectSection = (sec: typeof SECTIONS[0]) => {
    setSection(sec);
    setPin(Array(sec.digits).fill(""));
    setError("");
    setTimeout(() => inputs.current[0]?.focus(), 50);
  };

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...pin];
    next[i] = val;
    setPin(next);
    setError("");
    if (val && i < pin.length - 1) inputs.current[i + 1]?.focus();
    if (next.every((d) => d !== "") && next.join("").length === pin.length) {
      submit(next.join(""));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
    if (e.key === "Escape") {
      setSection(null);
      setPin([]);
      setError("");
    }
  };

  const submit = async (code: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/check-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: code }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("bc_auth", JSON.stringify({ name: data.name, role: data.role }));
        setWelcome(data.name);
        const dest = data.role === "Менеджер цеха" ? "/cashier" : data.role === "Пекарь" ? "/production" : "/dashboard";
        setTimeout(() => router.replace(dest), 1600);
      } else {
        setError("Неверный PIN-код");
        setPin(Array(section!.digits).fill(""));
        setTimeout(() => inputs.current[0]?.focus(), 50);
      }
    } finally {
      setLoading(false);
    }
  };

  // Welcome screen
  if (welcome) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease" }}>
          <div style={{ color: s.gold, marginBottom: 16, display: "flex", justifyContent: "center" }}>
            <IconCake />
          </div>
          <h2 style={{ color: s.gold, fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Добро пожаловать,</h2>
          <h1 style={{ color: s.text, fontSize: 36, fontWeight: 800 }}>{welcome}!</h1>
        </div>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    );
  }

  // Section select
  if (!section) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: s.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', -apple-system, sans-serif", padding: 24 }}>
        <div style={{ color: s.gold, marginBottom: 12, display: "flex" }}>
          <IconCake />
        </div>
        <h1 style={{ color: s.gold, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>BerryCake</h1>
        <p style={{ color: s.muted, fontSize: 14, marginBottom: 48 }}>Выберите раздел для входа</p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 560 }}>
          {SECTIONS.map((sec) => (
            <button key={sec.key} onClick={() => selectSection(sec)}
              style={{
                flex: "1 1 140px", maxWidth: 180,
                backgroundColor: s.card, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #f0f0ee",
                borderRadius: 20, padding: "36px 20px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = s.gold; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#f0f0ee"; e.currentTarget.style.transform = "none"; }}>
              <span style={{ color: s.text }}><sec.Icon /></span>
              <span style={{ color: s.text, fontWeight: 700, fontSize: 13, letterSpacing: 1.5 }}>{sec.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // PIN entry
  const SectionIcon = section.Icon;
  return (
    <div style={{ minHeight: "100vh", backgroundColor: s.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <button onClick={() => { setSection(null); setPin([]); setError(""); }}
        style={{ position: "absolute", top: 24, left: 24, background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>
        ← Назад
      </button>

      <div style={{ textAlign: "center" }}>
        <div style={{ color: s.gold, marginBottom: 8, display: "flex", justifyContent: "center" }}><SectionIcon /></div>
        <h2 style={{ color: s.gold, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{section.label}</h2>
        <p style={{ color: s.muted, fontSize: 13, marginBottom: 36 }}>Введите {section.digits}-значный PIN-код</p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 }}>
          {pin.map((digit, i) => (
            <input key={i} ref={(el) => { inputs.current[i] = el; }}
              type="password" inputMode="numeric" maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                width: 52, height: 60, textAlign: "center", fontSize: 24,
                backgroundColor: s.card, border: `2px solid ${digit ? s.gold : s.border}`,
                borderRadius: 12, color: s.text, outline: "none", transition: "border-color 0.15s",
              }} />
          ))}
        </div>

        {error && <p style={{ color: "#e57373", fontSize: 14, marginBottom: 12 }}>{error}</p>}
        {loading && <p style={{ color: s.muted, fontSize: 13 }}>Проверка...</p>}
      </div>
    </div>
  );
}
