"use client";
import { getToothAnatomy, toothShape } from "./ToothAnatomy";

type Layout = "hero" | "inline" | "mini";

/** Isolated tooth render with name — hero (panel top), inline (plan cards), mini (chips) */
export function FocusToothHero({
  tooth,
  accent = "#0E7C7B",
  layout = "hero",
  onClick,
}: {
  tooth: number;
  accent?: string;
  layout?: Layout;
  onClick?: () => void;
}) {
  const info = getToothAnatomy(tooth);
  const clickable = !!onClick;
  const wrapStyle = clickable ? { cursor: "pointer" as const } : {};

  if (layout === "mini") {
    return (
      <button type="button" onClick={onClick} style={{
        border: `2px solid ${accent}44`, background: `${accent}08`, borderRadius: 12,
        padding: 6, cursor: onClick ? "pointer" : "default", fontFamily: "inherit",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      }}>
        <ToothVisual tooth={tooth} accent={accent} boxW={52} boxH={58} />
        <span style={{ fontWeight: 900, fontSize: 12, color: accent }}>#{tooth}</span>
      </button>
    );
  }

  if (layout === "inline") {
    return (
      <div
        role={clickable ? "button" : undefined}
        onClick={onClick}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 12px", borderRadius: 14,
          background: `linear-gradient(135deg, ${accent}0A, #fff)`,
          border: `1.5px solid ${accent}28`,
          ...wrapStyle,
        }}
      >
        <ToothVisual tooth={tooth} accent={accent} boxW={68} boxH={76} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              background: accent, color: "#fff", borderRadius: 10, padding: "4px 10px",
              fontWeight: 900, fontSize: 14,
            }}>{tooth}</span>
            <span style={{ fontWeight: 900, fontSize: 14.5, color: "#0F172A", lineHeight: 1.3 }}>{info.fullName}</span>
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{info.type} · {info.arch} arch</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      padding: "16px 14px 14px", borderRadius: 18,
      background: "linear-gradient(180deg, #fff 0%, #F8FAFC 100%)",
      border: `2px solid ${accent}33`,
      boxShadow: `0 8px 28px ${accent}18`,
      ...wrapStyle,
    }}>
      <ToothVisual tooth={tooth} accent={accent} boxW={148} boxH={168} svgScale={1} />
      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 48, height: 48, borderRadius: "50%", background: accent, color: "#fff",
        fontWeight: 900, fontSize: 20, marginTop: 4, marginBottom: 8,
        boxShadow: `0 4px 18px ${accent}77`,
      }}>
        {tooth}
      </div>
      <div style={{ fontWeight: 900, fontSize: 17, color: "#0F172A", lineHeight: 1.3 }}>{info.fullName}</div>
      <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 4 }}>{info.type} · {info.arch} arch · FDI {tooth}</div>
    </div>
  );
}

function ToothVisual({
  tooth, accent, boxW, boxH, svgScale = 1,
}: {
  tooth: number; accent: string; boxW: number; boxH: number; svgScale?: number;
}) {
  const shape = toothShape(tooth);
  const uid = `tv-${tooth}-${accent.replace("#", "")}-${boxW}`;
  const w = (shape === "molar" ? 100 : shape === "premolar" ? 92 : 86) * svgScale;
  const h = (shape === "canine" || shape === "molar" ? 132 : 126) * svgScale;

  const crown = (
    <>
      {shape === "incisor" && (
        <path d="M20 14 Q39 6 58 14 L54 42 Q39 48 24 42 Z" fill={`url(#fc-${uid})`} stroke={accent} strokeWidth="2.4" />
      )}
      {shape === "canine" && (
        <path d="M22 16 Q39 2 56 16 L52 44 Q39 50 26 44 Z" fill={`url(#fc-${uid})`} stroke={accent} strokeWidth="2.4" />
      )}
      {shape === "premolar" && (
        <path d="M16 16 Q42 8 68 16 L62 46 Q42 52 22 46 Z" fill={`url(#fc-${uid})`} stroke={accent} strokeWidth="2.4" />
      )}
      {shape === "molar" && (
        <path d="M12 18 Q42 8 72 18 L66 50 Q42 56 18 50 Z" fill={`url(#fc-${uid})`} stroke={accent} strokeWidth="2.4" />
      )}
    </>
  );

  const roots = (
    <>
      {shape === "incisor" && <path d="M26 42 L30 95 Q39 100 48 95 L52 42 Z" fill={`url(#fr-${uid})`} stroke={accent} strokeWidth="1.8" opacity=".92" />}
      {shape === "canine" && <path d="M28 44 L32 98 Q39 102 46 98 L50 44 Z" fill={`url(#fr-${uid})`} stroke={accent} strokeWidth="1.8" opacity=".92" />}
      {shape === "premolar" && (
        <>
          <path d="M22 46 L26 88 Q30 92 34 88 L36 46 Z" fill={`url(#fr-${uid})`} stroke={accent} strokeWidth="1.5" />
          <path d="M48 46 L50 88 Q54 92 58 88 L60 46 Z" fill={`url(#fr-${uid})`} stroke={accent} strokeWidth="1.5" />
        </>
      )}
      {shape === "molar" && (
        <>
          <path d="M18 50 L22 88 Q26 92 30 88 L32 50 Z" fill={`url(#fr-${uid})`} stroke={accent} strokeWidth="1.5" />
          <path d="M38 50 L40 92 Q44 96 48 92 L50 50 Z" fill={`url(#fr-${uid})`} stroke={accent} strokeWidth="1.5" />
          <path d="M58 50 L60 88 Q64 92 68 88 L70 50 Z" fill={`url(#fr-${uid})`} stroke={accent} strokeWidth="1.5" />
        </>
      )}
    </>
  );

  const innerScale = Math.min((boxW - 16) / w, (boxH - 16) / h);

  return (
    <div style={{
      width: boxW, height: boxH, borderRadius: boxW > 100 ? 20 : 12,
      background: `linear-gradient(160deg, ${accent}18 0%, #fff 45%, ${accent}08 100%)`,
      border: `2px solid ${accent}55`,
      boxShadow: `0 0 24px ${accent}44, 0 6px 16px rgba(15,23,42,.08)`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <svg
        width={w * innerScale}
        height={h * innerScale}
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: "block", filter: "drop-shadow(0 4px 8px rgba(15,23,42,.12))" }}
      >
        <defs>
          <linearGradient id={`fc-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#F0FDFA" />
            <stop offset="100%" stopColor="#CCFBF1" />
          </linearGradient>
          <linearGradient id={`fr-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
        </defs>
        {roots}
        {crown}
      </svg>
    </div>
  );
}