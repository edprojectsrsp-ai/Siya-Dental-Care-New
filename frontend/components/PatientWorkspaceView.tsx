"use client";
/**
 * components/PatientWorkspaceView.tsx — Sprint P1
 *
 * Read-only embedded workspace view for the Patient Database "Workspace" tab.
 * Shows the doctor:
 *   • Tooth chart with status-coloured teeth (cavity / RCT / crown / implant / missing / filling)
 *   • Active treatment plan items
 *   • Per-tooth exam + diagnosis observations
 *
 * No edits here — to modify, doctor uses the action bar's "Open Workspace" button
 * which takes them to the full TreatmentWorkspace.
 */

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { ToothWidget, ChartRegion } from "@/components/ToothWidget";

const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const fmtINR = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

// Status → visual style for tooth chart paint
const KIND_STYLE: Record<string, { bg: string; border: string; label: string; icon: string }> = {
  cavity:     { bg: "#FEE2E2", border: "#DC2626", label: "Cavity",     icon: "•" },
  filling:    { bg: "#DBEAFE", border: "#1E40AF", label: "Filling",    icon: "■" },
  rct:        { bg: "#FED7AA", border: "#C2410C", label: "RCT",        icon: "✚" },
  crown:      { bg: "#FEF3C7", border: "#B45309", label: "Crown",      icon: "♔" },
  bridge:     { bg: "#FEF3C7", border: "#B45309", label: "Bridge",     icon: "═" },
  implant:    { bg: "#E0E7FF", border: "#4338CA", label: "Implant",    icon: "⚙" },
  extraction: { bg: "#F1F5F9", border: "#475569", label: "Extracted",  icon: "✕" },
  missing:    { bg: "#F1F5F9", border: "#475569", label: "Missing",    icon: "—" },
  scaling:    { bg: "#D1FAE5", border: "#047857", label: "Scaling",    icon: "✓" },
  veneer:     { bg: "#FDF4FF", border: "#9333EA", label: "Veneer",     icon: "▮" },
  other:      { bg: "#F0FDFA", border: "#0E7C7B", label: "Treatment",  icon: "•" },
};

