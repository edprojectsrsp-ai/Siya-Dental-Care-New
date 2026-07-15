"use client";
// Premium dark "Select Tooth" experience wrapping the 3D arch — matches the
// reference: view presets, arch filter, Selected Tooth detail card, legend,
// quick-select row. Lazy-loads the heavy 3D canvas.
import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { teethForRegion, type ChartRegion } from "@/components/ToothWidget";

const DentalArch3D = dynamic(() => import("./DentalArch3D").then(m => m.DentalArch3D), {
  ssr: false,
  loading: () => <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#7DA2C9", fontWeight: 700 }}>Loading 3D mouth…</div>,
});

const TOOTH_NAME: Record<number, string> = {
  1: "Central Incisor", 2: "Lateral Incisor", 3: "Canine",
  4: "1st Premolar", 5: "2nd Premolar", 6: "1st Molar", 7: "2nd Molar", 8: "3rd Molar (Wisdom)",
};
function toothInfo(n: number) {
  const q = Math.floor(n / 10), pos = n % 10;
  const quadrant = q === 1 ? "Upper Right" : q === 2 ? "Upper Left" : q === 3 ? "Lower Left" : q === 4 ? "Lower Right"
    : q === 5 ? "Upper Right (baby)" : q === 6 ? "Upper Left (baby)" : q === 7 ? "Lower Left (baby)" : "Lower Right (baby)";
  const type = pos <= 2 ? "Incisor" : pos === 3 ? "Canine" : pos <= 5 ? "Premolar" : "Molar";
  return { quadrant, type, name: TOOTH_NAME[pos] || "Tooth" };
}

const VIEWS: [string, string][] = [["3d", "3D"], ["top", "Top"], ["bottom", "Bottom"], ["left", "Left"], ["right", "Right"], ["front", "Front"]];

