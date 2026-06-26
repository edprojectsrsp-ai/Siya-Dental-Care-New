"use client";
import { useState, useCallback } from "react";
import { TOOTH_NUMBERS } from "@/lib/dental-data";

// ═══════════════════════════════════════════════════════
// CONSTANTS & TYPES
// ═══════════════════════════════════════════════════════

// FDI tooth → plain-English name
const TOOTH_NAMES: Record<string, string> = {
  "1": "Central Incisor", "2": "Lateral Incisor", "3": "Canine",
  "4": "1st Premolar", "5": "2nd Premolar", "6": "1st Molar",
  "7": "2nd Molar", "8": "3rd Molar (Wisdom)",
};

export function toothLabel(id: string): string {
  if (!id || id.length !== 2) return id;
  const quad = id[0], pos = id[1];
  const side = ({ "1": "Upper Right", "2": "Upper Left", "3": "Lower Left", "4": "Lower Right" } as any)[quad] || "";
  return `${side} ${TOOTH_NAMES[pos] || ""}`.trim();
}

// Condition types and colours
export type ToothCondition = "caries" | "filling" | "crown" | "rct" | "missing" | "implant";

export const CONDITION_COLORS: Record<ToothCondition, string> = {
  caries:  "#EF4444",
  filling: "#3B82F6",
  crown:   "#8B5CF6",
  rct:     "#F59E0B",
  missing: "#94A3B8",
  implant: "#14B8A6",
};

export const CONDITION_LABELS: Record<ToothCondition, string> = {
  caries:  "Caries / Decay",
  filling: "Filling",
  crown:   "Crown",
  rct:     "Root Canal (RCT)",
  missing: "Missing / Extracted",
  implant: "Implant",
};

const CONDITIONS: ToothCondition[] = ["caries", "filling", "crown", "rct", "missing", "implant"];

export interface ToothMark {
  color: string;
  label?: string;
  condition?: ToothCondition;
}

// ═══════════════════════════════════════════════════════
// TOOTH POSITIONS — arch curves for anatomical realism
// ═══════════════════════════════════════════════════════

interface ToothPos { id: string; x: number; y: number; w: number; h: number }

function buildArchPositions(): { upper: ToothPos[]; lower: ToothPos[] } {
  const upperIds = [...TOOTH_NUMBERS.upperRight, ...TOOTH_NUMBERS.upperLeft]; // 18..11, 21..28
  const lowerIds = [...TOOTH_NUMBERS.lowerRight, ...TOOTH_NUMBERS.lowerLeft]; // 48..41, 31..38

  // SVG viewbox = 820 x 400; centre = 410
  const cx = 410;
  const spacing = 46;
  const halfTeeth = 8; // per side

  const makeArch = (ids: string[], baseY: number, curveDir: number): ToothPos[] => {
    return ids.map((id, i) => {
      // i 0-15, map so centre gap is between i=7 and i=8
      const offset = i - 7.5;                        // -7.5 … +7.5
      const x = cx + offset * spacing;
      // parabolic arch
      const y = baseY + curveDir * (offset * offset) * 0.65;
      // Molars wider, incisors narrower
      const pos = parseInt(id[1]);
      const w = pos >= 6 ? 38 : pos >= 4 ? 34 : pos === 3 ? 32 : 30;
      const h = pos >= 6 ? 42 : pos >= 4 ? 38 : 36;
      return { id, x, y, w, h };
    });
  };

  return {
    upper: makeArch(upperIds, 140, -1),  // curve upward
    lower: makeArch(lowerIds, 280, 1),   // curve downward
  };
}

const ARCH = buildArchPositions();
const ALL_TEETH = [...ARCH.upper, ...ARCH.lower];

// ═══════════════════════════════════════════════════════
// SVG TOOTH COMPONENT
// ═══════════════════════════════════════════════════════

