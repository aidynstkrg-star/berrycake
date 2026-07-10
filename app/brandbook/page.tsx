"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const s = { bg: "#FAF6F1", card: "#ffffff", gold: "#8C1B3B", text: "#3E2723", muted: "#9E8070", border: "#E2CEB8" };
const serif = "'Cormorant Garamond', Georgia, serif";
const sans = "'Jost', 'Inter', sans-serif";

const COLORS = [
  { name: "Berry",   hex: "#8C1B3B", role: "Главный",   usage: "Кнопки, логотип, акценты" },
  { name: "Caramel", hex: "#C9845A", role: "Акцент",    usage: "Иконки, hover, вторичные" },
  { name: "Sage",    hex: "#7A9E88", role: "Свежесть",  usage: "Успех, статус «Готов»" },
  { name: "Cream",   hex: "#F2E0C8", role: "Вторичный", usage: "Фоны карточек, выделения" },
  { name: "Cocoa",   hex: "#3E2723", role: "Текст",     usage: "Основной текст, заголовки" },
  { name: "Milk",    hex: "#FAF6F1", role: "Фон",       usage: "Фон страниц" },
  { name: "Latte",   hex: "#E2CEB8", role: "Граница",   usage: "Разделители, обводки" },
];

const TYPOGRAPHY = [
  { name: "Display", font: serif, size: "48px", weight: "300", sample: "Торты с душой", style: "italic" },
  { name: "Heading 1", font: serif, size: "34px", weight: "400", sample: "Сделано с любовью" },
  { name: "Heading 2", font: serif, size: "24px", weight: "600", sample: "Новые заказы на июль" },
  { name: "Body", font: sans, size: "15px", weight: "400", sample: "Каждый торт — уникальное произведение. Мы используем только натуральные ингредиенты." },
  { name: "Label", font: sans, size: "11px", weight: "600", sample: "СТАТУС · СУММА · ДАТА", caps: true },
  { name: "Numbers", font: serif, size: "40px", weight: "700", sample: "1 247 500 ₸" },
];

