"use client";
import { useMemo, useState } from "react";

export const ADULT_Q = [[18, 17, 16, 15, 14, 13, 12, 11], [21, 22, 23, 24, 25, 26, 27, 28], [48, 47, 46, 45, 44, 43, 42, 41], [31, 32, 33, 34, 35, 36, 37, 38]];
export const CHILD_Q = [[55, 54, 53, 52, 51], [61, 62, 63, 64, 65], [85, 84, 83, 82, 81], [71, 72, 73, 74, 75]];

export type ChartRegion = "full" | "upper" | "lower" | "ur" | "ul" | "lr" | "ll";

export function allTeethInQuadrants(child: boolean): number[] {
  const Q = child ? CHILD_Q : ADULT_Q;
  return Q.flat();
}

export function teethForRegion(region: ChartRegion, child: boolean): number[] {
  const Q = child ? CHILD_Q : ADULT_Q;
  if (region === "full") return Q.flat();
  if (region === "upper") return [...Q[0], ...Q[1]];
  if (region === "lower") return [...Q[2], ...Q[3]];
  if (region === "ur") return Q[0];
  if (region === "ul") return Q[1];
  if (region === "lr") return Q[2];
  if (region === "ll") return Q[3];
  return Q.flat();
}

/** FDI position digit → anatomical tooth shape variant */
function toothVariant(n: number): "incisor" | "canine" | "premolar" | "molar" {
  const pos = n % 10;
  if (pos <= 2) return "incisor";
  if (pos === 3) return "canine";
  if (pos <= 5) return "premolar";
  return "molar";
}

