import type { CSSProperties } from "react";

/** Premium design tokens — Treatment Workspace */
export const TW = {
  ink: "#0B1220",
  inkSoft: "#1E293B",
  mute: "#64748B",
  muteLight: "#94A3B8",
  line: "rgba(148, 163, 184, 0.22)",
  lineStrong: "rgba(148, 163, 184, 0.38)",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  surfaceElevated: "rgba(255, 255, 255, 0.92)",
  canvas: "linear-gradient(165deg, #EEF4F7 0%, #F4F8FA 38%, #E8F2F1 100%)",
  teal: "#0A7C78",
  tealLight: "#14B8A6",
  tealGlow: "rgba(10, 124, 120, 0.18)",
  gold: "#C4A052",
  shadowSm: "0 1px 2px rgba(11, 18, 32, 0.04), 0 2px 8px rgba(11, 18, 32, 0.04)",
  shadowMd: "0 4px 6px rgba(11, 18, 32, 0.04), 0 12px 32px rgba(11, 18, 32, 0.08)",
  shadowLg: "0 8px 24px rgba(11, 18, 32, 0.1), 0 24px 48px rgba(11, 18, 32, 0.06)",
  shadowHeader: "0 4px 24px rgba(11, 18, 32, 0.08), 0 1px 0 rgba(255,255,255,0.8) inset",
  radiusSm: 10,
  radiusMd: 14,
  radiusLg: 18,
  radiusXl: 22,
};

export const twCard = (accent?: string): CSSProperties => ({
  background: TW.surface,
  borderRadius: TW.radiusXl,
  padding: 22,
  border: `1px solid ${TW.line}`,
  boxShadow: TW.shadowMd,
  ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
});

export const twBtn = (color: string, variant: "solid" | "ghost" | "outline" = "solid"): CSSProperties => {
  if (variant === "ghost") return {
    background: `${color}10`, color, border: `1px solid ${color}30`,
    padding: "10px 18px", borderRadius: TW.radiusMd, cursor: "pointer",
    fontWeight: 700, fontSize: 13.5, fontFamily: "inherit", transition: "all .15s ease",
  };
  if (variant === "outline") return {
    background: "#fff", color, border: `1.5px solid ${color}55`,
    padding: "10px 18px", borderRadius: TW.radiusMd, cursor: "pointer",
    fontWeight: 700, fontSize: 13.5, fontFamily: "inherit", transition: "all .15s ease",
  };
  return {
    background: `linear-gradient(135deg, ${color}, ${color}DD)`,
    color: "#fff", border: "none",
    padding: "11px 20px", borderRadius: TW.radiusMd, cursor: "pointer",
    fontWeight: 800, fontSize: 13.5, fontFamily: "inherit",
    boxShadow: `0 4px 14px ${color}40`, transition: "all .15s ease",
  };
};

export const twInp: CSSProperties = {
  width: "100%",
  border: `1.5px solid ${TW.lineStrong}`,
  borderRadius: TW.radiusMd,
  padding: "12px 16px",
  fontSize: 15,
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
  background: TW.surface,
  transition: "border-color .15s, box-shadow .15s",
};

export const twLbl: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  marginTop: 14,
  marginBottom: 7,
  color: TW.mute,
  textTransform: "uppercase",
  letterSpacing: 0.8,
};

export const twChip = (color: string): CSSProperties => ({
  background: `${color}0C`,
  color,
  border: `1px solid ${color}35`,
  padding: "6px 14px",
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "all .12s ease",
});