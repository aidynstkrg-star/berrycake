"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("bc_auth")) {
      router.replace("/dashboard");
    }
    inputs.current[0]?.focus();
  }, []);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...pin];
    next[i] = val;
    setPin(next);
    setError("");
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.every((d) => d !== "") && next.join("").length === 6) {
      submit(next.join(""));
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !pin[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const submit = async (code) => {
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
        setTimeout(() => router.replace(dest), 1800);
      } else {
        setError("Неверный PIN-код");
        setPin(["", "", "", "", "", ""]);
        setTimeout(() => inputs.current[0]?.focus(), 50);
      }
    } finally {
      setLoading(false);
    }
  };

  if (welcome) {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: "#0f0e0c", display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: "sans-serif",
      }}>
        <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>👋</div>
          <h2 style={{ color: "#c8a96e", fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>
            Добро пожаловать,
          </h2>
          <h1 style={{ color: "#f5f0e8", fontSize: "36px", fontWeight: 800 }}>{welcome}!</h1>
        </div>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#0f0e0c", display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>🍰</div>
        <h1 style={{ color: "#c8a96e", fontSize: "22px", marginBottom: "4px", fontWeight: 700 }}>BerryCake</h1>
        <p style={{ color: "#888", fontSize: "14px", marginBottom: "40px" }}>Введите PIN-код для входа</p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "24px" }}>
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                width: "48px", height: "56px", textAlign: "center", fontSize: "24px",
                backgroundColor: "#1a1815", border: `2px solid ${digit ? "#c8a96e" : "#333"}`,
                borderRadius: "10px", color: "#f5f0e8", outline: "none",
                transition: "border-color 0.15s",
              }}
            />
          ))}
        </div>

        {error && <p style={{ color: "#e57373", fontSize: "14px", marginBottom: "16px" }}>{error}</p>}
        {loading && <p style={{ color: "#888", fontSize: "13px" }}>Проверка...</p>}
      </div>
    </div>
  );
}