function ToothSvg({ variant, selected, border, bg }: { variant: string; selected: boolean; border: string; bg: string }) {
  const root = variant === "molar" ? "#E2E8F0" : "#E8EDF4";
  const rootShade = variant === "molar" ? "#CBD5E1" : "#D6DCE5";
  const crown = selected ? "#ECFDF5" : bg === "#fff" ? "#FCFCFD" : bg;
  const crownHL = selected ? "#FFFFFF" : "#FFFFFF"; // top highlight
  const crownShade = selected ? "#D1FAE5" : "#E8EAEE"; // bottom shade
  // Each variant gets a unique gradient id for layered shading
  const uid = `t${variant}${selected ? "s" : ""}${bg.replace("#", "")}`;

  if (variant === "incisor") {
    return (
      <svg width="46" height="66" viewBox="0 0 46 66" style={{ display: "block", margin: "0 auto" }}>
        <defs>
          <linearGradient id={`crown${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={crownHL} />
            <stop offset="50%" stopColor={crown} />
            <stop offset="100%" stopColor={crownShade} />
          </linearGradient>
          <linearGradient id={`root${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={root} />
            <stop offset="100%" stopColor={rootShade} />
          </linearGradient>
        </defs>
        {/* Crown — flat incisal edge, slight taper */}
        <path d="M12 9 Q23 3 34 9 L31 27 Q23 32 15 27 Z" fill={`url(#crown${uid})`} stroke={border} strokeWidth="1.6" />
        {/* Root — single, tapered */}
        <path d="M16 27 L18 60 Q23 63 28 60 L30 27 Z" fill={`url(#root${uid})`} stroke={border} strokeWidth="1.3" opacity=".95" />
        {/* Incisal edge highlight */}
        <path d="M14 11 Q23 7 32 11" stroke={crownHL} strokeWidth="1" fill="none" opacity=".6" />
      </svg>
    );
  }
  if (variant === "canine") {
    return (
      <svg width="46" height="68" viewBox="0 0 46 68" style={{ display: "block", margin: "0 auto" }}>
        <defs>
          <linearGradient id={`crown${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={crownHL} />
            <stop offset="50%" stopColor={crown} />
            <stop offset="100%" stopColor={crownShade} />
          </linearGradient>
          <linearGradient id={`root${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={root} />
            <stop offset="100%" stopColor={rootShade} />
          </linearGradient>
        </defs>
        {/* Crown — pointed cusp */}
        <path d="M13 13 Q23 1 33 13 L30 29 Q23 33 16 29 Z" fill={`url(#crown${uid})`} stroke={border} strokeWidth="1.6" />
        {/* Cusp tip highlight */}
        <path d="M22 3 L23 12 L24 3" stroke={border} strokeWidth=".8" fill="none" opacity=".5" />
        {/* Root — long, single */}
        <path d="M17 29 L19 62 Q23 65 27 62 L29 29 Z" fill={`url(#root${uid})`} stroke={border} strokeWidth="1.3" opacity=".95" />
      </svg>
    );
  }
  if (variant === "premolar") {
    return (
      <svg width="50" height="66" viewBox="0 0 50 66" style={{ display: "block", margin: "0 auto" }}>
        <defs>
          <linearGradient id={`crown${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={crownHL} />
            <stop offset="50%" stopColor={crown} />
            <stop offset="100%" stopColor={crownShade} />
          </linearGradient>
          <linearGradient id={`root${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={root} />
            <stop offset="100%" stopColor={rootShade} />
          </linearGradient>
        </defs>
        {/* Crown — wider, two cusps */}
        <path d="M10 12 Q25 5 40 12 L37 30 Q25 35 13 30 Z" fill={`url(#crown${uid})`} stroke={border} strokeWidth="1.6" />
        {/* Buccal & lingual cusps — small bumps on top */}
        <path d="M16 10 Q19 7 22 10 M28 10 Q31 7 34 10" stroke={border} strokeWidth=".8" fill="none" opacity=".5" />
        {/* Central fissure (occlusal groove) */}
        <line x1="25" y1="14" x2="25" y2="28" stroke={border} strokeWidth=".7" opacity=".4" />
        {/* Root — bifurcated, premolars often have two */}
        <path d="M14 30 L16 58 Q19 62 22 58 L23 30 Z" fill={`url(#root${uid})`} stroke={border} strokeWidth="1.2" opacity=".9" />
        <path d="M27 30 L28 58 Q31 62 34 58 L36 30 Z" fill={`url(#root${uid})`} stroke={border} strokeWidth="1.2" opacity=".9" />
      </svg>
    );
  }
  // MOLAR — widest, multi-cusp, multi-root
  return (
    <svg width="54" height="68" viewBox="0 0 54 68" style={{ display: "block", margin: "0 auto" }}>
      <defs>
        <linearGradient id={`crown${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={crownHL} />
          <stop offset="50%" stopColor={crown} />
          <stop offset="100%" stopColor={crownShade} />
        </linearGradient>
        <linearGradient id={`root${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={root} />
          <stop offset="100%" stopColor={rootShade} />
        </linearGradient>
      </defs>
      {/* Crown — wide rectangular with rounded corners */}
      <path d="M7 14 Q27 6 47 14 L43 33 Q27 38 11 33 Z" fill={`url(#crown${uid})`} stroke={border} strokeWidth="1.6" />
      {/* Four cusps */}
      <path d="M13 12 Q15 9 18 12 M22 11 Q24 8 26 11 M28 11 Q30 8 32 11 M36 12 Q38 9 41 12"
        stroke={border} strokeWidth=".7" fill="none" opacity=".45" />
      {/* Occlusal fissures (Y-shape on molars) */}
      <line x1="27" y1="14" x2="27" y2="32" stroke={border} strokeWidth=".7" opacity=".4" />
      <line x1="13" y1="22" x2="41" y2="22" stroke={border} strokeWidth=".7" opacity=".4" />
      {/* Three roots */}
      <path d="M10 33 L12 56 Q15 60 18 56 L19 33 Z" fill={`url(#root${uid})`} stroke={border} strokeWidth="1.2" opacity=".9" />
      <path d="M22 33 L24 60 Q27 63 30 60 L32 33 Z" fill={`url(#root${uid})`} stroke={border} strokeWidth="1.2" opacity=".9" />
      <path d="M35 33 L36 56 Q39 60 42 56 L44 33 Z" fill={`url(#root${uid})`} stroke={border} strokeWidth="1.2" opacity=".9" />
    </svg>
  );
}

export interface ToothVisualState {
  bg: string;
  border: string;
  done?: boolean;
  hasExam?: boolean;
  hasDiag?: boolean;
  planned?: boolean;
  prog?: boolean;
  hasIssue?: boolean;
  /** Sprint P1: visual status overlay drawn ON the tooth (cavity dot, RCT marker, crown shade, etc.) */
  kind?: "cavity" | "filling" | "rct" | "crown" | "bridge" | "implant" | "extraction" | "missing" | "scaling" | "veneer" | "other" | null;
  /** Short treatment label shown under tooth number (e.g. RCT, CRN) */
  label?: string;
  /** Surface observation dots for focused-tooth charting */
  examSurfaces?: string[];
  /** Layer visibility — when false, that layer's visuals are suppressed */
  showObs?: boolean;
  showDx?: boolean;
  showTx?: boolean;
  /** Rich hover summary */
  tooltip?: string;
  /** Structured hover card content — exam findings / diagnoses / treatments */
  card?: { exam: string[]; diag: string[]; tx: { name: string; status?: string }[] };
}

/** Sprint P1: status overlay drawn over the tooth SVG. Returns null when no marker applies. */
function ToothStatusMarker({ kind, variant }: { kind?: string | null; variant: string }) {
  if (!kind || kind === "other" || kind === "scaling") return null;

  // Reference dims: incisor 46×66, canine 46×68, premolar 50×66, molar 54×68
  const w = variant === "molar" ? 54 : variant === "premolar" ? 50 : 46;
  const h = variant === "canine" || variant === "molar" ? 68 : 66;
  const cx = w / 2;
  const uid = `${variant}-${kind}`;

  if (kind === "missing" || kind === "extraction") {
    // Red diagonal cross over the tooth
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute" as const, top: 4, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" as const }}>
        <line x1="6" y1="6" x2={w - 6} y2={h - 6} stroke="#DC2626" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <line x1={w - 6} y1="6" x2="6" y2={h - 6} stroke="#DC2626" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      </svg>
    );
  }

  if (kind === "cavity") {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute" as const, top: 4, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" as const }}>
        <circle cx={cx} cy="18" r="3.2" fill="#7C2D12" opacity="0.9" />
        <circle cx={cx - 5} cy="22" r="1.6" fill="#7C2D12" opacity="0.7" />
        <circle cx={cx + 4} cy="20" r="1.4" fill="#7C2D12" opacity="0.7" />
      </svg>
    );
  }

  if (kind === "filling") {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute" as const, top: 4, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" as const }}>
        <ellipse cx={cx} cy="20" rx="6" ry="4" fill="#475569" opacity="0.78" />
        <ellipse cx={cx} cy="19.5" rx="4" ry="2.5" fill="#94A3B8" opacity="0.6" />
      </svg>
    );
  }

  if (kind === "rct") {
    const rootTop = variant === "incisor" ? 30 : variant === "canine" ? 32 : 33;
    const rootBot = variant === "incisor" ? 58 : variant === "canine" ? 60 : variant === "premolar" ? 56 : 54;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute" as const, top: 4, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" as const }}>
        <line x1={cx} y1={rootTop} x2={cx} y2={rootBot} stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" opacity="0.92" />
        {variant === "molar" && (
          <>
            <line x1={cx - 11} y1={rootTop + 2} x2={cx - 11} y2={rootBot - 2} stroke="#EA580C" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            <line x1={cx + 11} y1={rootTop + 2} x2={cx + 11} y2={rootBot - 2} stroke="#EA580C" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          </>
        )}
        <circle cx={cx} cy={rootTop + 3} r="2" fill="#EA580C" opacity="0.9" />
      </svg>
    );
  }

  if (kind === "crown" || kind === "bridge" || kind === "veneer") {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute" as const, top: 4, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" as const }}>
        <defs>
          <linearGradient id={`gold-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        {variant === "incisor"  && <path d="M13 10 Q23 5 33 10 L30 26 Q23 30 16 26 Z" fill={`url(#gold-${uid})`} opacity="0.55" />}
        {variant === "canine"   && <path d="M14 12 Q23 3 32 12 L29 28 Q23 32 17 28 Z" fill={`url(#gold-${uid})`} opacity="0.55" />}
        {variant === "premolar" && <path d="M11 12 Q25 6 39 12 L36 29 Q25 33 14 29 Z" fill={`url(#gold-${uid})`} opacity="0.55" />}
        {variant === "molar"    && <path d="M8 13 Q27 7 46 13 L42 32 Q27 37 12 32 Z" fill={`url(#gold-${uid})`} opacity="0.55" />}
        <text x={cx} y="9" textAnchor="middle" fontSize="9" fill="#92400E" fontWeight="900">♔</text>
      </svg>
    );
  }

  if (kind === "implant") {
    const rootTop = variant === "incisor" ? 30 : variant === "canine" ? 32 : 33;
    const rootBot = variant === "incisor" ? 58 : variant === "canine" ? 60 : variant === "premolar" ? 56 : 54;
    const threads: any[] = [];
    for (let y = rootTop + 4; y < rootBot - 2; y += 3.5) {
      threads.push(<line key={y} x1={cx - 5} y1={y} x2={cx + 5} y2={y + 1.2} stroke="#4338CA" strokeWidth="1.2" opacity="0.85" />);
    }
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute" as const, top: 4, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" as const }}>
        <rect x={cx - 6} y={rootTop} width="12" height={rootBot - rootTop} fill="#A5B4FC" opacity="0.5" rx="2" />
        {threads}
      </svg>
    );
  }

  return null;
}

