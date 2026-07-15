"use client";
import { useState } from "react";
import type { SelectedTreatmentRow } from "./SelectedToothPanel";
import { CatalogSearchDropdown } from "@/components/clinical/CatalogSearchDropdown";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";

const chipGhost = (c: string) => ({
  background: c + "0D", color: c, border: `1.5px solid ${c}44`,
  padding: "7px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
});

const inp = {
  width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 10,
  padding: "10px 12px", fontSize: 13.5, boxSizing: "border-box" as const,
  outline: "none", fontFamily: "inherit", background: "#fff",
};

/** Observation · Diagnosis · Treatment — recorded items show inline in each section */
export function ClinicalAddPanel({
  teeth,
  accent,
  multi,
  layout = "columns",
  exams,
  diagnoses,
  treatments,
  onRemoveExam,
  onRemoveDiag,
  onRemoveTreatment,
  onStatusChange,
  examSearch,
  onExamSearchChange,
  filteredExams,
  onAddExam,
  onAddCustomExam,
  diagSearch,
  onDiagSearchChange,
  filteredDiags,
  learnedDiags,
  onAddDiag,
  onAddCustomDiag,
  treatSearch,
  onTreatSearchChange,
  filteredTreats,
  suggestedTreats,
  addedTreatmentNames,
  catalog,
  onAddTreatment,
  customTreat,
  onCustomTreatChange,
  onAddCustomTreatment,
  fmt,
  rvgSlot,
}: {
  teeth: number[];
  accent: string;
  multi?: boolean;
  layout?: "columns" | "stack";
  exams: { id: string; finding: string; tooth?: number }[];
  diagnoses: { id: string; diagnosis: string; tooth?: number }[];
  treatments: SelectedTreatmentRow[];
  onRemoveExam: (id: string) => void;
  onRemoveDiag: (id: string) => void;
  onRemoveTreatment: (row: SelectedTreatmentRow) => void;
  onStatusChange?: (row: SelectedTreatmentRow, status: string) => void;
  examSearch: string;
  onExamSearchChange: (v: string) => void;
  filteredExams: { id: string; name: string }[];
  onAddExam: (name: string) => void;
  onAddCustomExam: (name: string) => void;
  diagSearch: string;
  onDiagSearchChange: (v: string) => void;
  filteredDiags: { id: string; name: string }[];
  learnedDiags: string[];
  onAddDiag: (name: string) => void;
  onAddCustomDiag: (name: string) => void;
  treatSearch: string;
  onTreatSearchChange: (v: string) => void;
  filteredTreats: { id: string; name: string; rate?: number }[];
  suggestedTreats: string[];
  addedTreatmentNames: Set<string>;
  catalog: { id: string; name: string; rate?: number }[];
  onAddTreatment: (name: string) => void;
  customTreat: string;
  onCustomTreatChange: (v: string) => void;
  onAddCustomTreatment: () => void;
  fmt: (n: number) => string;
  rvgSlot?: React.ReactNode;
}) {
  const toothLabel = teeth.length === 1 ? `tooth ${teeth[0]}` : `${teeth.length} teeth`;

  const defaultExams = filteredExams.filter(e => !examSearch).slice(0, 10);
  const searchExams = examSearch ? filteredExams.slice(0, 16) : defaultExams;
  const existingDiagNames = diagnoses.map(d => d.diagnosis.toLowerCase());
  const defaultDiags = filteredDiags.filter(d => !existingDiagNames.includes(d.name.toLowerCase())).slice(0, 10);
  const searchDiags = diagSearch
    ? filteredDiags.filter(d => !existingDiagNames.includes(d.name.toLowerCase())).slice(0, 14)
    : defaultDiags;

  const gridStyle = layout === "columns"
    ? { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }
    : { display: "flex", flexDirection: "column" as const, gap: 10 };

  return (
    <div style={gridStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Section icon="👁" title="Observation" subtitle={`On ${toothLabel}`} color="#EAB308" accent={accent}>
          <RecordedList empty="Nothing recorded yet — tap a chip below" count={exams.length}>
            {exams.map(e => (
              <RecordedChip key={e.id} label={e.finding} sub={multi && e.tooth ? `#${e.tooth}` : undefined}
                color="#EAB308" onRemove={() => onRemoveExam(e.id)} />
            ))}
          </RecordedList>
          <input value={examSearch} onChange={e => onExamSearchChange(e.target.value)}
            placeholder="Search or type finding…" style={{ ...inp, marginBottom: 8 }} />
          <ChipRow>
            {searchExams.map(e => (
              <button key={e.id} type="button" onClick={() => { onAddExam(e.name); onExamSearchChange(""); }}
                style={chipGhost("#EAB308")}>+ {e.name}</button>
            ))}
          </ChipRow>
          {examSearch.trim() && !filteredExams.some(e => e.name.toLowerCase() === examSearch.trim().toLowerCase()) && (
            <button type="button" onClick={() => { onAddCustomExam(examSearch.trim()); onExamSearchChange(""); }}
              style={{ ...chipGhost("#8B5CF6"), marginTop: 6 }}>+ Save &quot;{examSearch.trim()}&quot;</button>
          )}
        </Section>
        {rvgSlot}
      </div>

      <Section icon="🔬" title="Diagnosis" subtitle="Learns from observations" color="#F97316" accent={accent}>
        <RecordedList empty="No diagnosis yet" count={diagnoses.length}>
          {diagnoses.map(d => (
            <RecordedChip key={d.id} label={d.diagnosis} sub={multi && d.tooth ? `#${d.tooth}` : undefined}
              color="#F97316" onRemove={() => onRemoveDiag(d.id)} />
          ))}
        </RecordedList>
        {learnedDiags.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: accent, marginBottom: 5, textTransform: "uppercase" }}>✨ Suggested</div>
            <ChipRow>
              {learnedDiags.filter(n => !existingDiagNames.includes(n.toLowerCase())).slice(0, 8).map(n => (
                <button key={n} type="button" onClick={() => onAddDiag(n)} style={chipGhost(accent)}>+ {n}</button>
              ))}
            </ChipRow>
          </div>
        )}
        <input value={diagSearch} onChange={e => onDiagSearchChange(e.target.value)}
          placeholder="Search or type diagnosis…" style={{ ...inp, marginBottom: 8 }} />
        <ChipRow>
          {searchDiags.map(d => (
            <button key={d.id} type="button" onClick={() => { onAddDiag(d.name); onDiagSearchChange(""); }}
              style={chipGhost("#F97316")}>+ {d.name}</button>
          ))}
        </ChipRow>
        {diagSearch.trim() && !filteredDiags.some(d => d.name.toLowerCase() === diagSearch.trim().toLowerCase()) && (
          <button type="button" onClick={() => { onAddCustomDiag(diagSearch.trim()); onDiagSearchChange(""); }}
            style={{ ...chipGhost("#8B5CF6"), marginTop: 6 }}>+ Save &quot;{diagSearch.trim()}&quot;</button>
        )}
      </Section>

      <Section icon="🔧" title="Treatment" subtitle="Learns from diagnosis" color={accent} accent={accent}>
        <RecordedList empty="No treatment on plan yet" count={treatments.length}>
          {treatments.map(t => (
            <div key={t.name + t.itemIds.join("-")} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              background: `${accent}08`, border: `1.5px solid ${accent}33`, borderRadius: 10, padding: "8px 10px",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: INK }}>{t.name}</div>
                {t.planItem && (
                  <div style={{ fontSize: 11.5, color: accent, fontWeight: 700, marginTop: 2 }}>
                    {fmt(t.planItem.final_amount ?? 0)}
                  </div>
                )}
              </div>
              {onStatusChange && (
                <button type="button" onClick={() => {
                  const next = t.status === "advised" ? "in_progress" : t.status === "in_progress" ? "completed" : "advised";
                  onStatusChange(t, next);
                }}
                  style={{ border: "none", background: "#fff", color: accent, borderRadius: 8, padding: "4px 8px", fontWeight: 800, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                  {t.status === "completed" ? "Done" : t.status === "in_progress" ? "Active" : "Planned"}
                </button>
              )}
              <button type="button" onClick={() => onRemoveTreatment(t)}
                style={{ border: "none", background: "#FEE2E2", color: "#B91C1C", borderRadius: 8, padding: "4px 9px", fontWeight: 800, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                ✕
              </button>
            </div>
          ))}
        </RecordedList>
        {suggestedTreats.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: accent, marginBottom: 5, textTransform: "uppercase" }}>✨ Recommended</div>
            <ChipRow>
              {suggestedTreats.map(t => {
                const used = addedTreatmentNames.has(t.toLowerCase());
                return (
                  <button key={t} type="button" disabled={used} onClick={() => onAddTreatment(t)}
                    style={{ ...chipGhost(accent), opacity: used ? 0.55 : 1, cursor: used ? "default" : "pointer" }}>
                    {used ? "✓ " : "+ "}{t.length > 22 ? t.slice(0, 20) + "…" : t}
                  </button>
                );
              })}
            </ChipRow>
          </div>
        )}
        <input value={treatSearch} onChange={e => onTreatSearchChange(e.target.value)}
          placeholder="Search treatment…" style={{ ...inp, marginBottom: 8 }} />
        {treatSearch && filteredTreats.length > 0 && (
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, marginBottom: 8, maxHeight: 120, overflow: "auto" }}>
            {filteredTreats.map(c => {
              const used = addedTreatmentNames.has(c.name.toLowerCase());
              return (
                <button key={c.id} type="button" disabled={used} onClick={() => { onAddTreatment(c.name); onTreatSearchChange(""); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "9px 12px",
                    border: "none", borderBottom: `1px solid ${SOFT}`, background: "#fff",
                    cursor: used ? "default" : "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, opacity: used ? 0.6 : 1,
                  }}>
                  {used && <span style={{ color: accent }}>✓ </span>}{c.name} {c.rate ? <span style={{ color: MUTE }}>{fmt(c.rate)}</span> : null}
                </button>
              );
            })}
          </div>
        )}
        {!treatSearch && (
          <ChipRow>
            {catalog.slice(0, 10).map(c => {
              const used = addedTreatmentNames.has(c.name.toLowerCase());
              return (
                <button key={c.id} type="button" disabled={used} onClick={() => onAddTreatment(c.name)}
                  style={{ ...chipGhost(accent), opacity: used ? 0.55 : 1 }}>
                  {used ? "✓ " : "+ "}{c.name}
                </button>
              );
            })}
          </ChipRow>
        )}
        <div style={{ marginTop: 6, marginBottom: 6 }}>
          <CatalogSearchDropdown
            items={catalog}
            accent={accent}
            fmt={fmt}
            triggerLabel={`Browse all treatments (${catalog.length})`}
            placeholder="Search treatment catalog…"
            isUsed={c => addedTreatmentNames.has(c.name.toLowerCase())}
            onSelect={c => onAddTreatment(c.name)}
          />
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
          <input value={customTreat} onChange={e => onCustomTreatChange(e.target.value)}
            placeholder="Custom treatment…"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAddCustomTreatment(); } }}
            style={{ ...inp, flex: 1, margin: 0 }} />
          <button type="button" onClick={onAddCustomTreatment} disabled={!customTreat.trim()}
            style={{ border: "none", background: accent, color: "#fff", borderRadius: 10, padding: "0 14px", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", opacity: customTreat.trim() ? 1 : 0.4 }}>
            Add
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, title, subtitle, color, children }: {
  icon: string; title: string; subtitle: string; color: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: `1.5px solid ${LINE}`,
      overflow: "hidden", boxShadow: "0 1px 6px rgba(15,23,42,.05)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${LINE}`, background: `linear-gradient(135deg, ${color}10, #fff)`, borderLeft: `4px solid ${color}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 17 }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 14, color: INK }}>{title}</div>
            <div style={{ fontSize: 11, color: MUTE }}>{subtitle}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 14px 14px", flex: 1 }}>{children}</div>
    </div>
  );
}

function RecordedList({ children, empty, count }: { children: React.ReactNode; empty: string; count: number }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>Recorded</div>
      {count > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
      ) : (
        <div style={{ fontSize: 12, color: MUTE, fontStyle: "italic", padding: "6px 0" }}>{empty}</div>
      )}
    </div>
  );
}

function RecordedChip({ label, sub, color, onRemove }: { label: string; sub?: string; color: string; onRemove: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      background: `${color}0A`, border: `1.5px solid ${color}44`, borderRadius: 10, padding: "7px 10px",
    }}>
      <div>
        <span style={{ fontWeight: 800, fontSize: 13.5, color: INK }}>{label}</span>
        {sub && <span style={{ fontSize: 11, color: MUTE, marginLeft: 6 }}>{sub}</span>}
      </div>
      <button type="button" onClick={onRemove}
        style={{ border: "none", background: "#FEE2E2", color: "#B91C1C", borderRadius: 7, padding: "3px 8px", fontWeight: 800, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
        ✕
      </button>
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 110, overflowY: "auto" }}>
      {children}
    </div>
  );
}