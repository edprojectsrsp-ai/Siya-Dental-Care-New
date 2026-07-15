"use client";
import { FocusToothHero } from "./FocusToothHero";
import { describeToothSelection } from "./toothSelectionGroup";

const INK = "#0F172A", MUTE = "#64748B";

/** Single tooth hero, or one clean banner for arch / multi-tooth selections */
export function GroupedToothBanner({
  teeth,
  child = false,
  accent,
  onFocusTooth,
  variant = "horizontal",
}: {
  teeth: number[];
  child?: boolean;
  accent: string;
  onFocusTooth?: (n: number) => void;
  variant?: "horizontal" | "sidebar";
}) {
  const info = describeToothSelection(teeth, child);
  const sidebar = variant === "sidebar";

  if (info.kind === "single" && info.primaryTooth) {
    return <FocusToothHero tooth={info.primaryTooth} accent={accent} layout="hero" />;
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: sidebar ? "column" : "row",
      alignItems: sidebar ? "stretch" : "center",
      gap: 14, padding: "16px 18px",
      background: "linear-gradient(135deg, #fff 0%, #F8FAFC 100%)",
      borderRadius: 18, border: `2px solid ${accent}33`,
      boxShadow: `0 6px 24px ${accent}14`,
    }}>
      <div style={{
        width: sidebar ? "100%" : 64, height: sidebar ? 72 : 64, borderRadius: 16, flexShrink: 0,
        background: `linear-gradient(135deg, ${accent}, ${accent}BB)`,
        color: "#fff", display: "grid", placeItems: "center",
        fontSize: sidebar ? 32 : 28, boxShadow: `0 4px 16px ${accent}44`,
      }}>
        {info.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: sidebar ? "center" : "left" }}>
        <div style={{ fontWeight: 900, fontSize: sidebar ? 17 : 18, color: INK }}>{info.label}</div>
        <div style={{ fontSize: 13, color: MUTE, marginTop: 4, lineHeight: 1.45 }}>{info.subtitle}</div>
        {teeth.length > 1 && teeth.length <= 16 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10, justifyContent: sidebar ? "center" : "flex-start" }}>
            {teeth.map(n => (
              <button key={n} type="button" onClick={() => onFocusTooth?.(n)}
                style={{
                  border: `1.5px solid ${accent}44`, background: `${accent}0D`, color: accent,
                  borderRadius: 8, padding: "3px 9px", fontWeight: 800, fontSize: 11.5,
                  cursor: onFocusTooth ? "pointer" : "default", fontFamily: "inherit",
                }}>
                #{n}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{
        textAlign: "center", background: `${accent}12`, borderRadius: 12, padding: "10px 14px",
        border: `1.5px solid ${accent}28`, flexShrink: 0,
        alignSelf: sidebar ? "center" : undefined,
      }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: accent }}>{teeth.length}</div>
        <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, textTransform: "uppercase" }}>Teeth</div>
      </div>
    </div>
  );
}