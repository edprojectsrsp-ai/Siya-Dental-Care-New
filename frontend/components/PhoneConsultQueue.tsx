"use client";
/**
 * components/PhoneConsultQueue.tsx — Bundle Q+
 *
 * Admin queue for inbound paid phone consultations.
 * Shows patient details + complaint, doctor claims → calls → writes Rx → sends.
 */

import { useEffect, useState } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";

export default function PhoneConsultQueue({
  staff, show, accent = A,
}: { staff: any; show: (m: string) => void; accent?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [completing, setCompleting] = useState<any>(null);

  const load = async () => {
    if (!staff?.clinic_id) return;
    setLoading(true);
    try {
      const d = await api.consultQueue(staff.clinic_id, filter || undefined);
      setItems(d.consultations || []);
    } catch (e: any) {
      show("Error: " + e.message);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [staff?.clinic_id, filter]); // eslint-disable-line

  const claim = async (id: string) => {
    try {
      await api.consultClaim(id);
      show("✓ Claimed — call the patient now");
      load();
    } catch (e: any) { show("Error: " + e.message); }
  };

  const counts = {
    queued: items.filter(i => i.status === "queued").length,
    calling: items.filter(i => i.status === "doctor_calling").length,
    completed: items.filter(i => i.status === "completed").length,
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>📞 Phone Consultation Queue</h1>
        <button onClick={load} style={btnGhost}>↻ Refresh</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
        <Stat label="Awaiting call"        value={counts.queued}    color="#F59E0B" />
        <Stat label="Doctor calling"       value={counts.calling}   color={accent} />
        <Stat label="Completed (this view)" value={counts.completed} color="#10B981" />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" as const }}>
        {[
          { v: "", l: "Awaiting + Calling" },
          { v: "queued", l: "Awaiting only" },
          { v: "doctor_calling", l: "Doctor calling" },
          { v: "completed", l: "Completed" },
        ].map(o => (
          <button key={o.v} onClick={() => setFilter(o.v)} style={pillBtn(filter === o.v, accent)}>
            {o.l}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center" as const, color: MUTE }}>⏳ Loading…</div>}

      {!loading && items.length === 0 && (
        <Empty text="No phone consultations match the filter." />
      )}

      {items.map(c => (
        <div key={c.id} style={{
          background: "#fff", borderRadius: 14, padding: 18, marginBottom: 10,
          border: `1px solid ${LINE}`, boxShadow: "0 2px 6px #0f172a08",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" as const }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" as const, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>{c.patient_name}</h2>
                <StatusBadge status={c.status} accent={accent} />
                {c.payment_status === "paid" && <span style={tag("#10B981")}>✓ ₹{c.fee_amount} paid</span>}
              </div>
              <div style={{ fontSize: 13, color: MUTE }}>
                📞 <a href={`tel:${c.patient_phone}`} style={{ color: accent, fontWeight: 700 }}>{c.patient_phone}</a>
                {c.patient_age && ` · ${c.patient_age} yrs`}
                {c.patient_gender && ` · ${c.patient_gender}`}
              </div>
              <div style={{ marginTop: 10, padding: 10, background: "#F8FAFC", borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, letterSpacing: 0.5 }}>CHIEF COMPLAINT</div>
                <div style={{ fontSize: 14, color: INK, marginTop: 4, whiteSpace: "pre-wrap" as const }}>{c.complaint}</div>
                {c.duration_complaint && (
                  <div style={{ fontSize: 12, color: MUTE, marginTop: 4 }}>Duration: {c.duration_complaint}</div>
                )}
              </div>
              <div style={{ fontSize: 11, color: MUTE, marginTop: 8 }}>
                Booked {timeAgo(c.created_at)}
                {c.paid_at && ` · Paid ${timeAgo(c.paid_at)}`}
                {c.called_at && ` · Started ${timeAgo(c.called_at)}`}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
              {c.status === "queued" && (
                <>
                  <button onClick={() => window.open(`tel:${c.patient_phone}`)} style={btnPrimary(accent)}>
                    📞 Call now
                  </button>
                  <button onClick={() => claim(c.id)} style={btnSecondary}>
                    Claim
                  </button>
                </>
              )}
              {c.status === "doctor_calling" && (
                <>
                  <button onClick={() => window.open(`tel:${c.patient_phone}`)} style={btnPrimary(accent)}>
                    📞 Re-call
                  </button>
                  <button onClick={() => setCompleting(c)} style={btnSuccess}>
                    ✓ Complete + Send Rx
                  </button>
                </>
              )}
              {c.status === "completed" && (
                <span style={tag("#10B981")}>
                  ✓ Rx sent {c.rx_sent_at ? timeAgo(c.rx_sent_at) : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {completing && (
        <CompleteModal
          consult={completing}
          accent={accent}
          onClose={() => setCompleting(null)}
          onComplete={async (data) => {
            try {
              const r = await api.consultComplete(completing.id, data);
              show(r.rx_id ? "✓ Completed — Rx sent" : "✓ Completed");
              setCompleting(null);
              load();
            } catch (e: any) { show("Error: " + e.message); }
          }}
        />
      )}
    </div>
  );
}

function CompleteModal({ consult, accent, onClose, onComplete }: any) {
  const [rxText, setRxText] = useState("");
  const [advice, setAdvice] = useState("");
  const [medicines, setMedicines] = useState<any[]>([{ name: "", dose: "", frequency: "", duration: "" }]);
  const [followup, setFollowup] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const addMed = () => setMedicines([...medicines, { name: "", dose: "", frequency: "", duration: "" }]);
  const updateMed = (i: number, k: string, v: string) => {
    const m = [...medicines]; m[i] = { ...m[i], [k]: v }; setMedicines(m);
  };
  const removeMed = (i: number) => setMedicines(medicines.filter((_, idx) => idx !== i));

  const submit = async () => {
    setSaving(true);
    try {
      await onComplete({
        consult_notes: notes || null,
        rx_text: rxText || null,
        medicines: medicines.filter(m => (m.name || "").trim()),
        advice: advice || null,
        followup_date: followup || null,
        create_patient_record: true,
      });
    } finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={modalCard}>
        <h2 style={{ margin: "0 0 4px" }}>Complete consultation</h2>
        <div style={{ fontSize: 13, color: MUTE, marginBottom: 16 }}>
          Patient: <b>{consult.patient_name}</b> · {consult.patient_phone}
        </div>

        <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 10, marginBottom: 14, fontSize: 13 }}>
          <b>Complaint:</b> {consult.complaint}
        </div>

        <Field label="Diagnosis / Rx text">
          <textarea value={rxText} onChange={e => setRxText(e.target.value)}
            style={textareaStyle} placeholder="e.g. Acute pulpitis, lower right molar. Pulpotomy advised." />
        </Field>

        <Field label="Medicines">
          {medicines.map((m, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr auto", gap: 6, marginBottom: 6 }}>
              <input value={m.name} onChange={e => updateMed(i, "name", e.target.value)}
                placeholder="Name" style={smallInput} />
              <input value={m.dose} onChange={e => updateMed(i, "dose", e.target.value)}
                placeholder="500mg" style={smallInput} />
              <input value={m.frequency} onChange={e => updateMed(i, "frequency", e.target.value)}
                placeholder="1-0-1 after food" style={smallInput} />
              <input value={m.duration} onChange={e => updateMed(i, "duration", e.target.value)}
                placeholder="5 days" style={smallInput} />
              <button onClick={() => removeMed(i)} style={{
                background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 8,
                padding: "0 10px", cursor: "pointer", fontWeight: 700,
              }}>✕</button>
            </div>
          ))}
          <button onClick={addMed} style={btnGhost}>+ Add another</button>
        </Field>

        <Field label="Advice">
          <textarea value={advice} onChange={e => setAdvice(e.target.value)}
            style={{ ...textareaStyle, minHeight: 60 }}
            placeholder="Rinse with warm salt water 2× daily, avoid hot/cold foods…" />
        </Field>

        <Field label="Follow-up date">
          <input type="date" value={followup} onChange={e => setFollowup(e.target.value)}
            style={smallInput} />
        </Field>

        <Field label="Internal notes (not sent to patient)">
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            style={{ ...textareaStyle, minHeight: 50 }} placeholder="Internal observations…" />
        </Field>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" as const, marginTop: 18 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={saving} style={btnPrimary(accent)}>
            {saving ? "Sending…" : "✓ Complete + Send Rx via WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────
function Stat({ label, value, color }: any) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: `1px solid ${LINE}` }}>
      <div style={{ fontSize: 11, color: MUTE, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}
function StatusBadge({ status, accent }: any) {
  const c = status === "queued" ? "#F59E0B" :
            status === "doctor_calling" ? accent :
            status === "completed" ? "#10B981" : MUTE;
  return <span style={tag(c)}>{status?.replace("_", " ")}</span>;
}
function Field({ label, children }: any) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}
function Empty({ text }: any) {
  return <div style={{ padding: 40, textAlign: "center" as const, color: MUTE, fontSize: 14, background: "#fff", borderRadius: 14 }}>{text}</div>;
}
function timeAgo(s?: string) {
  if (!s) return "";
  const diff = Date.now() - new Date(s).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
const tag = (color: string): any => ({
  background: `${color}1A`, color, padding: "2px 9px", borderRadius: 999,
  fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
});
const btnPrimary = (accent: string): any => ({
  background: accent, color: "#fff", border: "none", padding: "10px 16px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
});
const btnSecondary: any = {
  background: "#fff", color: INK, border: `1.5px solid ${LINE}`, padding: "10px 16px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const btnSuccess: any = {
  background: "#10B981", color: "#fff", border: "none", padding: "10px 16px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const btnGhost: any = {
  background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, padding: "8px 14px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const pillBtn = (active: boolean, accent: string): any => ({
  border: active ? `2px solid ${accent}` : `1.5px solid ${LINE}`,
  background: active ? `${accent}14` : "#fff",
  color: active ? accent : MUTE, padding: "6px 13px", borderRadius: 999,
  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});
const smallInput: any = {
  padding: "8px 10px", border: `1.5px solid ${LINE}`, borderRadius: 8,
  fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const,
};
const textareaStyle: any = {
  width: "100%", minHeight: 80, padding: 10, borderRadius: 10,
  border: `1.5px solid ${LINE}`, fontSize: 13, fontFamily: "inherit",
  resize: "vertical" as const, outline: "none", boxSizing: "border-box" as const,
};
const modalBackdrop: any = {
  position: "fixed", inset: 0, background: "#0f172aa0", zIndex: 200,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};
const modalCard: any = {
  background: "#fff", borderRadius: 16, padding: 22,
  maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "auto",
};