export function PatientWorkspaceView({ patientId, accent }: { patientId: string; accent: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<ChartRegion>("full");
  const [child, setChild] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);

  useEffect(() => {
    setLoading(true);
    api.pdbWorkspaceSnapshot(patientId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <div style={{ padding: 40, textAlign: "center" as const, color: MUTE }}>⏳ Loading workspace…</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center" as const, color: MUTE }}>No workspace data available.</div>;

  const items = data.items || [];
  const tt = data.tooth_treatments || [];
  const tc = data.tooth_conditions || [];
  const tex = data.tooth_examinations || [];
  const tdx = data.tooth_diagnoses || [];

  // Build per-tooth style lookup
  const toothColor = (n: number) => {
    const treat = tt.find((t: any) => t.tooth === n);
    if (treat) {
      const kind = treat.kind || "other";
      const style = KIND_STYLE[kind] || KIND_STYLE.other;
      const done = treat.status === "completed";
      return {
        bg: style.bg, border: style.border, done, hasIssue: !done,
        hasExam: false, hasDiag: false, planned: !done, prog: false,
      };
    }
    const cond = tc.find((c: any) => c.tooth === n);
    const exam = tex.find((e: any) => e.tooth === n);
    const diag = tdx.find((d: any) => d.tooth === n);
    if (cond || diag) {
      return { bg: "#FEE2E2", border: "#EF4444", hasIssue: true, hasExam: !!exam, hasDiag: !!diag };
    }
    if (exam) {
      return { bg: "#FEF3C7", border: "#F59E0B", hasIssue: true, hasExam: true, hasDiag: false };
    }
    return { bg: "#fff", border: "#CBD5E1" };
  };

  // Group active legend by kind that actually appears
  const presentKinds = Array.from(new Set(tt.map((t: any) => t.kind || "other")));

  // Selected-tooth detail
  const focusTooth = selectedTeeth.length === 1 ? selectedTeeth[0] : null;
  const focusExams = focusTooth ? tex.filter((e: any) => e.tooth === focusTooth) : [];
  const focusDiags = focusTooth ? tdx.filter((d: any) => d.tooth === focusTooth) : [];
  const focusTreat = focusTooth ? tt.find((t: any) => t.tooth === focusTooth) : null;

  return (
    <div>
      {/* Plan summary */}
      {data.plan && (
        <div style={{
          background: `linear-gradient(135deg, ${accent}10, transparent)`,
          border: `1px solid ${accent}33`, borderRadius: 14, padding: 14, marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <b style={{ fontSize: 15, color: INK }}>📑 {data.plan.name}</b>
            <span style={{ fontSize: 13, color: accent, fontWeight: 700 }}>
              {fmtINR(data.plan.total_value)} planned
            </span>
          </div>
          <div style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>
            Status: {data.plan.status} · {items.length} treatment item{items.length === 1 ? "" : "s"}
          </div>
        </div>
      )}
      {!data.plan && (
        <div style={{
          background: "#F8FAFC", border: `1px dashed ${LINE}`, borderRadius: 14, padding: 14,
          marginBottom: 16, textAlign: "center" as const, color: MUTE, fontSize: 13,
        }}>
          No active treatment plan. Use "Open Workspace" above to create one.
        </div>
      )}

      {/* Tooth chart (read-only style) */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <ToothWidget
          child={child}
          onChildChange={setChild}
          multiSelect={false}
          region={region}
          onRegionChange={setRegion}
          selected={selectedTeeth}
          onSelectedChange={setSelectedTeeth}
          toothColor={toothColor}
          accent={accent}
          headerExtra={
            <span style={{ fontSize: 11, color: MUTE, fontWeight: 700 }}>read-only · tap a tooth to see notes</span>
          }
        />

        {/* Legend — only show kinds present on this patient */}
        {presentKinds.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${LINE}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, marginBottom: 6, letterSpacing: 0.5 }}>LEGEND</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {presentKinds.map((k: string) => {
                const s = KIND_STYLE[k] || KIND_STYLE.other;
                return (
                  <span key={k} style={{
                    background: s.bg, border: `1.5px solid ${s.border}`, color: s.border,
                    padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  }}>{s.icon} {s.label}</span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected-tooth panel */}
      {focusTooth && (focusTreat || focusExams.length > 0 || focusDiags.length > 0) && (
        <div style={{ background: "#F0FDFA", border: `1px solid ${accent}55`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <b style={{ fontSize: 14 }}>🦷 Tooth {focusTooth}</b>
          {focusTreat && (
            <div style={{ marginTop: 8, fontSize: 13, color: INK }}>
              <b>Treatment:</b> {focusTreat.treatment} <span style={{ color: MUTE }}>· {focusTreat.status}</span>
            </div>
          )}
          {focusExams.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, letterSpacing: 0.5 }}>EXAMINATION</div>
              {focusExams.map((e: any) => (
                <div key={e.id} style={{ fontSize: 12, color: INK, marginTop: 2 }}>• {e.finding}{e.notes ? ` — ${e.notes}` : ""}</div>
              ))}
            </div>
          )}
          {focusDiags.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, letterSpacing: 0.5 }}>DIAGNOSIS</div>
              {focusDiags.map((d: any) => (
                <div key={d.id} style={{ fontSize: 12, color: INK, marginTop: 2 }}>• {d.diagnosis}{d.notes ? ` — ${d.notes}` : ""}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Treatment plan items */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <b style={{ fontSize: 14, color: INK }}>🧩 Treatment items</b>
          <span style={{ fontSize: 12, color: MUTE }}>{items.length} item{items.length === 1 ? "" : "s"}</span>
        </div>
        {items.length === 0 && (
          <div style={{ padding: 22, textAlign: "center" as const, color: MUTE, fontSize: 13 }}>No items yet.</div>
        )}
        {items.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" as const, marginTop: 10 }}>
            <thead><tr>
              {["Treatment", "Teeth", "Status", "Rate", "Final"].map(h =>
                <th key={h} style={{ padding: 8, textAlign: "left" as const, fontSize: 11, color: MUTE, borderBottom: `1px solid ${LINE}` }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map((it: any) => (
                <tr key={it.id}>
                  <td style={{ padding: 10, fontSize: 13, borderBottom: `1px solid #F1F5F9` }}>
                    <b>{it.treatment_name}</b>
                    {it.diagnosis && <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>{it.diagnosis}</div>}
                  </td>
                  <td style={{ padding: 10, fontSize: 12, color: MUTE, borderBottom: `1px solid #F1F5F9` }}>
                    {it.area_label || (it.teeth?.length ? it.teeth.join(", ") : "—")}
                  </td>
                  <td style={{ padding: 10, fontSize: 11, borderBottom: `1px solid #F1F5F9` }}>
                    <span style={{
                      background: it.status === "completed" ? "#D1FAE5" : "#FEF3C7",
                      color: it.status === "completed" ? "#065F46" : "#92400E",
                      padding: "2px 9px", borderRadius: 999, fontWeight: 700,
                    }}>{it.status}</span>
                  </td>
                  <td style={{ padding: 10, fontSize: 13, borderBottom: `1px solid #F1F5F9` }}>{fmtINR(it.doctor_rate)}</td>
                  <td style={{ padding: 10, fontSize: 13, fontWeight: 700, borderBottom: `1px solid #F1F5F9` }}>{fmtINR(it.final_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
