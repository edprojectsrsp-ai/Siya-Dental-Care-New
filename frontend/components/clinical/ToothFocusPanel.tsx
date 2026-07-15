"use client";
import { FocusToothHero } from "./FocusToothHero";
import { getToothAnatomy } from "./ToothAnatomy";
import { SelectedToothPanel, type SelectedTreatmentRow } from "./SelectedToothPanel";

const LINE = "#E2E8F0", MUTE = "#64748B", SOFT = "#F8FAFC";

const LEGEND = [
  { color: "#0E7C7B", label: "Selected" },
  { color: "#6366F1", label: "Treatment planned" },
  { color: "#F59E0B", label: "In treatment" },
  { color: "#10B981", label: "Completed" },
  { color: "#F97316", label: "Diagnosed" },
  { color: "#EAB308", label: "Examined" },
];

/**
 * Reference-style panel: selected tooth pops out alone with
 * observation · diagnosis · treatment beneath it.
 */
export function ToothFocusPanel({
  teeth,
  exams,
  diagnoses,
  treatments,
  accent,
  onRemoveExam,
  onRemoveDiag,
  onRemoveTreatment,
  onStatusChange,
  onQuickPrice,
  onEditDetails,
  onJumpToPlan,
  onAddClinical,
  addPanel,
  simple,
  hideToothHeader,
}: {
  teeth: number[];
  exams: { id: string; finding: string; tooth?: number }[];
  diagnoses: { id: string; diagnosis: string; tooth?: number }[];
  treatments: SelectedTreatmentRow[];
  accent: string;
  onRemoveExam: (id: string) => void;
  onRemoveDiag: (id: string) => void;
  onRemoveTreatment: (row: SelectedTreatmentRow) => void;
  onStatusChange: (row: SelectedTreatmentRow, status: string) => void;
  onQuickPrice?: (row: SelectedTreatmentRow, rate: number, discount: number) => void;
  onEditDetails?: (row: SelectedTreatmentRow) => void;
  onJumpToPlan?: () => void;
  onAddClinical?: () => void;
  addPanel?: React.ReactNode;
  simple?: boolean;
  /** When hero is rendered above this panel, skip duplicate tooth header */
  hideToothHeader?: boolean;
}) {
  const single = teeth.length === 1;
  const primary = single ? teeth[0] : null;
  const anatomy = primary ? getToothAnatomy(primary) : null;

  return (
    <div style={{
      background: "linear-gradient(180deg, #fff 0%, #F8FAFC 100%)",
      borderRadius: 18,
      border: `2px solid ${accent}33`,
      overflow: "hidden",
      boxShadow: `0 8px 32px ${accent}18`,
    }}>
      {!hideToothHeader && <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${LINE}`, background: "#fff" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
          Selected Tooth{!single ? "s" : ""}
        </div>

        {single && primary && anatomy ? (
          <>
            {simple ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${accent}, ${accent}CC)`,
                  color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 18,
                  boxShadow: `0 4px 14px ${accent}44`,
                }}>{primary}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: "#0F172A" }}>On tooth {primary}</div>
                  <div style={{ fontSize: 12, color: MUTE }}>{anatomy.type} · {anatomy.position}</div>
                </div>
              </div>
            ) : (
              <>
                <FocusToothHero tooth={primary} accent={accent} />
                <div style={{ marginTop: 14, padding: "12px 14px", background: SOFT, borderRadius: 12, border: `1px solid ${LINE}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, letterSpacing: 0.4, marginBottom: 8, textTransform: "uppercase" }}>Tooth details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 13 }}>
                    <Detail label="Type" value={anatomy.type} />
                    <Detail label="Position" value={anatomy.position} />
                    <Detail label="Arch" value={anatomy.arch} />
                    <Detail label="FDI number" value={String(anatomy.fdi)} />
                  </div>
                </div>
              </>
            )}
            {onAddClinical && !addPanel && (
              <button type="button" onClick={onAddClinical}
                style={{
                  width: "100%", marginTop: 12, border: "none", background: accent, color: "#fff",
                  borderRadius: 12, padding: "12px 16px", fontWeight: 800, fontSize: 14.5,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: `0 4px 16px ${accent}55`,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add to Chart
              </button>
            )}
          </>
        ) : (
          <div style={{ padding: "8px 0" }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: "#0F172A" }}>{teeth.length} teeth selected</div>
            <div style={{ fontSize: 13, color: MUTE, marginTop: 6, lineHeight: 1.5 }}>{teeth.join(" · ")}</div>
            {onAddClinical && (
              <button type="button" onClick={onAddClinical}
                style={{ marginTop: 12, border: `2px solid ${accent}`, background: "#fff", color: accent, borderRadius: 10, padding: "10px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
                + Add for selected teeth
              </button>
            )}
          </div>
        )}
      </div>}

      {/* Clinical record — observation, diagnosis, treatment */}
      <div style={{ padding: "14px 18px 18px" }}>
        <SelectedToothPanel
          teeth={teeth}
          exams={exams}
          diagnoses={diagnoses}
          treatments={treatments}
          accent={accent}
          onRemoveExam={onRemoveExam}
          onRemoveDiag={onRemoveDiag}
          onRemoveTreatment={onRemoveTreatment}
          onStatusChange={onStatusChange}
          onQuickPrice={onQuickPrice}
          onEditDetails={onEditDetails}
          onJumpToPlan={onJumpToPlan}
          hideHeader
          showEmptySections
        />
      </div>

      {addPanel && <div style={{ padding: "0 14px 14px" }}>{addPanel}</div>}

      {!simple && <div style={{ padding: "12px 18px 16px", borderTop: `1px solid ${LINE}`, background: "#fff" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, marginBottom: 8, textTransform: "uppercase" }}>Legend</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px" }}>
          {LEGEND.map(l => (
            <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: MUTE }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: MUTE, fontWeight: 700 }}>{label}</div>
      <div style={{ fontWeight: 800, color: "#0F172A" }}>{value}</div>
    </div>
  );
}