function SvgTooth({ t, mark, selected, onClick }: {
  t: ToothPos;
  mark?: ToothMark;
  selected: boolean;
  onClick: () => void;
}) {
  const isMissing = mark?.condition === "missing";
  const baseFill = mark ? mark.color : "#F1F5F9";
  const stroke = selected ? "#0E7C7B" : (mark ? mark.color : "#CBD5E1");
  const strokeW = selected ? 3.5 : 1.8;

  // Modern "image-like" tooth with gradient for 3D crown effect + subtle root hint
  const gradId = `toothGrad-${t.id}`;
  const crownFill = isMissing ? "transparent" : `url(#${gradId})`;

  return (
    <g
      onClick={onClick}
      style={{ cursor: "pointer", transition: "transform .1s" }}
      role="button"
      aria-label={`Tooth ${t.id} – ${toothLabel(t.id)}${mark?.label ? ` – ${mark.label}` : ""}`}
      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={baseFill} />
          <stop offset="45%" stopColor={baseFill} />
          <stop offset="100%" stopColor={mark ? "#fff" : "#E2E8F0"} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Main tooth body - rounded "crown" with slight 3D */}
      <rect
        x={t.x - t.w / 2}
        y={t.y - t.h / 2}
        width={t.w}
        height={t.h}
        rx={t.w > 34 ? 10 : 7}
        ry={t.w > 34 ? 12 : 8}
        fill={crownFill}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeDasharray={isMissing ? "5 3" : "none"}
        opacity={isMissing ? 0.4 : 1}
        filter={selected ? "drop-shadow(0 2px 4px rgba(14,124,123,0.25))" : "none"}
      />

      {/* Subtle enamel highlight for realistic image look */}
      {!isMissing && (
        <rect
          x={t.x - t.w / 2 + 3}
          y={t.y - t.h / 2 + 3}
          width={t.w - 6}
          height={t.h * 0.35}
          rx={4}
          fill="#ffffff"
          opacity={0.25}
        />
      )}

      {/* Selection ring - modern glow */}
      {selected && (
        <rect
          x={t.x - t.w / 2 - 4}
          y={t.y - t.h / 2 - 4}
          width={t.w + 8}
          height={t.h + 8}
          rx={t.w > 34 ? 13 : 10}
          fill="none"
          stroke="#0E7C7B"
          strokeWidth={2.5}
          opacity={0.4}
        />
      )}

      {/* Missing indicator - clean X */}
      {isMissing && (
        <>
          <line x1={t.x - t.w / 2.8} y1={t.y - t.h / 2.8} x2={t.x + t.w / 2.8} y2={t.y + t.h / 2.8} stroke="#64748B" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={t.x + t.w / 2.8} y1={t.y - t.h / 2.8} x2={t.x - t.w / 2.8} y2={t.y + t.h / 2.8} stroke="#64748B" strokeWidth={2.5} strokeLinecap="round" />
        </>
      )}

      {/* Condition badge / dot - image-like status overlay */}
      {mark && !isMissing && (
        <g>
          <circle cx={t.x + t.w / 2 - 4} cy={t.y - t.h / 2 + 6} r={5.5} fill="#fff" stroke={mark.color} strokeWidth={1.5} />
          <circle cx={t.x + t.w / 2 - 4} cy={t.y - t.h / 2 + 6} r={2.5} fill={mark.color} />
        </g>
      )}

      {/* Large clear tooth number - professional image label */}
      <text
        x={t.x}
        y={t.y + 4}
        textAnchor="middle"
        fill={mark && !isMissing ? "#fff" : "#1E293B"}
        fontSize={t.w > 34 ? 13 : 11}
        fontWeight={800}
        fontFamily="'Outfit', system-ui, sans-serif"
        style={{ pointerEvents: "none", userSelect: "none", textShadow: mark && !isMissing ? "0 1px 2px rgba(0,0,0,0.3)" : "none" }}
      >
        {t.id}
      </text>
    </g>
  );
}

// ═══════════════════════════════════════════════════════
// COMPACT TOOTH CHART — for TreatmentPlanModal embedding
// ═══════════════════════════════════════════════════════

