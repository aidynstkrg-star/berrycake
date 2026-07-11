"use client";
import { useState, useRef } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const s = { bg: "#FAF6F1", card: "#ffffff", gold: "#8C1B3B", text: "#3E2723", muted: "#9E8070", border: "#E2CEB8" };
const serif = "'Cormorant Garamond', Georgia, serif";
const sans = "'Jost', 'Inter', sans-serif";

const BERRY = "#8C1B3B";
const CARAMEL = "#C9845A";
const SAGE = "#7A9E88";
const CREAM = "#F2E0C8";
const COCOA = "#3E2723";
const MILK = "#FAF6F1";

const GOALS = [
  { key: "vacancy", label: "Вакансия" },
  { key: "ad", label: "Таргет / Реклама" },
  { key: "post", label: "Пост" },
] as const;

type Goal = (typeof GOALS)[number]["key"];
type FormatKey = "post" | "story";
type Template = "standard" | "bento";
type BlockId = "eyebrow" | "headline" | "secondary" | "bullets" | "caption" | "trustLine" | "cta";

const BLOCK_LABELS: Record<BlockId, string> = {
  eyebrow: "Метка",
  headline: "Заголовок",
  secondary: "Подзаголовок",
  bullets: "Список",
  caption: "Подпись",
  trustLine: "Строка бренда",
  cta: "Кнопка связи",
};

const FORMATS: Record<FormatKey, { w: number; h: number; label: string }> = {
  post: { w: 1080, h: 1350, label: "Пост 4:5" },
  story: { w: 1080, h: 1920, label: "Сторис 9:16" },
};

const PRESETS: Record<Goal, any> = {
  vacancy: {
    eyebrow: "МЫ НАНИМАЕМ",
    headline: "Кондитер",
    secondary: "От 250 000 ₸ · график 2/2",
    bullets: "Опыт от 1 года\nАккуратность и любовь к деталям\nЖелание расти в профессии",
    ctaLabel: "Откликнуться в WhatsApp",
  },
  ad: {
    eyebrow: "СПЕЦПРЕДЛОЖЕНИЕ",
    headline: "Торт на заказ за 3 дня",
    secondary: "Скидка 15% на первый заказ для новых клиентов",
    bullets: "Натуральные ингредиенты\nЛюбой вкус и размер\nДоставка по Алматы",
    ctaLabel: "Заказать в WhatsApp",
  },
  post: {
    eyebrow: "BERRYCAKE",
    headline: "Ваш идеальный торт",
    secondary: "Печём с любовью каждый день",
    bullets: "",
    ctaLabel: "Заказать в WhatsApp",
  },
};

const BENTO_PRESET = {
  eyebrow: "БЕНТО-ТОРТ",
  headline: "ВУПИ",
  secondary: "12 000 ₸",
  caption: "Мини-торт ручной работы · на любой повод",
};

type LayoutMap = Record<BlockId, { x: number; y: number; fontSize: number }>;

function computeDefaultLayout(dims: { w: number; h: number }, isBento: boolean, goalKey: Goal): LayoutMap {
  const h = dims.h;
  const contentTop = 64 + 46 + 28 + 13 + 20; // wordmark block + gap + eyebrow row
  const bottomReserve = 56 + 96; // bottom padding + scalloped edge
  const remaining = h - contentTop - bottomReserve;
  const headlineSize = isBento ? 64 : goalKey === "vacancy" ? 78 : 68;
  const headlineY = contentTop + remaining * 0.5;
  const secondarySize = isBento ? 26 : goalKey === "vacancy" ? 34 : 21;
  const secondaryY = headlineY + headlineSize * 1.05 + 18;
  return {
    eyebrow: { x: 64, y: 118, fontSize: 13 },
    headline: { x: 64, y: headlineY, fontSize: headlineSize },
    secondary: { x: 64, y: secondaryY, fontSize: secondarySize },
    bullets: { x: 64, y: secondaryY + secondarySize * 1.4 + 34, fontSize: 19 },
    caption: { x: 64, y: secondaryY + secondarySize * 1.4 + 14, fontSize: 17 },
    trustLine: { x: 64, y: h - 190, fontSize: 15 },
    cta: { x: 64, y: h - 150, fontSize: 20 },
  };
}

