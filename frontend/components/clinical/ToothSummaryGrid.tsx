"use client";
import React, { useMemo } from "react";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0";
const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

const STATUS_LABEL: Record<string, string> = {
  advised: "Planned",
  planned: "Planned",
  in_progress: "In progress",
  completed: "Done",
};

export type ToothSummaryCard = {
  tooth: number;
  exam: string[];
  diag: string[];
  tx: { name: string; status: string; price?: number }[];
};

export function buildToothSummaryCards(W: any, planItems: any[] = []): ToothSummaryCard[] {
  const priceByToothTx = new Map<string, number>();
  (planItems || []).forEach((item: any) => {
    const teeth = item.teeth || [];
    teeth.forEach((t: number) => {
      priceByToothTx.set(`${t}:${(item.treatment_name || "").toLowerCase()}`, item.final_amount ?? item.doctor_rate ?? 0);
    });
  });

  const teeth = new Set<number>();
  [...(W?.tooth_examinations || []), ...(W?.tooth_diagnoses || []), ...(W?.tooth_treatments || [])].forEach((r: any) => {
    const t = r.tooth ?? r.tooth_number; if (t) teeth.add(t);
  });
  return Array.from(teeth).sort((a, b) => a - b).map(n => ({
    tooth: n,
    exam: (W?.tooth_examinations || []).filter((e: any) => (e.tooth ?? e.tooth_number) === n).map((e: any) => e.finding).filter(Boolean),
    diag: (W?.tooth_diagnoses || []).filter((d: any) => (d.tooth ?? d.tooth_number) === n).map((d: any) => d.diagnosis).filter(Boolean),
    tx: (W?.tooth_treatments || []).filter((t: any) => (t.tooth ?? t.tooth_number) === n).map((t: any) => {
      const name = t.treatment_name || t.treatment || "";
      const price = priceByToothTx.get(`${n}:${name.toLowerCase()}`);
      return { name, status: t.status, price };
    }).filter((t: any) => t.name),
  }));
}

/** Compact clinical lines for embedding in plan group headers */
export function ToothClinicalSummaryInline({ cards, accent }: { cards: ToothSummaryCard[]; accent: string }) {
  const lines = cards.filter(c => c.exam.length || c.diag.length || c.tx.length);
  if (!lines.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
      {lines.map(c => (
        <div key={c.tooth} style={{ fontSize: 12, lineHeight: 1.45, color: INK }}>
          {lines.length > 1 && (
            <span style={{ fontWeight: 900, color: accent, marginRight: 6 }}>#{c.tooth}</span>
          )}
          {c.exam.length > 0 && (
            <span><span style={{ fontWeight: 800, color: "#B45309" }}>Found:</span> {c.exam.slice(0, 2).join(" · ")}</span>
          )}
          {c.diag.length > 0 && (
            <span>{c.exam.length > 0 ? "  " : ""}<span style={{ fontWeight: 800, color: "#C2410C" }}>Dx:</span> {c.diag.slice(0, 2).join(" · ")}</span>
          )}
          {c.tx.length > 0 && (
            <span>{(c.exam.length || c.diag.length) ? "  " : ""}<span style={{ fontWeight: 800, color: accent }}>Tx:</span> {c.tx.slice(0, 2).map(t => t.name).join(" · ")}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Tooth-wise clinical summary — readable cards for doctors (non-tech friendly).
 * Used on Tooth Chart tab and Plan & Money tab.
 */
export default function ToothSummaryGrid({
  W, accent = "#0E7C7B", selectedTeeth = [], onSelectTooth, compact = false, planItems = [],
}: {
  W: any;
  accent?: string;
  selectedTeeth?: number[];
  onSelectTooth?: (n: number) => void;
  compact?: boolean;
  planItems?: any[];
}) {
  const cards = useMemo(() => buildToothSummaryCards(W, planItems), [W, planItems]);

  if (cards.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 200 : 240}px, 1fr))`, gap: 10 }}>
      {cards.map(c => {
        const isSel = selectedTeeth.includes(c.tooth);
        return (
          <button key={c.tooth} type="button" onClick={() => onSelectTooth?.(c.tooth)}
            style={{
              textAlign: "left", border: `2px solid ${isSel ? accent : LINE}`,
              background: isSel ? `${accent}08` : "#fff", borderRadius: 14,
              padding: "12px 14px", cursor: onSelectTooth ? "pointer" : "default",
              fontFamily: "inherit", boxShadow: isSel ? `0 4px 14px ${accent}22` : "0 1px 4px rgba(15,23,42,.06)",
              transition: "all .15s",
            }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: isSel ? accent : INK, marginBottom: 8 }}>Tooth {c.tooth}</div>

            {c.exam.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: "#B45309", marginBottom: 3, textTransform: "uppercase" }}>Found</div>
                {c.exam.slice(0, 3).map((e: string, i: number) => (
                  <div key={i} style={{ fontSize: 12.5, fontWeight: 700, color: INK, lineHeight: 1.4 }}>· {e}</div>
                ))}
              </div>
            )}

            {c.diag.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: "#C2410C", marginBottom: 3, textTransform: "uppercase" }}>Diagnosis</div>
                {c.diag.slice(0, 2).map((d: string, i: number) => (
                  <div key={i} style={{ fontSize: 12.5, fontWeight: 700, color: INK, lineHeight: 1.4 }}>· {d}</div>
                ))}
              </div>
            )}

            {c.tx.length > 0 && (
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: accent, marginBottom: 3, textTransform: "uppercase" }}>Treatment</div>
                {c.tx.map((t: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: INK, flex: 1 }}>{t.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: MUTE }}>{STATUS_LABEL[t.status] || t.status}</span>
                  </div>
                ))}
                {c.tx.some((t: any) => t.price != null && t.price > 0) && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${LINE}`, fontSize: 13, fontWeight: 900, color: accent }}>
                    {fmt(c.tx.reduce((s: number, t: any) => s + (t.price || 0), 0))}
                  </div>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}