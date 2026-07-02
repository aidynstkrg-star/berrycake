"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const s = { bg: "#0f0e0c", card: "#1a1815", gold: "#c8a96e", text: "#f5f0e8", muted: "#888", border: "#2a2825" };

const SECTIONS = [
  { key: "cashier",    label: "КАССА",       icon: "🧾", digits: 4, hint: "Менеджер цеха" },
  { key: "management", label: "РУКОВОДСТВО", icon: "📊", digits: 6, hint: "Руководство" },
  { key: "production", label: "ПРОИЗВОДСТВО", icon: "🏭", digits: 4, hint: "Производство" },
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
        const dest = data.role === "Менеджер цеха" ? "/cashier" : "/dashboard";
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
      <div style={{ minHeight: "100vh", backgroundColor: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>👋</div>
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
      <div style={{ minHeight: "100vh", backgroundColor: s.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: 24 }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🍰</div>
        <h1 style={{ color: s.gold, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>BerryCake</h1>
        <p style={{ color: s.muted, fontSize: 14, marginBottom: 48 }}>Выберите раздел для входа</p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 560 }}>
          {SECTIONS.map((sec) => (
            <button key={sec.key} onClick={() => selectSection(sec)}
              style={{
                flex: "1 1 140px", maxWidth: 180,
                backgroundColor: s.card, border: `2px solid ${s.border}`,
                borderRadius: 20, padding: "36px 20px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = s.gold; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.transform = "none"; }}>
              <span style={{ fontSize: 36 }}>{sec.icon}</span>
              <span style={{ color: s.text, fontWeight: 700, fontSize: 13, letterSpacing: 1.5 }}>{sec.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // PIN entry
  return (
    <div style={{ minHeight: "100vh", backgroundColor: s.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <button onClick={() => { setSection(null); setPin([]); setError(""); }}
        style={{ position: "absolute", top: 24, left: 24, background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>
        ← Назад
      </button>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{section.icon}</div>
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