export function ToothChart({
  marks = {}, selected, onSelect,
}: {
  marks?: Record<string, ToothMark>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{
      background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16,
      padding: "8px 4px", overflowX: "auto",
    }}>
      <svg
        width="100%"
        height="320"
        viewBox="0 0 820 400"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        {/* Labels */}
        <text x="50" y="155" textAnchor="middle" fill="#94A3B8" fontSize={11} fontWeight={700} fontFamily="'Outfit',sans-serif">RIGHT</text>
        <text x="770" y="155" textAnchor="middle" fill="#94A3B8" fontSize={11} fontWeight={700} fontFamily="'Outfit',sans-serif">LEFT</text>
        <text x="410" y="30" textAnchor="middle" fill="#94A3B8" fontSize={12} fontWeight={700} fontFamily="'Outfit',sans-serif">UPPER JAW (MAXILLA)</text>
        <text x="410" y="390" textAnchor="middle" fill="#94A3B8" fontSize={12} fontWeight={700} fontFamily="'Outfit',sans-serif">LOWER JAW (MANDIBLE)</text>

        {/* Midline */}
        <line x1="410" y1="80" x2="410" y2="340" stroke="#E2E8F0" strokeWidth={1} strokeDasharray="6 4" />

        {/* Upper teeth */}
        {ARCH.upper.map(t => (
          <SvgTooth
            key={t.id}
            t={t}
            mark={marks[t.id]}
            selected={selected === t.id}
            onClick={() => onSelect(t.id)}
          />
        ))}

        {/* Lower teeth */}
        {ARCH.lower.map(t => (
          <SvgTooth
            key={t.id}
            t={t}
            mark={marks[t.id]}
            selected={selected === t.id}
            onClick={() => onSelect(t.id)}
          />
        ))}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FULL INTERACTIVE TOOTH CHART — standalone page section
// ═══════════════════════════════════════════════════════

export function InteractiveToothChart({
  patientName,
  patientAge,
  accentColor = "#10B981",
  show,
}: {
  patientName?: string;
  patientAge?: number;
  accentColor?: string;
  show?: (msg: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [chartData, setChartData] = useState<Record<string, ToothCondition>>({});
  const [log, setLog] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"full" | "upper" | "lower">("full");

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);
  }, []);

  const marks: Record<string, ToothMark> = {};
  Object.entries(chartData).forEach(([id, cond]) => {
    marks[id] = { color: CONDITION_COLORS[cond], label: CONDITION_LABELS[cond], condition: cond };
  });

  const handleSelect = (id: string) => {
    setSelected(prev => prev === id ? null : id);
  };

  const markTooth = (condition: ToothCondition) => {
    if (!selected) { show?.("Select a tooth first"); return; }
    setChartData(prev => ({ ...prev, [selected]: condition }));
    addLog(`Marked #${selected} (${toothLabel(selected)}) as ${CONDITION_LABELS[condition]}`);
    show?.(`#${selected} marked as ${CONDITION_LABELS[condition]}`);
  };

  const clearTooth = () => {
    if (!selected) return;
    setChartData(prev => {
      const next = { ...prev };
      delete next[selected];
      return next;
    });
    addLog(`Cleared #${selected}`);
  };

  const clearAll = () => {
    if (Object.keys(chartData).length === 0) return;
    setChartData({});
    setLog([]);
    addLog("Chart cleared");
    show?.("Chart cleared");
  };

  const markedCount = Object.keys(chartData).length;

  // Build arch data filtered by view
  const upperTeeth = ARCH.upper;
  const lowerTeeth = ARCH.lower;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>🦷 Interactive Tooth Chart</h1>
          {patientName && (
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
              {patientName}{patientAge ? ` • ${patientAge} years` : ""} • FDI Numbering
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={clearAll}
            style={{
              border: "2px solid #E2E8F0", borderRadius: 12, padding: "8px 16px",
              background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#64748b",
            }}
          >
            Clear All
          </button>
          <button
            onClick={() => show?.("✅ Tooth chart saved and linked to patient record!")}
            style={{
              border: "none", borderRadius: 12, padding: "8px 20px",
              background: accentColor, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700,
              boxShadow: `0 4px 12px ${accentColor}33`,
            }}
          >
            💾 Save Chart
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* Left — Chart */}
        <div>
          {/* View mode selector */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>
              Permanent Teeth (FDI System)
              {markedCount > 0 && (
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginLeft: 8 }}>
                  {markedCount} marked
                </span>
              )}
            </div>
            <select
              value={viewMode}
              onChange={(e: any) => setViewMode(e.target.value)}
              style={{
                border: "2px solid #E2E8F0", borderRadius: 10, padding: "6px 28px 6px 12px",
                fontSize: 13, fontWeight: 600, cursor: "pointer", appearance: "none" as any,
                background: "#fff url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394A3B8' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\") no-repeat right 10px center",
              }}
            >
              <option value="full">Full Mouth</option>
              <option value="upper">Upper Jaw Only</option>
              <option value="lower">Lower Jaw Only</option>
            </select>
          </div>

          {/* SVG Chart */}
          <div style={{
            background: "#fff", borderRadius: 20, padding: 16,
            border: "2px solid #E2E8F0", boxShadow: "0 2px 12px #0f172a06",
          }}>
            <svg
              width="100%"
              height={viewMode === "full" ? 380 : 220}
              viewBox={viewMode === "upper" ? "0 0 820 220" : viewMode === "lower" ? "0 200 820 220" : "0 0 820 420"}
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block" }}
            >
              {/* Gradient defs */}
              <defs>
                <linearGradient id="chart-bg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F8FAFC" />
                  <stop offset="100%" stopColor="#F1F5F9" />
                </linearGradient>
              </defs>

              {/* Background */}
              <rect x="0" y="0" width="820" height="420" fill="url(#chart-bg)" rx="16" />

              {/* Labels */}
              {(viewMode === "full" || viewMode === "upper") && (
                <>
                  <text x="410" y="50" textAnchor="middle" fill="#94A3B8" fontSize={13} fontWeight={800} fontFamily="'Outfit',sans-serif" letterSpacing="2">UPPER JAW (MAXILLA)</text>
                  <text x="55" y="140" textAnchor="middle" fill="#CBD5E1" fontSize={10} fontWeight={700} fontFamily="'Outfit',sans-serif" transform="rotate(-90, 55, 140)">RIGHT</text>
                  <text x="765" y="140" textAnchor="middle" fill="#CBD5E1" fontSize={10} fontWeight={700} fontFamily="'Outfit',sans-serif" transform="rotate(90, 765, 140)">LEFT</text>
                </>
              )}
              {(viewMode === "full" || viewMode === "lower") && (
                <>
                  <text x="410" y="385" textAnchor="middle" fill="#94A3B8" fontSize={13} fontWeight={800} fontFamily="'Outfit',sans-serif" letterSpacing="2">LOWER JAW (MANDIBLE)</text>
                  {viewMode === "lower" && (
                    <>
                      <text x="55" y="280" textAnchor="middle" fill="#CBD5E1" fontSize={10} fontWeight={700} fontFamily="'Outfit',sans-serif" transform="rotate(-90, 55, 280)">RIGHT</text>
                      <text x="765" y="280" textAnchor="middle" fill="#CBD5E1" fontSize={10} fontWeight={700} fontFamily="'Outfit',sans-serif" transform="rotate(90, 765, 280)">LEFT</text>
                    </>
                  )}
                </>
              )}

              {/* Midline */}
              <line x1="410" y1="60" x2="410" y2="370" stroke="#E2E8F0" strokeWidth={1} strokeDasharray="6 4" />

              {/* Arch guide lines */}
              {(viewMode === "full" || viewMode === "upper") && (
                <path
                  d={`M ${ARCH.upper[0].x} ${ARCH.upper[0].y} Q 410 ${ARCH.upper[7].y - 30} ${ARCH.upper[15].x} ${ARCH.upper[15].y}`}
                  fill="none" stroke="#E2E8F0" strokeWidth={1} strokeDasharray="4 4"
                />
              )}
              {(viewMode === "full" || viewMode === "lower") && (
                <path
                  d={`M ${ARCH.lower[0].x} ${ARCH.lower[0].y} Q 410 ${ARCH.lower[7].y + 30} ${ARCH.lower[15].x} ${ARCH.lower[15].y}`}
                  fill="none" stroke="#E2E8F0" strokeWidth={1} strokeDasharray="4 4"
                />
              )}

              {/* Upper teeth */}
              {(viewMode === "full" || viewMode === "upper") && upperTeeth.map(t => (
                <SvgTooth
                  key={t.id}
                  t={t}
                  mark={marks[t.id]}
                  selected={selected === t.id}
                  onClick={() => handleSelect(t.id)}
                />
              ))}

              {/* Lower teeth */}
              {(viewMode === "full" || viewMode === "lower") && lowerTeeth.map(t => (
                <SvgTooth
                  key={t.id}
                  t={t}
                  mark={marks[t.id]}
                  selected={selected === t.id}
                  onClick={() => handleSelect(t.id)}
                />
              ))}
            </svg>
          </div>

          {/* Legend */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, padding: "10px 14px",
            background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0",
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginRight: 4 }}>Legend:</span>
            {CONDITIONS.map(c => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 4,
                  background: c === "missing" ? "transparent" : CONDITION_COLORS[c],
                  border: `2px solid ${CONDITION_COLORS[c]}`,
                }} />
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{CONDITION_LABELS[c]}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: "#F1F5F9", border: "2px solid #CBD5E1" }} />
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Healthy</span>
            </div>
          </div>
        </div>

        {/* Right — Sidebar panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Selected tooth info */}
          <div style={{
            background: "#fff", borderRadius: 20, padding: 20,
            border: "1px solid #E2E8F0", textAlign: "center",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8", marginBottom: 8 }}>Selected Tooth</div>
            <div style={{ fontSize: 48, marginBottom: 4 }}>🦷</div>
            <div style={{
              fontSize: 32, fontWeight: 900,
              color: selected ? accentColor : "#CBD5E1",
            }}>
              {selected ? `#${selected}` : "—"}
            </div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 2 }}>
              {selected ? toothLabel(selected) : "Click on a tooth"}
            </div>
            {selected && chartData[selected] && (
              <div style={{
                marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
                background: CONDITION_COLORS[chartData[selected]] + "18",
                border: `1.5px solid ${CONDITION_COLORS[chartData[selected]]}`,
                borderRadius: 10, padding: "4px 12px", fontSize: 13, fontWeight: 700,
                color: CONDITION_COLORS[chartData[selected]],
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: CONDITION_COLORS[chartData[selected]],
                }} />
                {CONDITION_LABELS[chartData[selected]]}
              </div>
            )}
          </div>

          {/* Condition buttons */}
          <div style={{
            background: "#fff", borderRadius: 20, padding: 16,
            border: "1px solid #E2E8F0",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
              Mark Condition / Treatment
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  onClick={() => markTooth(c)}
                  style={{
                    border: `2px solid ${CONDITION_COLORS[c]}22`,
                    borderLeft: `4px solid ${CONDITION_COLORS[c]}`,
                    borderRadius: 12, padding: "10px 12px",
                    background: `${CONDITION_COLORS[c]}0A`,
                    cursor: "pointer", fontSize: 12, fontWeight: 700,
                    color: "#374151", textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.target as any).style.background = `${CONDITION_COLORS[c]}18`; }}
                  onMouseLeave={(e) => { (e.target as any).style.background = `${CONDITION_COLORS[c]}0A`; }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: CONDITION_COLORS[c],
                    display: "inline-block", marginRight: 6,
                  }} />
                  {CONDITION_LABELS[c]}
                </button>
              ))}
            </div>
            {selected && chartData[selected] && (
              <button
                onClick={clearTooth}
                style={{
                  width: "100%", marginTop: 8, padding: "8px",
                  border: "2px solid #E2E8F0", borderRadius: 10,
                  background: "#fff", cursor: "pointer", fontSize: 12,
                  fontWeight: 600, color: "#64748b",
                }}
              >
                ✕ Clear condition on #{selected}
              </button>
            )}
          </div>

          {/* Treatment plan link */}
          <div style={{
            background: "#fff", borderRadius: 20, padding: 16,
            border: "1px solid #E2E8F0",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
              Link to Treatment Plan
            </div>
            <input
              placeholder={selected ? `e.g. Root Canal on #${selected}` : "Select a tooth first…"}
              disabled={!selected}
              style={{
                width: "100%", border: "2px solid #E2E8F0", borderRadius: 12,
                padding: "10px 14px", fontSize: 14, outline: "none",
                boxSizing: "border-box" as any, marginBottom: 8,
                fontFamily: "inherit", background: selected ? "#fff" : "#F8FAFC",
              }}
            />
            <button
              onClick={() => show?.(`Linked to treatment plan for tooth #${selected}`)}
              disabled={!selected}
              style={{
                width: "100%", padding: 12, borderRadius: 12, border: "none",
                background: selected ? accentColor : "#CBD5E1",
                color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: selected ? "pointer" : "not-allowed",
                boxShadow: selected ? `0 4px 12px ${accentColor}33` : "none",
              }}
            >
              Add to Current Sitting
            </button>
          </div>

          {/* Activity log */}
          {log.length > 0 && (
            <div style={{
              background: "#fff", borderRadius: 16, padding: 14,
              border: "1px solid #E2E8F0", maxHeight: 200, overflowY: "auto",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 6 }}>Activity Log</div>
              {log.map((entry, i) => (
                <div key={i} style={{
                  fontSize: 11, color: "#64748b", padding: "3px 0",
                  borderBottom: i < log.length - 1 ? "1px solid #F1F5F9" : "none",
                }}>
                  {entry}
                </div>
              ))}
            </div>
          )}

          {/* Summary card */}
          {markedCount > 0 && (
            <div style={{
              background: `linear-gradient(135deg, ${accentColor}11, ${accentColor}08)`,
              borderRadius: 16, padding: 14, border: `1px solid ${accentColor}22`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, marginBottom: 6 }}>
                📊 Chart Summary
              </div>
              {CONDITIONS.filter(c => Object.values(chartData).includes(c)).map(c => {
                const count = Object.values(chartData).filter(v => v === c).length;
                return (
                  <div key={c} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
                    <span style={{ color: "#374151" }}>
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: CONDITION_COLORS[c], marginRight: 6 }} />
                      {CONDITION_LABELS[c]}
                    </span>
                    <span style={{ fontWeight: 700, color: CONDITION_COLORS[c] }}>{count} {count === 1 ? "tooth" : "teeth"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