export default function BrandbookPage() {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("bc_auth");
    if (!auth) { router.replace("/login"); return; }
    const { role } = JSON.parse(auth);
    if (role !== "admin" && role !== "manager") router.replace("/dashboard");
  }, []);

  const copy = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div style={{ backgroundColor: s.bg, minHeight: "100vh", fontFamily: sans, color: s.text }}>
      {/* Header */}
      <div style={{ backgroundColor: s.card, borderBottom: `1px solid ${s.border}`, padding: "0 28px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            ← Назад
          </button>
          <span style={{ color: s.border, fontSize: 18, margin: "0 4px" }}>|</span>
          <span style={{ fontFamily: serif, fontSize: 20, color: s.gold, fontWeight: 600 }}>Брендбук BerryCake</span>
        </div>
        <span style={{ fontSize: 12, color: s.muted, letterSpacing: "1px" }}>2025</span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* ── COVER ── */}
        <div style={{ background: s.gold, borderRadius: 24, padding: "60px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 56, gap: 32, flexWrap: "wrap" as const }}>
          <div>
            <p style={{ color: "rgba(242,224,200,0.6)", fontSize: 11, letterSpacing: "3px", textTransform: "uppercase" as const, marginBottom: 12, fontFamily: sans }}>Brand Identity Guidelines</p>
            <h1 style={{ fontFamily: serif, fontSize: 60, fontWeight: 300, color: "#F2E0C8", lineHeight: 1.05, margin: 0 }}>
              Berry<span style={{ fontWeight: 600 }}>Cake</span>
            </h1>
            <p style={{ color: "rgba(242,224,200,0.5)", fontSize: 13, marginTop: 12, fontFamily: sans }}>Торты ручной работы · Алматы</p>
          </div>
          <svg width="140" height="140" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="80" cy="80" r="74" stroke="rgba(242,224,200,0.2)" strokeWidth="1"/>
            <rect x="42" y="100" width="76" height="18" rx="6" fill="#F2E0C8"/>
            <rect x="50" y="82" width="60" height="20" rx="5" fill="#E8C9A0"/>
            <rect x="58" y="66" width="44" height="18" rx="4" fill="#F2E0C8"/>
            <path d="M50 82 Q46 90 44 98" stroke="#F2E0C8" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <path d="M110 82 Q112 90 114 96" stroke="#F2E0C8" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <circle cx="68" cy="60" r="6" fill="#8C1B3B" opacity="0.85"/>
            <circle cx="80" cy="57" r="7" fill="#3E2723"/>
            <circle cx="92" cy="60" r="6" fill="#8C1B3B" opacity="0.7"/>
            <circle cx="78" cy="55" r="2" fill="rgba(255,255,255,0.5)"/>
            <rect x="78" y="50" width="4" height="14" rx="2" fill="#E8C9A0"/>
            <ellipse cx="80" cy="47" rx="2" ry="3" fill="#FAF6F1" opacity="0.9"/>
            <path d="M88 56 Q94 50 96 54 Q90 58 88 56Z" fill="#7A9E88"/>
            <path d="M72 56 Q66 50 64 54 Q70 58 72 56Z" fill="#7A9E88" opacity="0.75"/>
          </svg>
        </div>

        {/* ── 01 LOGO ── */}
        <SectionLabel n="01" label="Логотип" />
        <h2 style={{ fontFamily: serif, fontSize: 32, fontWeight: 400, marginBottom: 24 }}>Знак и версии</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 56 }}>
          {[
            { bg: "#FAF6F1", border: s.border, label: "Светлый фон", textColor: s.text, subColor: s.muted, accentColor: s.gold },
            { bg: "#3E2723", border: "transparent", label: "Тёмный фон", textColor: "#F2E0C8", subColor: "rgba(242,224,200,0.4)", accentColor: "#C9845A" },
            { bg: "#8C1B3B", border: "transparent", label: "Фирменный", textColor: "#F2E0C8", subColor: "rgba(242,224,200,0.4)", accentColor: "#F2E0C8" },
          ].map((v) => (
            <div key={v.label} style={{ background: v.bg, border: `1px solid ${v.border}`, borderRadius: 16, padding: "32px 20px", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14 }}>
              <LogoMark bg={v.bg} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: v.textColor }}>Berry<span style={{ fontWeight: 600, color: v.accentColor }}>Cake</span></div>
                <div style={{ fontSize: 8, letterSpacing: "3px", color: v.subColor, textTransform: "uppercase" as const, marginTop: 3 }}>Торты ручной работы</div>
              </div>
              <div style={{ fontSize: 11, color: v.subColor, letterSpacing: "1.5px", textTransform: "uppercase" as const }}>{v.label}</div>
            </div>
          ))}
        </div>

        {/* ── 02 COLORS ── */}
        <SectionLabel n="02" label="Цвета" />
        <h2 style={{ fontFamily: serif, fontSize: 32, fontWeight: 400, marginBottom: 24 }}>Цветовая палитра</h2>
        <p style={{ color: s.muted, fontSize: 13, marginBottom: 24 }}>Нажмите на карточку, чтобы скопировать HEX-код.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
          {COLORS.slice(0, 4).map((c) => (
            <ColorCard key={c.hex} {...c} copied={copied} onCopy={copy} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 56 }}>
          {COLORS.slice(4).map((c) => (
            <ColorCard key={c.hex} {...c} copied={copied} onCopy={copy} />
          ))}
        </div>

        {/* ── 03 TYPOGRAPHY ── */}
        <SectionLabel n="03" label="Типографика" />
        <h2 style={{ fontFamily: serif, fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Шрифтовая система</h2>
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" as const }}>
          <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, padding: "12px 20px" }}>
            <div style={{ fontSize: 10, color: s.muted, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 4 }}>Display / Heading</div>
            <div style={{ fontFamily: serif, fontSize: 18, color: s.text }}>Cormorant Garamond</div>
          </div>
          <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, padding: "12px 20px" }}>
            <div style={{ fontSize: 10, color: s.muted, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 4 }}>Body / UI</div>
            <div style={{ fontFamily: sans, fontSize: 18, color: s.text }}>Jost</div>
          </div>
        </div>

        <div style={{ background: s.card, borderRadius: 16, overflow: "hidden", border: `1px solid ${s.border}`, marginBottom: 56 }}>
          {TYPOGRAPHY.map((t, i) => (
            <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 24, padding: "20px 24px", borderBottom: i < TYPOGRAPHY.length - 1 ? `1px solid ${s.border}` : "none" }}>
              <div style={{ width: 110, flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: s.text, marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 10, color: s.muted }}>{t.size} · {t.weight}</div>
              </div>
              <div style={{ fontFamily: t.font, fontSize: t.size, fontWeight: t.weight, fontStyle: t.style || "normal", letterSpacing: t.caps ? "3px" : undefined, textTransform: t.caps ? "uppercase" as const : undefined, color: t.name === "Numbers" ? s.gold : s.text, lineHeight: 1.3 }}>
                {t.sample}
              </div>
            </div>
          ))}
        </div>

        {/* ── 04 DO / DON'T ── */}
        <SectionLabel n="04" label="Правила" />
        <h2 style={{ fontFamily: serif, fontSize: 32, fontWeight: 400, marginBottom: 24 }}>Как использовать бренд</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 56 }}>
          <div style={{ background: "#F2E0C8", borderRadius: 20, padding: "28px 24px", position: "relative" as const }}>
            <span style={{ position: "absolute" as const, top: 16, right: 16, background: "#7A9E88", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "2px", padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" as const }}>Верно</span>
            <h4 style={{ fontFamily: serif, fontSize: 20, marginBottom: 14, color: s.text }}>Делай так</h4>
            {["Berry (#8C1B3B) — главная кнопка действия", "Cormorant для заголовков, Jost для тела", "Фон Milk (#FAF6F1) для страниц", "SVG-иконки, не эмодзи", "Числа и суммы — Cormorant Bold", "Тёплые нейтральные (Cocoa, Latte)"].map(t => (
              <div key={t} style={{ fontSize: 13, color: "#5D4037", marginBottom: 7, paddingLeft: 16, position: "relative" as const }}>
                <span style={{ position: "absolute" as const, left: 0, color: "#C9845A" }}>—</span>{t}
              </div>
            ))}
          </div>
          <div style={{ background: "#FDF3F3", border: "2px solid #EDCECE", borderRadius: 20, padding: "28px 24px", position: "relative" as const }}>
            <span style={{ position: "absolute" as const, top: 16, right: 16, background: "#C0504D", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "2px", padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" as const }}>Нельзя</span>
            <h4 style={{ fontFamily: serif, fontSize: 20, marginBottom: 14, color: s.text }}>Не делай так</h4>
            {["Серый #111827 как главный цвет", "Эмодзи 🍰 вместо логотипа", "Чистый белый #fff как фон страницы", "Растягивать или искажать логотип", "Разные оттенки серого без системы", "Berry на Cream — плохой контраст"].map(t => (
              <div key={t} style={{ fontSize: 13, color: "#5D4037", marginBottom: 7, paddingLeft: 16, position: "relative" as const }}>
                <span style={{ position: "absolute" as const, left: 0, color: "#C0504D" }}>—</span>{t}
              </div>
            ))}
          </div>
        </div>

        {/* ── 05 VOICE ── */}
        <SectionLabel n="05" label="Голос" />
        <h2 style={{ fontFamily: serif, fontSize: 32, fontWeight: 400, marginBottom: 24 }}>Тон и характер</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 56 }}>
          {[
            { title: "Тёплая", color: "#8C1B3B", text: "Говорим как близкий человек, не как компания. Искренне, без канцелярита." },
            { title: "Уверенная", color: "#C9845A", text: "Знаем своё дело. Не заискиваем — предлагаем качество и стоим за него." },
            { title: "Живая", color: "#7A9E88", text: "Используем конкретику: «3 яруса», «свежая малина», «готов в пятницу»." },
          ].map((v) => (
            <div key={v.title} style={{ background: s.card, borderRadius: 16, padding: 24, borderTop: `3px solid ${v.color}` }}>
              <div style={{ fontFamily: serif, fontSize: 20, color: v.color, marginBottom: 8 }}>{v.title}</div>
              <div style={{ fontSize: 13, color: s.muted, lineHeight: 1.7 }}>{v.text}</div>
            </div>
          ))}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ textAlign: "center", padding: "48px 24px", background: "#F2E0C8", borderRadius: 20 }}>
          <p style={{ fontFamily: serif, fontSize: 36, fontWeight: 300, color: s.text, lineHeight: 1.4 }}>
            Каждый торт — это <em style={{ fontStyle: "italic", color: s.gold }}>момент,</em><br />который остаётся навсегда.
          </p>
          <p style={{ fontSize: 12, color: s.muted, letterSpacing: "2px", textTransform: "uppercase" as const, marginTop: 20 }}>
            BerryCake · Алматы · 2025
          </p>
        </div>

      </div>
    </div>
  );
}

