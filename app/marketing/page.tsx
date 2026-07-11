"use client";
import { useState, useRef, useEffect } from "react";
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

export default function MarketingGeneratorPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState<Goal>("vacancy");
  const [format, setFormat] = useState<FormatKey>("post");
  const [template, setTemplate] = useState<Template>("standard");
  const [photo, setPhoto] = useState<string | null>(null);
  const [showCta, setShowCta] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [fields, setFields] = useState<any>({ ...PRESETS.vacancy, caption: "", contact: "+7 777 773 32 34" });

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = localStorage.getItem("bc_auth");
    if (!auth) { router.replace("/login"); return; }
    setUser(JSON.parse(auth));
  }, []);

  const applyGoal = (g: Goal) => {
    setGoal(g);
    setTemplate("standard");
    setPhoto(null);
    setFields((f: any) => ({ ...f, ...PRESETS[g] }));
  };

  const applyTemplate = (t: Template) => {
    setTemplate(t);
    if (t === "bento") {
      setFields((f: any) => ({ ...f, ...BENTO_PRESET }));
    } else {
      setFields((f: any) => ({ ...f, ...PRESETS[goal] }));
    }
  };

  const setField = (key: string, val: string) => setFields((f: any) => ({ ...f, [key]: val }));

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

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
    setExporting(true);
    try {
      const { toSvg } = await import("html-to-image");
      const dims = FORMATS[format];
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

  const dims = FORMATS[format];
  const bullets: string[] = (fields.bullets || "").split("\n").map((b: string) => b.trim()).filter(Boolean);
  const isBento = goal === "post" && template === "bento";
  const hasPhoto = !!photo;

  // On-screen preview is shown at a fixed display width, scaled down from the true canvas size.
  const displayW = 300;
  const scale = displayW / dims.w;
  const displayH = dims.h * scale;

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
                <button key={f} onClick={() => setFormat(f)}
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

          <button onClick={download} disabled={exporting}
            style={{ ...btnBase, width: "100%", backgroundColor: exporting ? s.border : "#4caf50", borderRadius: 10, padding: "13px", color: exporting ? s.muted : "#fff", fontWeight: 700, fontSize: 15 }}>
            {exporting ? "Экспорт..." : `↓ Скачать PNG (${dims.w}×${dims.h})`}
          </button>
        </div>

        {/* ── Preview ── */}
        <div className="mkt-preview-col" style={{ position: "sticky", top: 24 }}>
          <div style={{ width: displayW, height: displayH, overflow: "hidden", borderRadius: 8, boxShadow: "0 8px 30px rgba(62,39,35,0.18)" }}>
            <div style={{ width: displayW, height: displayH, position: "relative" }}>
              <div ref={previewRef}
                style={{
                  width: dims.w, height: dims.h,
                  transform: `scale(${scale})`, transformOrigin: "top left",
                  position: "relative", overflow: "hidden",
                  backgroundColor: MILK, fontFamily: sans,
                  display: "flex", flexDirection: "column",
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

                {/* Content column */}
                <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", padding: "64px 64px 56px" }}>
                  {/* Wordmark */}
                  <div>
                    <div style={{ fontFamily: serif, fontSize: 30 }}>
                      <span style={{ color: BERRY }}>Berry</span><span style={{ color: BERRY, fontWeight: 600 }}>Cake</span>
                    </div>
                    <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: 3, color: hasPhoto ? MILK : CARAMEL, marginTop: 4 }}>
                      ТОРТЫ РУЧНОЙ РАБОТЫ · АЛМАТЫ
                    </div>
                  </div>

                  {/* Eyebrow */}
                  <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, letterSpacing: 3, color: hasPhoto ? "#F2E0C8" : CARAMEL, marginTop: 28 }}>
                    {(fields.eyebrow || "").toUpperCase()}
                  </div>

                  {/* Spacer pushes headline block toward the lower two-thirds */}
                  <div style={{ flex: hasPhoto ? 1 : 0.55 }} />

                  {/* Headline / price pill for bento */}
                  {isBento ? (
                    <>
                      <div style={{ fontFamily: serif, fontSize: 64, color: hasPhoto ? MILK : COCOA, lineHeight: 1.05, fontWeight: 600 }}>
                        {fields.headline}
                      </div>
                      <div style={{ display: "inline-block", marginTop: 14, backgroundColor: BERRY, color: MILK, fontFamily: serif, fontSize: 26, fontWeight: 600, padding: "8px 22px", borderRadius: 40, whiteSpace: "nowrap" }}>
                        {fields.secondary}
                      </div>
                      {fields.caption && (
                        <div style={{ fontFamily: sans, fontSize: 17, color: hasPhoto ? "#F2E0C8" : s.muted, marginTop: 14, maxWidth: dims.w - 260 }}>
                          {fields.caption}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ fontFamily: serif, fontSize: goal === "vacancy" ? 78 : 68, fontWeight: 600, color: hasPhoto ? MILK : COCOA, lineHeight: 1.05 }}>
                        {fields.headline}
                      </div>
                      {fields.secondary && (
                        <div style={{
                          fontFamily: goal === "vacancy" ? serif : sans,
                          fontStyle: goal === "vacancy" ? "italic" : "normal",
                          fontSize: goal === "vacancy" ? 34 : 21,
                          color: hasPhoto ? "#F2E0C8" : (goal === "vacancy" ? BERRY : COCOA),
                          marginTop: 14, maxWidth: dims.w - 260, whiteSpace: "pre-wrap",
                        }}>
                          {fields.secondary}
                        </div>
                      )}
                    </>
                  )}

                  {/* Bullets (vacancy / ad only) */}
                  {bullets.length > 0 && (
                    <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 16 }}>
                      {bullets.map((b, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: SAGE, flexShrink: 0, marginTop: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: MILK, fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>
                          </div>
                          <div style={{ fontFamily: sans, fontSize: 19, fontWeight: 500, color: hasPhoto ? MILK : COCOA, whiteSpace: "nowrap" }}>{b}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ flex: 1 }} />

                  {/* Trust line */}
                  <div style={{ fontFamily: sans, fontSize: 15, color: hasPhoto ? "#F2E0C8cc" : s.muted, marginBottom: showCta ? 20 : 0 }}>
                    BerryCake · торты ручной работы · Алматы
                  </div>

                  {/* CTA */}
                  {showCta && (
                    <div style={{ backgroundColor: BERRY, borderRadius: 16, padding: "20px 26px", display: "inline-block" }}>
                      <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 20, color: MILK, whiteSpace: "nowrap" }}>{fields.ctaLabel}</div>
                      <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 18, color: MILK, marginTop: 6, whiteSpace: "nowrap" }}>{fields.contact}</div>
                    </div>
                  )}
                </div>
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
