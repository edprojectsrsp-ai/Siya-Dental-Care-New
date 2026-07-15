"use client";
import { useState } from "react";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

const STATUS_OPTIONS = [
  { value: "advised", label: "Planned", color: "#6366F1", bg: "#EEF2FF" },
  { value: "in_progress", label: "In Progress", color: "#D97706", bg: "#FFFBEB" },
  { value: "completed", label: "Completed", color: "#059669", bg: "#ECFDF5" },
];

export interface SelectedTreatmentRow {
  name: string;
  itemIds: string[];
  teeth: number[];
  status: string;
  planItem?: {
    id: string;
    doctor_rate?: number;
    suggested_rate?: number;
    discount?: number;
    final_amount?: number;
  } | null;
}

export function SelectedToothPanel({
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
  hideHeader,
  showEmptySections,
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
  hideHeader?: boolean;
  showEmptySections?: boolean;
}) {
  const multi = teeth.length > 1;
  const title = teeth.length === 1 ? `Tooth ${teeth[0]}` : `${teeth.length} teeth selected`;

  const obsTitle = hideHeader ? "Observation" : "What we found";
  const dxTitle = hideHeader ? "Diagnosis" : "What we concluded";
  const txTitle = hideHeader ? "Treatment" : "Treatments planned";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!hideHeader && (
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: INK }}>{title}</div>
          <div style={{ fontSize: 13, color: MUTE, marginTop: 4 }}>{teeth.join(" · ")}</div>
          {onJumpToPlan && (
            <button type="button" onClick={onJumpToPlan}
              style={{ marginTop: 10, border: `2px solid ${accent}`, background: "#fff", color: accent, borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Open full treatment plan →
            </button>
          )}
        </div>
      )}

      {(exams.length > 0 || showEmptySections) && (
        <Section title={obsTitle} icon="👁" color="#EAB308">
          {exams.length > 0 ? exams.map(e => (
            <SimpleRow key={e.id} label={e.finding} sub={multi && e.tooth ? `Tooth ${e.tooth}` : undefined}
              onRemove={() => onRemoveExam(e.id)} removeLabel="Remove" />
          )) : (
            <EmptyHint text="No observation recorded yet" />
          )}
        </Section>
      )}

      {(diagnoses.length > 0 || showEmptySections) && (
        <Section title={dxTitle} icon="🏷" color="#F97316">
          {diagnoses.length > 0 ? diagnoses.map(d => (
            <SimpleRow key={d.id} label={d.diagnosis} sub={multi && d.tooth ? `Tooth ${d.tooth}` : undefined}
              onRemove={() => onRemoveDiag(d.id)} removeLabel="Remove" />
          )) : (
            <EmptyHint text="No diagnosis recorded yet" />
          )}
        </Section>
      )}

      {(treatments.length > 0 || showEmptySections) ? (
        <Section title={txTitle} icon="💡" color={accent}>
          {treatments.length > 0 ? treatments.map(t => (
            <TreatmentRowCard
              key={t.name + t.itemIds.join("-")}
              row={t}
              accent={accent}
              multi={multi}
              onRemove={() => onRemoveTreatment(t)}
              onStatusChange={status => onStatusChange(t, status)}
              onQuickPrice={onQuickPrice ? (rate, disc) => onQuickPrice(t, rate, disc) : undefined}
              onEditDetails={onEditDetails ? () => onEditDetails(t) : undefined}
            />
          )) : (
            <EmptyHint text="No treatment planned yet" />
          )}
        </Section>
      ) : (
        <div style={{ padding: "14px 16px", background: SOFT, borderRadius: 12, border: `1.5px dashed ${LINE}`, fontSize: 13, color: MUTE, lineHeight: 1.5 }}>
          No treatments added yet. Pick one from <b>Treatment Suggested</b> below.
        </div>
      )}

      {hideHeader && onJumpToPlan && (
        <button type="button" onClick={onJumpToPlan}
          style={{ border: `2px solid ${accent}`, background: "#fff", color: accent, borderRadius: 10, padding: "10px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
          Open full treatment plan →
        </button>
      )}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ padding: "10px 12px", background: SOFT, borderRadius: 10, border: `1.5px dashed ${LINE}`, fontSize: 12.5, color: MUTE, fontStyle: "italic" }}>
      {text}
    </div>
  );
}