export default function Tooth3DPanel({
  child, onChildChange, selected, onSelectedChange, toothColor, multiSelect, accent = "#3B82F6",
  chartOnly = false,
}: {
  child: boolean;
  onChildChange?: (v: boolean) => void;
  selected: number[];
  onSelectedChange: (teeth: number[]) => void;
  toothColor: (n: number) => any;
  multiSelect?: boolean;
  accent?: string;
  /** Hide built-in right sidebar — clinical panel sits beside the chart instead */
  chartOnly?: boolean;
}) {
  const [preset, setPreset] = useState("3d");
  const [arch, setArch] = useState<"both" | "upper" | "lower">("both");
  const primary = selected.length ? selected[selected.length - 1] : null;
  const info = primary != null ? toothInfo(primary) : null;

  const pick = (n: number) => {
    if (multiSelect) onSelectedChange(selected.includes(n) ? selected.filter(x => x !== n) : [...selected, n].sort((a, b) => a - b));
    else onSelectedChange(selected.includes(n) && selected.length === 1 ? [] : [n]);
  };
  const addRegion = (r: ChartRegion) => {
    const teeth = teethForRegion(r, child);
    onSelectedChange(multiSelect ? Array.from(new Set([...selected, ...teeth])).sort((a, b) => a - b) : teeth);
  };

  const C = { panel: "#0F2038", panelBorder: "#1E3A5F", ink: "#E6EEF8", mute: "#7DA2C9", chipBg: "#16294420", chipBorder: "#24425F" };
  const segBtn = (activeCond: boolean): React.CSSProperties => ({
    background: activeCond ? accent : "transparent", color: activeCond ? "#fff" : C.mute,
    border: "none", borderRadius: 9, padding: "8px 12px", cursor: "pointer", fontWeight: 800, fontSize: 12.5, fontFamily: "inherit", width: "100%", textAlign: "left",
  });
  const pillBtn: React.CSSProperties = { background: "#152A47", color: C.ink, border: `1px solid ${C.panelBorder}`, borderRadius: 10, padding: "9px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12.5, fontFamily: "inherit" };

  const legend: [string, string][] = [
    ["#38BDF8", "Selected"], ["#34D399", "Treatment planned"], ["#FBBF24", "In treatment"],
    ["#A78BFA", "Completed"], ["#F87171", "Affected"], ["#94A3B8", "Missing"],
  ];

  const gridCols = chartOnly ? "140px 1fr" : "160px 1fr 240px";
  const canvasMinH = chartOnly ? 420 : 480;

  return (
    <div style={{ background: "#0A1628", borderRadius: 20, padding: 16, color: C.ink, fontFamily: "inherit" }}>
      <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 14, minHeight: chartOnly ? 440 : 520 }}>

        {/* ── LEFT: adult/child, view, arch ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 12, padding: 4, gap: 4 }}>
            {[["Adult", false], ["Child", true]].map(([l, v]) => (
              <button key={String(l)} onClick={() => onChildChange?.(v as boolean)}
                style={{ ...segBtn(child === v), textAlign: "center", padding: "8px 0" }}>{l as string}</button>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.mute, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>View</div>
            <div style={{ background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 12, padding: 5, display: "flex", flexDirection: "column", gap: 2 }}>
              {VIEWS.map(([id, label]) => (
                <button key={id} onClick={() => setPreset(id)} style={segBtn(preset === id)}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.mute, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Arch</div>
            <div style={{ background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 12, padding: 5, display: "flex", flexDirection: "column", gap: 2 }}>
              {(["both", "upper", "lower"] as const).map(a => (
                <button key={a} onClick={() => setArch(a)} style={segBtn(arch === a)}>{a[0].toUpperCase() + a.slice(1)}</button>
              ))}
            </div>
          </div>

          <button onClick={() => onSelectedChange([])} style={{ ...pillBtn, color: "#F87171", borderColor: "#7F1D1D", textAlign: "center" }}>Clear Selection</button>
        </div>

        {/* ── CENTER: the 3D canvas ── */}
        <div style={{ position: "relative", background: "radial-gradient(120% 90% at 50% 20%, #12253F 0%, #0A1628 70%)", borderRadius: 16, border: `1px solid ${C.panelBorder}`, overflow: "hidden", minHeight: canvasMinH }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <DentalArch3D child={child} selected={selected} onSelectTooth={pick} toothColor={toothColor} arch={arch} preset={preset} />
          </div>
          <div style={{ position: "absolute", top: 12, left: 14, fontSize: 15, fontWeight: 900, letterSpacing: 0.3, pointerEvents: "none" }}>
            🦷 Select Tooth <span style={{ fontSize: 11, fontWeight: 600, color: C.mute }}> · drag to rotate</span>
          </div>
        </div>

        {/* ── RIGHT: Selected Tooth + legend (hidden when clinical panel is beside chart) ── */}
        {!chartOnly && <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Selected Tooth</div>
            {info ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: accent, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 15 }}>{primary}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{info.quadrant}<br /><span style={{ color: C.mute, fontWeight: 600, fontSize: 12 }}>{info.name}</span></div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.mute, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Tooth Details</div>
                {[["Type", info.type], ["Position", info.quadrant], ["FDI Number", String(primary)]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.panelBorder}` }}>
                    <span style={{ color: C.mute }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
                {selected.length > 1 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: C.mute }}>{selected.length} teeth selected: {selected.join(", ")}</div>
                )}
              </>
            ) : (
              <div style={{ color: C.mute, fontSize: 13, lineHeight: 1.6, padding: "16px 0" }}>Tap a tooth in the 3D model to see details and record clinical work.</div>
            )}
          </div>

          <div style={{ background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Legend</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px" }}>
              {legend.map(([c, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: C.mute }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />{l}
                </div>
              ))}
            </div>
          </div>
        </div>}
      </div>

      {/* ── Quick select row ── */}
      <div style={{ marginTop: 14, background: C.panel, border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 10 }}>Quick Select</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={pillBtn} onClick={() => onSelectedChange(child ? [] : [11, 12, 21, 22, 31, 32, 41, 42])}>All Incisors</button>
          <button style={pillBtn} onClick={() => onSelectedChange(child ? [] : [13, 23, 33, 43])}>All Canines</button>
          <button style={pillBtn} onClick={() => onSelectedChange(child ? [] : [14, 15, 24, 25, 34, 35, 44, 45])}>All Premolars</button>
          <button style={pillBtn} onClick={() => onSelectedChange(child ? [] : [16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48])}>All Molars</button>
          <button style={pillBtn} onClick={() => addRegion("upper")}>Upper Arch</button>
          <button style={pillBtn} onClick={() => addRegion("lower")}>Lower Arch</button>
          <button style={{ ...pillBtn, color: "#F87171" }} onClick={() => onSelectedChange([])}>Clear All</button>
        </div>
      </div>
    </div>
  );
}