/** Tiny surface marker on tooth crown (clinical canvas layer 1) */
function ExamSurfaceDots({ surfaces, variant }: { surfaces: string[]; variant: string }) {
  if (!surfaces?.length) return null;
  const w = variant === "molar" ? 54 : variant === "premolar" ? 50 : 46;
  const h = variant === "canine" || variant === "molar" ? 68 : 66;
  const spots: Record<string, [number, number]> = {
    O: [w / 2, 14], M: [10, 22], D: [w - 10, 22], B: [w / 2, 26], L: [w / 2, 30],
  };
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute" as const, top: 4, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" as const }}>
      {surfaces.map((s, i) => {
        const p = spots[s.toUpperCase()] || [w / 2, 18];
        return <circle key={`${s}-${i}`} cx={p[0]} cy={p[1]} r="3.5" fill="#EAB308" stroke="#CA8A04" strokeWidth="1" opacity="0.95" />;
      })}
    </svg>
  );
}

export function ToothWidget({
  child,
  onChildChange,
  multiSelect,
  onMultiSelectChange,
  region,
  onRegionChange,
  selected,
  onSelectedChange,
  toothColor,
  accent = "#0E7C7B",
  showUpper = true,
  showLower = true,
  headerExtra,
  pulsingTeeth = [],
  focusMode = false,
  onToothDoubleClick,
  hoverTooth,
  onHoverTooth,
  title = "🦷 Dental Chart",
}: {
  child: boolean;
  onChildChange?: (v: boolean) => void;
  multiSelect: boolean;
  onMultiSelectChange?: (v: boolean) => void;
  region: ChartRegion;
  onRegionChange: (r: ChartRegion) => void;
  selected: number[];
  onSelectedChange: (teeth: number[]) => void;
  toothColor: (n: number) => ToothVisualState;
  accent?: string;
  showUpper?: boolean;
  showLower?: boolean;
  headerExtra?: React.ReactNode;
  pulsingTeeth?: number[];
  /** When true and exactly one tooth is selected, non-selected teeth are dimmed */
  focusMode?: boolean;
  onToothDoubleClick?: (n: number) => void;
  hoverTooth?: number | null;
  onHoverTooth?: (n: number | null) => void;
  title?: string;
}) {
  const Q = child ? CHILD_Q : ADULT_Q;
  // Arch mode: teeth follow a real dental-arch curve (∩ upper / ∪ lower) — Curve/Archy-style.
  const [arch, setArch] = useState(true);
  // Hover card position (screen coords) — rendered fixed so overflow:auto rows can't clip it.
  const [hoverRect, setHoverRect] = useState<{ x: number; y: number } | null>(null);
  const enterTooth = (n: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setHoverRect({ x: r.left + r.width / 2, y: r.top });
    onHoverTooth?.(n);
  };
  const leaveTooth = () => { setHoverRect(null); onHoverTooth?.(null); };
  const regions: { id: ChartRegion; label: string }[] = [
    { id: "full", label: "Full Mouth" }, { id: "upper", label: "Upper" }, { id: "lower", label: "Lower" },
    { id: "ur", label: "Upper Right" }, { id: "ul", label: "Upper Left" },
    { id: "lr", label: "Lower Right" }, { id: "ll", label: "Lower Left" },
  ];

  const visibleSet = useMemo(() => new Set(teethForRegion(region, child)), [region, child]);

  const pickTooth = (n: number) => {
    if (multiSelect) {
      onSelectedChange(selected.includes(n) ? selected.filter(x => x !== n) : [...selected, n].sort((a, b) => a - b));
    } else {
      onSelectedChange(selected.includes(n) && selected.length === 1 ? [] : [n]);
    }
  };

  const selectRegion = (r: ChartRegion) => {
    onRegionChange(r);
    // "Full Mouth" resets the view filter but keeps existing selection — user can manually pick
    // Other regions act as quick range-selectors: add all teeth in that region to selection (additive in multi-select, replace in single)
    if (r === "full") return;
    const regionTeeth = teethForRegion(r, child);
    if (multiSelect) {
      // Additive — merge unique
      onSelectedChange(Array.from(new Set([...selected, ...regionTeeth])).sort((a, b) => a - b));
    } else {
      onSelectedChange(regionTeeth);
    }
  };

  const clearSelection = () => onSelectedChange([]);

  // One tooth cell — shared by upper/lower rows. In arch mode each tooth is
  // rotated + dropped along a parabola so the row reads like a real mouth.
  const renderTooth = (n: number, i: number, count: number, upper: boolean) => {
    const tc = toothColor(n);
    const isSel = selected.includes(n);
    const isPulse = pulsingTeeth.includes(n);
    const inRegion = visibleSet.has(n);
    const focusDim = focusMode && selected.length === 1 && !isSel;
    const dimmed = focusDim || (!inRegion && region !== "full" && !isSel);
    const ringColor = isSel ? accent : (inRegion && region !== "full" ? accent : tc.border);
    const ringWidth = isSel ? "2.5px" : "2px";
    const bgFill = isSel ? `${accent}1F` : (inRegion && region !== "full" ? `${accent}10` : tc.bg);
    const c = (count - 1) / 2;
    const t = c > 0 ? (i - c) / c : 0;
    const rot = arch ? t * 13 * (upper ? 1 : -1) : 0;
    const dy = arch ? t * t * 24 * (upper ? 1 : -1) : 0;
    const midGap = arch && i === count / 2 ? 14 : (i === count / 2 ? 16 : 0);
    const showTxOverlay = tc.showTx !== false;
    const showObs = tc.showObs !== false;
    const variant = toothVariant(n);
    return (
      <div key={n} style={{ transform: `translateY(${dy}px) rotate(${rot}deg)`, transition: "transform .3s ease", marginLeft: midGap, position: "relative" }}>
        <button
          type="button"
          onClick={() => pickTooth(n)}
          onDoubleClick={() => onToothDoubleClick?.(n)}
          onMouseEnter={(e) => enterTooth(n, e.currentTarget)}
          onMouseLeave={leaveTooth}
          className={`tw-tooth-btn${isPulse ? " tw-tooth-pulse" : ""}`}
          style={{
            width: 64, minHeight: 96, borderRadius: 12, cursor: "pointer", fontFamily: "inherit", position: "relative",
            border: `${ringWidth} solid ${ringColor}`,
            background: bgFill,
            boxShadow: isSel ? `0 4px 14px ${accent}33` : (inRegion && region !== "full" ? `0 2px 8px ${accent}22` : "0 1px 3px rgba(15,23,42,.08)"),
            padding: "4px 2px 6px",
            opacity: dimmed ? 0.38 : 1,
            filter: dimmed ? "saturate(0.4)" : "none",
            transition: "opacity .2s, filter .2s, border-color .15s, background .15s, box-shadow .15s, transform .15s",
          }}
        >
          <ToothSvg variant={variant} selected={isSel || (inRegion && region !== "full")} border={ringColor} bg={bgFill} />
          {showObs && tc.examSurfaces && tc.examSurfaces.length > 0 && <ExamSurfaceDots surfaces={tc.examSurfaces} variant={variant} />}
          {showTxOverlay && <ToothStatusMarker kind={tc.kind} variant={variant} />}
          <div style={{ fontWeight: 900, fontSize: 13, color: tc.done ? "#065F46" : (isSel ? accent : "#0F172A"), marginTop: 2 }}>{n}</div>
          {tc.label && showTxOverlay && (
            <div style={{ fontSize: 10, fontWeight: 800, color: tc.done ? "#059669" : (tc.prog ? "#D97706" : accent), marginTop: 1, lineHeight: 1.1, maxWidth: 58, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tc.label}>{tc.label}</div>
          )}
          {isSel && <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", width: 16, height: 16, borderRadius: "50%", background: accent, color: "#fff", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>}
          {tc.hasIssue && <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />}
        </button>
      </div>
    );
  };

  // Fixed-position hover card — escapes overflow:auto so it's never clipped
  const hoverCard = (() => {
    if (hoverTooth == null || !hoverRect) return null;
    const tc = toothColor(hoverTooth);
    if (!tc.card || (tc.card.exam.length + tc.card.diag.length + tc.card.tx.length) === 0) return null;
    const W = 200;
    const left = Math.max(8, Math.min(hoverRect.x - W / 2, (typeof window !== "undefined" ? window.innerWidth : 1200) - W - 8));
    return (
      <div style={{
        position: "fixed", top: hoverRect.y - 10, left, width: W, transform: "translateY(-100%)",
        zIndex: 1000, background: "#fff", color: "#0F172A", borderRadius: 12, padding: "10px 12px",
        textAlign: "left", boxShadow: "0 10px 30px rgba(15,23,42,.22)", pointerEvents: "none", border: "1px solid #E2E8F0",
      }}>
        <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 6 }}>Tooth {hoverTooth}</div>
        {[
          { label: "Exam", items: tc.card.exam.map(x => ({ t: x, s: undefined as string | undefined })), color: "#B45309", bg: "#FEF3C7" },
          { label: "Diagnosis", items: tc.card.diag.map(x => ({ t: x, s: undefined as string | undefined })), color: "#9A3412", bg: "#FFEDD5" },
          { label: "Treatment", items: tc.card.tx.map(x => ({ t: x.name, s: x.status })), color: "#0E7C7B", bg: "#E8F5F5" },
        ].map(sec => sec.items.length > 0 && (
          <div key={sec.label} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#94A3B8", marginBottom: 3 }}>{sec.label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {sec.items.map((it: any, k: number) => (
                <span key={k} style={{ background: sec.bg, color: sec.color, borderRadius: 6, padding: "2px 7px", fontSize: 10.5, fontWeight: 700 }}>
                  {it.s === "completed" ? "✓ " : it.s === "in_progress" ? "⏳ " : ""}{it.t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  })();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {onChildChange && (
            <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 3 }}>
              {[["Adult", false], ["Pedo", true]].map(([l, v]) => (
                <button key={String(l)} type="button" onClick={() => onChildChange(v as boolean)}
                  style={{ border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 800, fontSize: 12,
                    background: child === v ? accent : "transparent", color: child === v ? "#fff" : "#64748B", fontFamily: "inherit" }}>{l}</button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 3 }}>
            {[["Arch", true], ["Grid", false]].map(([l, v]) => (
              <button key={String(l)} type="button" onClick={() => setArch(v as boolean)}
                style={{ border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 800, fontSize: 12,
                  background: arch === v ? accent : "transparent", color: arch === v ? "#fff" : "#64748B", fontFamily: "inherit" }}>{l}</button>
            ))}
          </div>
          {onMultiSelectChange && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#475569", cursor: "pointer" }}>
              Multi select
              <input type="checkbox" checked={multiSelect} onChange={e => onMultiSelectChange(e.target.checked)} style={{ accentColor: accent, width: 16, height: 16 }} />
            </label>
          )}
          {headerExtra}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {regions.map(r => (
          <button key={r.id} type="button" onClick={() => selectRegion(r.id)}
            style={{
              border: region === r.id ? `2px solid ${accent}` : "1.5px solid #CBD5E1",
              background: region === r.id ? accent : "#fff",
              color: region === r.id ? "#fff" : "#334155",
              borderRadius: 999, padding: "6px 14px", cursor: "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit",
            }}>{r.label}</button>
        ))}
        <button type="button" onClick={clearSelection} style={{ border: "1.5px solid #FCA5A5", background: "#fff", color: "#B91C1C", borderRadius: 999, padding: "6px 14px", cursor: "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit", marginLeft: "auto" }}>Clear Selection</button>
      </div>

      <style>{`
        .tw-tooth-btn:hover { transform: translateY(-3px) scale(1.05); z-index: 2; }
        @keyframes tw-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(14,124,123,.45); }
          50% { box-shadow: 0 0 0 10px rgba(14,124,123,0); }
        }
        .tw-tooth-pulse { animation: tw-pulse-ring 1.2s ease infinite; }
      `}</style>

      {showUpper && (() => {
        const row = [...Q[0], ...Q[1]];
        return (
          <div style={{ marginBottom: arch ? 4 : 10, paddingBottom: arch ? 28 : 0, overflowX: "auto" }}>
            <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#94A3B8", letterSpacing: 1, marginBottom: 6 }}>UPPER</div>
            <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: arch ? "nowrap" : "wrap", minWidth: arch ? 0 : undefined }}>
              {row.map((n, i) => renderTooth(n, i, row.length, true))}
            </div>
          </div>
        );
      })()}

      {showLower && (() => {
        const row = [...Q[2], ...Q[3]];
        return (
          <div style={{ paddingTop: arch ? 28 : 0, overflowX: "auto" }}>
            <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#94A3B8", letterSpacing: 1, marginBottom: 6 }}>LOWER</div>
            <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: arch ? "nowrap" : "wrap" }}>
              {row.map((n, i) => renderTooth(n, i, row.length, false))}
            </div>
          </div>
        );
      })()}

      {selected.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: accent }}>
          Selected: {selected.join(", ")} ({selected.length} tooth{selected.length !== 1 ? "s" : ""})
        </div>
      )}
      {hoverCard}
    </div>
  );
}