function Section({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: 0.3, textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function SimpleRow({ label, sub, onRemove, removeLabel }: { label: string; sub?: string; onRemove: () => void; removeLabel: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 10, padding: "10px 12px" }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: INK }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>{sub}</div>}
      </div>
      <button type="button" onClick={onRemove}
        style={{ border: "none", background: "#FEE2E2", color: "#B91C1C", borderRadius: 8, padding: "6px 12px", fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
        {removeLabel}
      </button>
    </div>
  );
}

function TreatmentRowCard({
  row, accent, multi, onRemove, onStatusChange, onQuickPrice, onEditDetails,
}: {
  row: SelectedTreatmentRow;
  accent: string;
  multi: boolean;
  onRemove: () => void;
  onStatusChange: (status: string) => void;
  onQuickPrice?: (rate: number, discount: number) => void;
  onEditDetails?: () => void;
}) {
  const pi = row.planItem;
  const [rate, setRate] = useState(String(pi?.doctor_rate ?? pi?.suggested_rate ?? 0));
  const [disc, setDisc] = useState(String(pi?.discount ?? 0));
  const num = (v: string) => Math.max(0, parseFloat(v.replace(/[^0-9.]/g, "")) || 0);
  const pays = Math.max(0, num(rate) - num(disc));
  const st = STATUS_OPTIONS.find(s => s.value === row.status) || STATUS_OPTIONS[0];

  return (
    <div style={{ background: "#fff", border: `2px solid ${st.color}33`, borderRadius: 14, padding: "14px 16px", boxShadow: "0 2px 8px rgba(15,23,42,.05)" }}>
      <div style={{ fontWeight: 900, fontSize: 16, color: INK, lineHeight: 1.3, marginBottom: 4 }}>{row.name}</div>
      {multi && row.teeth.length > 0 && (
        <div style={{ fontSize: 12, color: MUTE, marginBottom: 10 }}>Teeth: {row.teeth.join(", ")}</div>
      )}

      <button type="button" onClick={() => {
        const next = row.status === "advised" ? "in_progress" : row.status === "in_progress" ? "completed" : "advised";
        onStatusChange(next);
      }} title="Tap to change status"
        style={{
          border: `2px solid ${st.color}44`, background: st.bg, color: st.color,
          borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit", marginBottom: 10, width: "100%",
        }}>
        {st.label} — tap to update
      </button>

      {onQuickPrice && pi && (
        <div style={{ background: SOFT, borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, marginBottom: 4 }}>RATE (₹)</div>
              <input type="text" inputMode="numeric" value={rate} onChange={e => setRate(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${LINE}`, borderRadius: 8, padding: "10px", fontSize: 15, fontWeight: 800, fontFamily: "inherit" }} />
            </label>
            <label>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, marginBottom: 4 }}>DISCOUNT (₹)</div>
              <input type="text" inputMode="numeric" value={disc} onChange={e => setDisc(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${LINE}`, borderRadius: 8, padding: "10px", fontSize: 15, fontWeight: 800, fontFamily: "inherit" }} />
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: MUTE }}>Patient pays</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: accent }}>{fmt(pays)}</span>
          </div>
          <button type="button" onClick={() => onQuickPrice(num(rate), num(disc))}
            style={{ width: "100%", marginTop: 10, border: "none", background: accent, color: "#fff", borderRadius: 10, padding: "10px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            Save price
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {onEditDetails && (
          <button type="button" onClick={onEditDetails}
            style={{ flex: 1, minWidth: 120, border: `1.5px solid ${accent}`, background: "#fff", color: accent, borderRadius: 10, padding: "9px 12px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            More details
          </button>
        )}
        <button type="button" onClick={onRemove}
          style={{ flex: 1, minWidth: 120, border: "none", background: "#FEE2E2", color: "#B91C1C", borderRadius: 10, padding: "9px 12px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          Remove treatment
        </button>
      </div>
    </div>
  );
}