function SectionLabel({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 28, height: 1, background: "#8C1B3B" }} />
      <span style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase" as const, color: "#8C1B3B", fontWeight: 600 }}>
        {n} — {label}
      </span>
    </div>
  );
}

function LogoMark({ bg }: { bg: string }) {
  const isDark = bg === "#3E2723" || bg === "#8C1B3B";
  const cakeColor = isDark ? "#F2E0C8" : "#8C1B3B";
  const layerColor = isDark ? "rgba(242,224,200,0.55)" : "#C9845A";
  const berryColor = isDark ? "#C9845A" : "#8C1B3B";
  return (
    <svg width="72" height="72" viewBox="0 0 80 80" fill="none">
      <rect x="12" y="52" width="56" height="14" rx="4" fill={cakeColor} opacity="0.9"/>
      <rect x="18" y="38" width="44" height="16" rx="3.5" fill={layerColor}/>
      <rect x="24" y="26" width="32" height="14" rx="3" fill={cakeColor} opacity="0.7"/>
      <circle cx="34" cy="22" r="4.5" fill={berryColor}/>
      <circle cx="40" cy="19" r="5.5" fill={berryColor}/>
      <circle cx="46" cy="22" r="4.5" fill={berryColor} opacity="0.75"/>
      <circle cx="38.5" cy="18" r="1.5" fill="rgba(255,255,255,0.5)"/>
      <rect x="38" y="12" width="4" height="10" rx="2" fill={layerColor} opacity="0.8"/>
      <path d="M46 21 Q51 15 53 19 Q48 23 46 21Z" fill="#7A9E88"/>
      <path d="M34 21 Q29 15 27 19 Q32 23 34 21Z" fill="#7A9E88" opacity="0.8"/>
    </svg>
  );
}