export default function MarketingGeneratorPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState<Goal>("vacancy");
  const [format, setFormat] = useState<FormatKey>("post");
  const [template, setTemplate] = useState<Template>("standard");
  const [photo, setPhoto] = useState<string | null>(null);
  const [showCta, setShowCta] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<BlockId | null>(null);

  const [fields, setFields] = useState<any>({ ...PRESETS.vacancy, caption: "", contact: "+7 777 773 32 34" });
  const [layout, setLayout] = useState<LayoutMap>(() => computeDefaultLayout(FORMATS.post, false, "vacancy"));

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = localStorage.getItem("bc_auth");
    if (!auth) { router.replace("/login"); return; }
    setUser(JSON.parse(auth));
  }, []);

  const dims = FORMATS[format];

  const resetLayout = (dimsArg = dims, isBentoArg = goal === "post" && template === "bento", goalArg = goal) =>
    setLayout(computeDefaultLayout(dimsArg, isBentoArg, goalArg));

  const applyGoal = (g: Goal) => {
    setGoal(g);
    setTemplate("standard");
    setPhoto(null);
    setSelected(null);
    setFields((f: any) => ({ ...f, ...PRESETS[g] }));
    resetLayout(dims, false, g);
  };

  const applyTemplate = (t: Template) => {
    setTemplate(t);
    setSelected(null);
    if (t === "bento") {
      setFields((f: any) => ({ ...f, ...BENTO_PRESET }));
      resetLayout(dims, true, goal);
    } else {
      setFields((f: any) => ({ ...f, ...PRESETS[goal] }));
      resetLayout(dims, false, goal);
    }
  };

  const changeFormat = (f: FormatKey) => {
    setFormat(f);
    setSelected(null);
    resetLayout(FORMATS[f], goal === "post" && template === "bento", goal);
  };

  const setField = (key: string, val: string) => setFields((f: any) => ({ ...f, [key]: val }));
  const setBlockFontSize = (id: BlockId, size: number) =>
    setLayout((prev) => ({ ...prev, [id]: { ...prev[id], fontSize: size } }));

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  // On-screen preview is shown at a fixed display width, scaled down from the true canvas size.
  const displayW = 300;
  const scale = displayW / dims.w;
  const displayH = dims.h * scale;

  const startDrag = (id: BlockId, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelected(id);
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = layout[id];
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      setLayout((prev) => ({ ...prev, [id]: { ...prev[id], x: origin.x + dx, y: origin.y + dy } }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const blockStyle = (id: BlockId): React.CSSProperties => ({
    position: "absolute",
    left: layout[id].x,
    top: layout[id].y,
    cursor: "grab",
    outline: selected === id ? `2px dashed ${BERRY}` : "2px dashed transparent",
    outlineOffset: 6,
  });

  // html-to-image's own createImage() sets img.crossOrigin="anonymous" and awaits
  // img.decode() before resolving, which hangs forever for same-document data: URIs
  // in some browsers. toSvg() alone works fine, so rasterize it ourselves instead
  // of using the library's toCanvas()/toPng().
  const rasterizeSvgDataUri = (svgUri: string, width: number, height: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("no 2d context")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("failed to rasterize preview"));
      img.src = svgUri;
    });

  const download = async () => {
    if (!previewRef.current) return;
    setSelected(null);
    setExporting(true);
    try {
      const { toSvg } = await import("html-to-image");
      const svgUri = await toSvg(previewRef.current, {
        width: dims.w, height: dims.h, style: { transform: "none" }, skipFonts: true,
      });
      const dataUrl = await rasterizeSvgDataUri(svgUri, dims.w, dims.h);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `berrycake-${goal}-${format}.png`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  if (!user) return null;

  const bullets: string[] = (fields.bullets || "").split("\n").map((b: string) => b.trim()).filter(Boolean);
  const isBento = goal === "post" && template === "bento";
  const hasPhoto = !!photo;

  const btnBase: React.CSSProperties = {
    border: "none", cursor: "pointer", fontFamily: sans, transition: "all 0.15s",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: s.bg, color: s.text, fontFamily: sans }}>
      <div style={{ backgroundColor: s.card, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: serif, fontSize: 20, color: s.gold, fontWeight: 600 }}>Генератор для соцсетей</span>
        </div>
        <button onClick={() => router.push("/dashboard")}
          style={{ ...btnBase, background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "8px 16px", fontSize: 13 }}>
          ← В дашборд
        </button>
      </div>

      <div className="mkt-grid" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px", display: "grid", gridTemplateColumns: "1fr 420px", gap: 32, alignItems: "start" }}>
        {/* ── Controls ── */}
        <div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: s.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Цель</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {GOALS.map((g) => (
                <button key={g.key} onClick={() => applyGoal(g.key)}
                  style={{ ...btnBase, padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    backgroundColor: goal === g.key ? s.gold : s.card,
                    color: goal === g.key ? "#fff" : s.text,
                    border: `1.5px solid ${goal === g.key ? s.gold : s.border}` }}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: s.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Формат</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(Object.keys(FORMATS) as FormatKey[]).map((f) => (
                <button key={f} onClick={() => changeFormat(f)}
                  style={{ ...btnBase, flex: 1, padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    backgroundColor: format === f ? s.gold : s.card,
                    color: format === f ? "#fff" : s.text,
                    border: `1.5px solid ${format === f ? s.gold : s.border}` }}>
                  {FORMATS[f].label}
                </button>
              ))}
            </div>
          </div>

          {goal === "post" && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: s.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Шаблон</div>
              <div style={{ display: "flex", gap: 8 }}>
                {([["standard", "Обычный"], ["bento", "Бенто-торт"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => applyTemplate(key)}
                    style={{ ...btnBase, flex: 1, padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                      backgroundColor: template === key ? s.gold : s.card,
                      color: template === key ? "#fff" : s.text,
                      border: `1.5px solid ${template === key ? s.gold : s.border}` }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(isBento || (goal === "post" && template === "standard")) && (
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: s.muted, display: "block", marginBottom: 6 }}>
                Фото {isBento ? "торта *" : "(необязательно)"}
              </label>
              <input type="file" accept="image/*" onChange={onPhotoChange}
                style={{ width: "100%", fontSize: 13, color: s.text }} />
              {photo && (
                <button onClick={() => setPhoto(null)}
                  style={{ ...btnBase, marginTop: 6, background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                  Убрать фото
                </button>
              )}
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: s.muted, display: "block", marginBottom: 6 }}>Метка (эйбрау)</label>
            <input value={fields.eyebrow} onChange={(e) => setField("eyebrow", e.target.value)}
              style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: s.muted, display: "block", marginBottom: 6 }}>
              {isBento ? "Название вкуса" : goal === "vacancy" ? "Должность" : "Заголовок"}
            </label>
            <input value={fields.headline} onChange={(e) => setField("headline", e.target.value)}
              style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: s.muted, display: "block", marginBottom: 6 }}>
              {isBento ? "Цена" : goal === "vacancy" ? "Условия / Зарплата" : "Подзаголовок / Текст"}
            </label>
            {isBento || goal === "vacancy" ? (
              <input value={fields.secondary} onChange={(e) => setField("secondary", e.target.value)}
                style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            ) : (
              <textarea value={fields.secondary} onChange={(e) => setField("secondary", e.target.value)} rows={3}
                style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical" }} />
            )}
          </div>

          {isBento && (
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: s.muted, display: "block", marginBottom: 6 }}>Подпись</label>
              <input value={fields.caption || ""} onChange={(e) => setField("caption", e.target.value)}
                style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
          )}

          {(goal === "vacancy" || goal === "ad") && (
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: s.muted, display: "block", marginBottom: 6 }}>
                {goal === "vacancy" ? "Требования (по одному в строке)" : "Преимущества (по одному в строке)"}
              </label>
              <textarea value={fields.bullets} onChange={(e) => setField("bullets", e.target.value)} rows={4}
                style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical" }} />
            </div>
          )}

          <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" checked={showCta} onChange={(e) => setShowCta(e.target.checked)} id="showCta" />
            <label htmlFor="showCta" style={{ fontSize: 13, color: s.text, cursor: "pointer" }}>Показывать кнопку связи</label>
          </div>

          {showCta && (
            <>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: s.muted, display: "block", marginBottom: 6 }}>Текст кнопки</label>
                <input value={fields.ctaLabel} onChange={(e) => setField("ctaLabel", e.target.value)}
                  style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: s.muted, display: "block", marginBottom: 6 }}>Контакт</label>
                <input value={fields.contact} onChange={(e) => setField("contact", e.target.value)}
                  style={{ width: "100%", backgroundColor: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "9px 12px", color: s.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </>
          )}

          {/* Position/size editor for the selected block */}
          <div style={{ marginBottom: 18, backgroundColor: selected ? "#f0fdf4" : s.card, border: `1.5px solid ${selected ? SAGE : s.border}`, borderRadius: 10, padding: "14px 16px" }}>
            {selected ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: s.text, marginBottom: 10 }}>
                  Блок: {BLOCK_LABELS[selected]} <span style={{ color: s.muted, fontWeight: 400 }}>(перетащите в превью)</span>
                </div>
                <label style={{ fontSize: 12, color: s.muted, display: "block", marginBottom: 4 }}>
                  Размер шрифта: {layout[selected].fontSize}px
                </label>
                <input type="range" min={10} max={100} value={layout[selected].fontSize}
                  onChange={(e) => setBlockFontSize(selected, Number(e.target.value))}
                  style={{ width: "100%" }} />
                <button onClick={() => setSelected(null)}
                  style={{ ...btnBase, marginTop: 10, background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 6, padding: "5px 12px", fontSize: 12 }}>
                  Готово
                </button>
              </>
            ) : (
              <div style={{ fontSize: 12, color: s.muted }}>
                Кликните на текст в превью справа, чтобы перетащить его или изменить размер шрифта.
              </div>
            )}
          </div>

          <button onClick={() => resetLayout()}
            style={{ ...btnBase, width: "100%", marginBottom: 10, background: "none", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 10, padding: "10px", fontSize: 13 }}>
            ↺ Сбросить расположение
          </button>

          <button onClick={download} disabled={exporting}
            style={{ ...btnBase, width: "100%", backgroundColor: exporting ? s.border : "#4caf50", borderRadius: 10, padding: "13px", color: exporting ? s.muted : "#fff", fontWeight: 700, fontSize: 15 }}>
            {exporting ? "Экспорт..." : `↓ Скачать PNG (${dims.w}×${dims.h})`}
          </button>
        </div>

        {/* ── Preview ── */}
        <div className="mkt-preview-col" style={{ position: "sticky", top: 24 }}>
          <div style={{ width: displayW, height: displayH, overflow: "hidden", borderRadius: 8, boxShadow: "0 8px 30px rgba(62,39,35,0.18)" }}>
            <div style={{ width: displayW, height: displayH, position: "relative" }}>
              <div ref={previewRef} onPointerDown={() => setSelected(null)}
                style={{
                  width: dims.w, height: dims.h,
                  transform: `scale(${scale})`, transformOrigin: "top left",
                  position: "relative", overflow: "hidden",
                  backgroundColor: MILK, fontFamily: sans,
                }}>

                {/* Background photo (bento or optional standard-post photo) */}
                {hasPhoto && (
                  <>
                    <img src={photo!} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(62,39,35,0.05) 0%, rgba(62,39,35,0.05) 45%, rgba(62,39,35,0.88) 100%)" }} />
                  </>
                )}

                {/* Decorative brand shapes when there's no photo */}
                {!hasPhoto && (
                  <>
                    <div style={{ position: "absolute", top: -90, right: -70, width: 460, height: 460, borderRadius: "50%", backgroundColor: CREAM }} />
                    <div style={{ position: "absolute", top: -90, right: -70, width: 500, height: 500, borderRadius: "50%", border: `1.5px solid ${CARAMEL}` }} />
                    <div style={{ position: "absolute", bottom: 140, left: -60, width: 220, height: 220, borderRadius: "50%", backgroundColor: SAGE, opacity: 0.14 }} />
                  </>
                )}

                {/* Scalloped bottom edge — brand signature, skipped when photo covers the frame */}
                {!hasPhoto && (
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 96, backgroundColor: BERRY }}>
                    <svg width="100%" height="96" viewBox={`0 0 ${dims.w} 96`} preserveAspectRatio="none" style={{ position: "absolute", top: -46, left: 0 }}>
                      {Array.from({ length: Math.round(dims.w / 92) + 1 }).map((_, i) => (
                        <circle key={i} cx={i * 92} cy={46} r={46} fill={MILK} />
                      ))}
                    </svg>
                  </div>
                )}

                {/* Wordmark — fixed brand anchor, not draggable */}
                <div style={{ position: "absolute", left: 64, top: 64 }}>
                  <div style={{ fontFamily: serif, fontSize: 30 }}>
                    <span style={{ color: BERRY }}>Berry</span><span style={{ color: BERRY, fontWeight: 600 }}>Cake</span>
                  </div>
                  <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: 3, color: hasPhoto ? MILK : CARAMEL, marginTop: 4 }}>
                    ТОРТЫ РУЧНОЙ РАБОТЫ · АЛМАТЫ
                  </div>
                </div>

                {/* Eyebrow */}
                <div onPointerDown={(e) => startDrag("eyebrow", e)} style={blockStyle("eyebrow")}>
                  <div style={{ fontFamily: sans, fontSize: layout.eyebrow.fontSize, fontWeight: 600, letterSpacing: 3, color: hasPhoto ? "#F2E0C8" : CARAMEL, whiteSpace: "nowrap" }}>
                    {(fields.eyebrow || "").toUpperCase()}
                  </div>
                </div>

                {/* Headline / price pill for bento */}
                <div onPointerDown={(e) => startDrag("headline", e)} style={blockStyle("headline")}>
                  {isBento ? (
                    <div style={{ fontFamily: serif, fontSize: layout.headline.fontSize, color: hasPhoto ? MILK : COCOA, lineHeight: 1.05, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {fields.headline}
                    </div>
                  ) : (
                    <div style={{ fontFamily: serif, fontSize: layout.headline.fontSize, fontWeight: 600, color: hasPhoto ? MILK : COCOA, lineHeight: 1.05, maxWidth: dims.w - 128 }}>
                      {fields.headline}
                    </div>
                  )}
                </div>

                {fields.secondary && (
                  <div onPointerDown={(e) => startDrag("secondary", e)} style={blockStyle("secondary")}>
                    {isBento ? (
                      <div style={{ display: "inline-block", backgroundColor: BERRY, color: MILK, fontFamily: serif, fontSize: layout.secondary.fontSize, fontWeight: 600, padding: "8px 22px", borderRadius: 40, whiteSpace: "nowrap" }}>
                        {fields.secondary}
                      </div>
                    ) : (
                      <div style={{
                        fontFamily: goal === "vacancy" ? serif : sans,
                        fontStyle: goal === "vacancy" ? "italic" : "normal",
                        fontSize: layout.secondary.fontSize,
                        color: hasPhoto ? "#F2E0C8" : (goal === "vacancy" ? BERRY : COCOA),
                        maxWidth: dims.w - 128, whiteSpace: "pre-wrap",
                      }}>
                        {fields.secondary}
                      </div>
                    )}
                  </div>
                )}

                {isBento && fields.caption && (
                  <div onPointerDown={(e) => startDrag("caption", e)} style={blockStyle("caption")}>
                    <div style={{ fontFamily: sans, fontSize: layout.caption.fontSize, color: hasPhoto ? "#F2E0C8" : s.muted, maxWidth: dims.w - 260 }}>
                      {fields.caption}
                    </div>
                  </div>
                )}

                {/* Bullets (vacancy / ad only) */}
                {bullets.length > 0 && (
                  <div onPointerDown={(e) => startDrag("bullets", e)} style={blockStyle("bullets")}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {bullets.map((b, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                          <div style={{ width: layout.bullets.fontSize + 1, height: layout.bullets.fontSize + 1, borderRadius: "50%", backgroundColor: SAGE, flexShrink: 0, marginTop: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: MILK, fontSize: layout.bullets.fontSize * 0.6, fontWeight: 700, lineHeight: 1 }}>✓</span>
                          </div>
                          <div style={{ fontFamily: sans, fontSize: layout.bullets.fontSize, fontWeight: 500, color: hasPhoto ? MILK : COCOA, whiteSpace: "nowrap" }}>{b}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trust line */}
                <div onPointerDown={(e) => startDrag("trustLine", e)} style={blockStyle("trustLine")}>
                  <div style={{ fontFamily: sans, fontSize: layout.trustLine.fontSize, color: hasPhoto ? "#F2E0C8cc" : s.muted, whiteSpace: "nowrap" }}>
                    BerryCake · торты ручной работы · Алматы
                  </div>
                </div>

                {/* CTA */}
                {showCta && (
                  <div onPointerDown={(e) => startDrag("cta", e)} style={blockStyle("cta")}>
                    <div style={{ backgroundColor: BERRY, borderRadius: 16, padding: "20px 26px", display: "inline-block" }}>
                      <div style={{ fontFamily: sans, fontWeight: 600, fontSize: layout.cta.fontSize, color: MILK, whiteSpace: "nowrap" }}>{fields.ctaLabel}</div>
                      <div style={{ fontFamily: sans, fontWeight: 600, fontSize: layout.cta.fontSize - 2, color: MILK, marginTop: 6, whiteSpace: "nowrap" }}>{fields.contact}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: s.muted, marginTop: 10, textAlign: "center" }}>
            Превью {dims.w}×{dims.h} px — масштаб {(scale * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .mkt-grid { grid-template-columns: 1fr !important; }
          .mkt-preview-col { position: static !important; margin-top: 8px; display: flex; flex-direction: column; align-items: center; }
        }
      `}</style>
    </div>
  );
}
