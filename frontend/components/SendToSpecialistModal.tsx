/**
 * SendToSpecialistModal — Bundle X Pass 1
 *
 * Opened from the doctor's Treatment Workspace via "Refer to Specialist" button.
 * On submit: POSTs to /api/specialist/appointments/{apt_id}/assign which:
 *   1. Sets appointments.specialist_id, specialist_session_status='pending'
 *   2. Sets specialist_confirmation_status='pending_call'   (Bundle X)
 *      → engages booking gate: nurse must call/confirm specialist before
 *        finalizing future appointments for this patient
 *   3. Inserts into specialist_notifications + fires WhatsApp via
 *      notify_specialist_assignment() hook
 *   4. Returns a wa.me link the frontend can pop for manual fallback
 *
 * Rate tier picker uses DropdownWithInlineAdd so doctor can type any custom
 * rate label → auto-added to specialist_rate_tiers with usage tracking.
 */
import React, { useEffect, useState } from "react";
import { X, UserPlus, MessageSquare } from "lucide-react";
import * as api from "@/lib/api";
import DropdownWithInlineAdd from "./DropdownWithInlineAdd";

const TEAL = "#0E7C7B";
const TEAL_DEEP = "#0A5C5B";
const LINE = "#E2E8F0";
const INK = "#1F2937";
const MUTE = "#64748B";
const SOFT = "#F8FAFC";
const AMBER = "#F59E0B";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: `1.5px solid ${LINE}`, fontSize: 14, fontFamily: "inherit",
  background: "#fff", color: INK, outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 800, color: MUTE,
  letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 4,
};

type Props = {
  patientId: string;
  patientName: string;
  clinicId: string;
  appointmentId: string;   // REQUIRED — referral lives on the current visit's appointment
  defaultTooth?: string;
  defaultProcedureName?: string;   // e.g. "RCT — Molar"
  onClose: () => void;
  onSaved?: (result: { specialist_id: string; whatsapp_link?: string }) => void;
};

