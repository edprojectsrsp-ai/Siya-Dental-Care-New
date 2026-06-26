"use client";
// ╔══════════════════════════════════════════════════════════════╗
// ║  MEDICAL CONDITIONS PICKER — single source of truth.          ║
// ║  Used in: New Patient form (AppointmentHub), Patient details   ║
// ║  (PatientsTab), Treatment Workspace Overview, Health History.  ║
// ║  Merges hardcoded defaults + DB conditions + custom additions. ║
// ╚══════════════════════════════════════════════════════════════╝
import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";

/** Canonical list — matches the DB seed in migration 006 + adds clinically common ones.
 *  Order matters: most-frequent first so chips above the fold are useful. */
export const DEFAULT_CONDITIONS: { name: string; label: string; category: string }[] = [
  // Systemic — most common
  { name: "Diabetes", label: "🩸 Diabetes", category: "systemic" },
  { name: "Hypertension", label: "🩺 Hypertension", category: "systemic" },
  { name: "Heart Disease", label: "❤️ Heart Disease", category: "systemic" },
  { name: "Asthma", label: "🫁 Asthma", category: "systemic" },
  { name: "Thyroid Disorder", label: "🦋 Thyroid", category: "systemic" },
  { name: "Pregnancy", label: "🤰 Pregnancy", category: "systemic" },
  { name: "Epilepsy", label: "⚡ Epilepsy", category: "systemic" },
  { name: "Kidney Disease", label: "🫘 Kidney Disease", category: "systemic" },
  { name: "Liver Disease", label: "🫀 Liver Disease", category: "systemic" },
  { name: "Hepatitis B", label: "🟡 Hepatitis B", category: "systemic" },
  { name: "HIV", label: "🔴 HIV", category: "systemic" },
  { name: "Bleeding Disorder", label: "🩸 Bleeding Disorder", category: "systemic" },
  // Allergies — critical for dental
  { name: "Penicillin Allergy", label: "⚠ Penicillin Allergy", category: "allergy" },
  { name: "Anesthesia Allergy", label: "⚠ Anesthesia Allergy", category: "allergy" },
  { name: "Drug Allergy", label: "⚠ Drug Allergy", category: "allergy" },
  { name: "Latex Allergy", label: "⚠ Latex Allergy", category: "allergy" },
  // Habits
  { name: "Smoking", label: "🚬 Smoking", category: "habit" },
  { name: "Tobacco", label: "🟫 Tobacco", category: "habit" },
  { name: "Alcohol", label: "🍷 Alcohol", category: "habit" },
  { name: "Blood Thinners", label: "💉 Blood Thinners", category: "medication" },
  // Dental-specific
  { name: "Bruxism", label: "🦷 Bruxism", category: "dental" },
  { name: "TMJ Disorder", label: "🔧 TMJ Disorder", category: "dental" },
  { name: "Dry Mouth", label: "💧 Dry Mouth", category: "dental" },
  { name: "Periodontal Disease", label: "🦠 Periodontal Disease", category: "dental" },
];

const CATEGORY_ORDER = ["systemic", "allergy", "habit", "medication", "dental"];
const CATEGORY_LABELS: Record<string, string> = {
  systemic: "Systemic conditions",
  allergy: "Allergies",
  habit: "Habits",
  medication: "Medications",
  dental: "Dental",
  general: "Other",
};

/** Look up the emoji-labelled display string for a condition name. */
export function labelFor(name: string): string {
  return DEFAULT_CONDITIONS.find(c => c.name === name)?.label || name;
}

const chipGhost = (c: string) => ({
  background: c + "0D", color: c, border: `1.5px solid ${c}44`, padding: "5px 12px", borderRadius: 999,
  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});

export function MedicalConditionsPicker({
  value,
  onChange,
  accent = "#0E7C7B",
  compact = false,
  showCategorized = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  accent?: string;
  compact?: boolean;
  showCategorized?: boolean;
}) {
  const [dbConds, setDbConds] = useState<any[]>([]);
  const [custom, setCustom] = useState("");

  useEffect(() => { api.hubConditions().then(setDbConds).catch(() => { }); }, []);

  const allOptions = useMemo(() => {
    const map = new Map<string, { name: string; label: string; category: string }>();
    DEFAULT_CONDITIONS.forEach(c => map.set(c.name.toLowerCase(), c));
    dbConds.forEach((d: any) => {
      const n = (d.name || d.condition_name || "").trim();
      if (!n) return;
      const key = n.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: n, label: n, category: d.category || "general" });
      }
    });
    return Array.from(map.values()).filter(c => !value.includes(c.name));
  }, [dbConds, value]);

  const addCondition = (name: string) => {
    const v = name.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
  };

  const removeCondition = (name: string) => onChange(value.filter(x => x !== name));

  const saveCustom = () => {
    const v = custom.trim();
    if (!v) return;
    api.hubAddCondition(v).then(() => api.hubConditions().then(setDbConds)).catch(() => { });
    addCondition(v);
    setCustom("");
  };

  const selectedChips = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: value.length ? 8 : 4 }}>
      {value.map(name => (
        <span key={name} style={{
          background: "#FEE2E2", color: "#991B1B",
          padding: compact ? "3px 9px" : "4px 11px", borderRadius: 999,
          fontSize: compact ? 11 : 12.5, fontWeight: 800,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          {labelFor(name)}
          <button type="button" onClick={() => removeCondition(name)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#991B1B", padding: 0, fontSize: 12 }}>✕</button>
        </span>
      ))}
      {value.length === 0 && (
        <span style={{ fontSize: 12, color: "#64748B", fontStyle: "italic" as const }}>None selected</span>
      )}
    </div>
  );

  const customInput = (
    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
      <input
        value={custom}
        onChange={e => setCustom(e.target.value)}
        placeholder="Add custom condition + Enter (saved for future)"
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveCustom(); } }}
        style={{
          flex: 1, border: "1.5px solid #E2E8F0", borderRadius: 10,
          padding: compact ? "7px 11px" : "9px 13px",
          fontSize: 12.5, fontFamily: "inherit", outline: "none",
        }}
      />
      {custom.trim() && (
        <button type="button" onClick={saveCustom}
          style={{
            background: accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "0 16px", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
          }}>＋ Add</button>
      )}
    </div>
  );

  if (showCategorized) {
    const byCategory = CATEGORY_ORDER.map(cat => ({
      cat,
      options: allOptions.filter(o => o.category === cat),
    })).filter(g => g.options.length > 0);
    const otherOptions = allOptions.filter(o => !CATEGORY_ORDER.includes(o.category));
    if (otherOptions.length > 0) byCategory.push({ cat: "general", options: otherOptions });
    return (
      <div>
        {selectedChips}
        <div style={{ maxHeight: 320, overflowY: "auto" as const, paddingRight: 4 }}>
          {byCategory.map(({ cat, options }) => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: "#64748B", letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 5 }}>
                {CATEGORY_LABELS[cat] || cat}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {options.map(o => (
                  <button key={o.name} type="button" onClick={() => addCondition(o.name)} style={chipGhost("#EF4444")}>
                    + {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {customInput}
      </div>
    );
  }

  return (
    <div>
      {selectedChips}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: compact ? 4 : 5, marginBottom: 6,
        maxHeight: compact ? 110 : 150, overflowY: "auto" as const, paddingRight: 4,
      }}>
        {allOptions.map(o => (
          <button key={o.name} type="button" onClick={() => addCondition(o.name)} style={chipGhost("#EF4444")}>
            + {o.label}
          </button>
        ))}
      </div>
      {customInput}
    </div>
  );
}