function ColorCard({ name, hex, role, usage, copied, onCopy }: { name: string; hex: string; role: string; usage: string; copied: string | null; onCopy: (h: string) => void }) {
  const isCopied = copied === hex;
  const isLight = hex === "#FAF6F1" || hex === "#F2E0C8" || hex === "#E2CEB8";
  return (
    <div onClick={() => onCopy(hex)} style={{ borderRadius: 14, overflow: "hidden", cursor: "pointer", border: isLight ? "1px solid #E2CEB8" : "none", transition: "transform 0.15s", boxShadow: "0 2px 8px rgba(62,39,35,0.07)" }}
      onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "none")}>
      <div style={{ height: 80, background: hex, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isCopied && <span style={{ background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>Скопировано!</span>}
      </div>
      <div style={{ padding: "10px 12px", background: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#3E2723", marginBottom: 1 }}>{name}</div>
        <div style={{ fontSize: 10, color: "#9E8070", fontFamily: "monospace", marginBottom: 3 }}>{hex}</div>
        <div style={{ fontSize: 9, color: "#8C1B3B", textTransform: "uppercase" as const, letterSpacing: "1px", fontWeight: 600 }}>{role}</div>
        <div style={{ fontSize: 10, color: "#9E8070", marginTop: 3, lineHeight: 1.4 }}>{usage}</div>
      </div>
    </div>
  );
}