export default function SendToSpecialistModal({
  patientId, patientName, clinicId, appointmentId,
  defaultTooth, defaultProcedureName,
  onClose, onSaved,
}: Props) {
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [specialistId, setSpecialistId] = useState("");
  const [tierLabel, setTierLabel] = useState(defaultProcedureName || "");
  const [tierName, setTierName] = useState<"standard" | "complex">("standard");
  const [rateAmount, setRateAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);   // shows WA link after save
  const [error, setError] = useState("");            // inline error — no alert() jolts

  // Load specialists
  useEffect(() => {
    api.listSpecialists(clinicId).then((sps: any) => {
      const list = Array.isArray(sps) ? sps : [];
      setSpecialists(list);
      if (list[0]) setSpecialistId(list[0].id);
    }).catch(() => setSpecialists([]));
  }, [clinicId]);

  // When tier label changes via dropdown selection, auto-fill rate + tier_name from raw row
  const handleTierPick = (val: string, raw?: any) => {
    setTierLabel(val);
    if (raw) {
      if (typeof raw.rate_amount === "number") setRateAmount(String(raw.rate_amount));
      if (raw.tier_name === "complex" || raw.tier_name === "standard") setTierName(raw.tier_name);
    }
  };

  const submit = async () => {
    if (!specialistId) { setError("Pick a specialist first"); return; }
    if (!appointmentId) { setError("This referral must be linked to an active appointment"); return; }
    setError("");
    setSaving(true);
    try {
      // 1. Upsert the rate tier (so it appears in dropdown next time + sets the rate context)
      if (tierLabel.trim() && rateAmount) {
        try {
          await api.upsertSpecialistTier({
            clinic_id: clinicId,
            specialist_id: specialistId,
            tier_name: tierName,
            treatment_key: tierLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "_").slice(0, 80),
            rate_amount: parseFloat(rateAmount),
            label: tierLabel.trim(),
          });
        } catch (e) { /* non-fatal — assignment continues */ }
      }

      // 2. Assign specialist to the current appointment
      const assignNote = [
        defaultTooth ? `Tooth ${defaultTooth}` : "",
        tierLabel ? `· ${tierLabel}` : "",
        rateAmount ? `· ₹${rateAmount}` : "",
        notes ? `\n${notes}` : "",
      ].filter(Boolean).join(" ");

      const res = await api.specAssign(appointmentId, {
        specialist_id: specialistId,
        notes: assignNote || undefined,
      });
      setResult(res);
      onSaved?.({ specialist_id: specialistId, whatsapp_link: res.whatsapp_link });
    } catch (e: any) {
      setError(`Could not assign specialist: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  // After-save state: show the WA link clearly
  if (result) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{
          background: "#fff", borderRadius: 18, width: "min(520px, 100%)",
          padding: 28, boxShadow: "0 20px 60px rgba(15,23,42,0.3)", textAlign: "center",
        }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: INK, marginBottom: 6 }}>
            Specialist referred
          </div>
          <div style={{ fontSize: 13.5, color: MUTE, marginBottom: 18, lineHeight: 1.5 }}>
            {result.specialist?.name && <><b>{result.specialist.name}</b> has been notified.<br /></>}
            Nurse will need to <b>call & confirm</b> with the specialist before booking the patient's next appointment.
          </div>
          {result.whatsapp_link && (
            <a href={result.whatsapp_link} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
              background: "#25D366", color: "#fff", borderRadius: 12,
              padding: "12px 22px", fontWeight: 700, fontSize: 14,
              boxShadow: "0 4px 12px #25D36644",
            }}>
              <MessageSquare size={16} /> Open WhatsApp to specialist
            </a>
          )}
          <div style={{ marginTop: 14 }}>
            <button onClick={onClose} style={{
              border: `1.5px solid ${LINE}`, background: "#fff", color: MUTE,
              borderRadius: 12, padding: "10px 22px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
            }}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 18, width: "min(620px, 100%)",
        maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(15,23,42,0.3)",
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
          padding: "16px 22px", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderRadius: "18px 18px 0 0",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>👨‍⚕️ Refer to Specialist</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              Patient: <b>{patientName}</b>
              {defaultTooth && <> · Tooth <b>{defaultTooth}</b></>}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)", color: "#fff",
            border: "none", borderRadius: 8, padding: 6, cursor: "pointer",
          }}><X size={18} /></button>
        </div>

        {/* Workflow note */}
        <div style={{
          background: "#FFFBEB", border: `1.5px solid ${AMBER}`,
          margin: "16px 22px 0", padding: "10px 14px", borderRadius: 10,
          fontSize: 12.5, color: "#78350F", lineHeight: 1.45,
        }}>
          <b>What happens next:</b> Specialist receives WhatsApp message and is linked to this patient.
          Next time the nurse books an appointment, the system will require her to first
          <b> call &amp; confirm</b> the specialist's availability.
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>
          {/* Specialist */}
          <div>
            <div style={labelStyle}>Specialist *</div>
            <select style={inputStyle} value={specialistId} onChange={e => setSpecialistId(e.target.value)}>
              {specialists.length === 0 && <option value="">No specialists configured</option>}
              {specialists.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.specialization ? ` — ${s.specialization}` : ""}{s.is_external ? " (external)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Treatment / rate label with inline-add */}
          <div>
            <div style={labelStyle}>Treatment / Rate Label *</div>
            <DropdownWithInlineAdd
              value={tierLabel}
              onChange={handleTierPick}
              fetchSuggestions={async (q) => {
                if (!specialistId) return [];
                const r = await api.listSpecialistTiers({ specialist_id: specialistId, clinic_id: clinicId });
                const all = (r?.tiers || []).map((t: any) => ({
                  ...t,
                  // ensure we have a clean label for the dropdown
                  label: t.label || t.treatment_key || `${t.tier_name} (₹${t.rate_amount})`,
                }));
                if (!q) return all;
                const ql = q.toLowerCase();
                return all.filter((t: any) =>
                  (t.label || "").toLowerCase().includes(ql) ||
                  (t.treatment_key || "").toLowerCase().includes(ql)
                );
              }}
              addNew={async (name) => {
                // New treatment name accepted as-is — set its rate in the Rate ₹
                // field below; submit() upserts the tier with that rate.
                if (!rateAmount) setError(`Set the Rate ₹ below for "${name}" before sending`);
                return name;
              }}
              placeholder="e.g. RCT — Molar (start typing or add new)"
              labelKey="label"
              valueKey="label"
              secondaryKey="tier_name"
            />
          </div>

          {/* Tier + rate */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={labelStyle}>Tier</div>
              <select style={inputStyle} value={tierName}
                onChange={e => setTierName(e.target.value as any)}>
                <option value="standard">Standard</option>
                <option value="complex">Complex</option>
              </select>
            </div>
            <div>
              <div style={labelStyle}>Rate ₹</div>
              <input style={inputStyle} type="number" placeholder="e.g. 5000"
                value={rateAmount} onChange={e => setRateAmount(e.target.value)} />
            </div>
          </div>

          <div>
            <div style={labelStyle}>Notes for the specialist</div>
            <textarea
              style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
              placeholder="e.g. Curved canals · post-op antibiotics done · radiograph attached"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 22px", borderTop: `1.5px solid ${LINE}`,
          display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center",
          background: SOFT, borderRadius: "0 0 18px 18px",
        }}>
          {error && (
            <span style={{ marginRight: "auto", background: "#FEE2E2", color: "#991B1B", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>
              ⚠ {error}
            </span>
          )}
          <button onClick={onClose} style={{
            border: `1.5px solid ${LINE}`, background: "#fff", color: MUTE,
            borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={submit} disabled={saving || !specialistId} style={{
            border: "none", background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
            color: "#fff", borderRadius: 12, padding: "11px 22px", fontWeight: 800, fontSize: 13.5,
            cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6,
            boxShadow: `0 4px 12px ${TEAL}44`, opacity: specialistId ? 1 : 0.5,
          }}>
            <UserPlus size={15} /> {saving ? "Referring…" : "Refer & Notify"}
          </button>
        </div>
      </div>
    </div>
  );
}
