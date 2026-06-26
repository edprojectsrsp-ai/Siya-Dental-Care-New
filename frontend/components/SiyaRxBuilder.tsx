"use client";
/**
 * SiyaRxBuilder — split form + live A4 preview (user reference layout)
 * Left: editable fields · Right: print-ready prescription page
 */
import React, { useCallback, useMemo, useState } from "react";

const TEAL = "#009688";
const TEAL_DARK = "#008b83";
const INK = "#1f2937";
const MUTE = "#666";

export type SiyaRxForm = {
  patientName: string;
  ageSex: string;
  mobile: string;
  patientId: string;
  complaint: string;
  findings: string;
  diagnosis: string;
  procedure: string;
  plan: string;
  medsText: string;
  advice: string;
  followup: string;
};

export type SiyaRxMed = { name: string; strength?: string; dose?: string; frequency: string; duration: string; instructions: string };

const nl = (t: string) => t.split("\n").filter(Boolean);

function medsToText(meds: SiyaRxMed[]): string {
  return meds.map(m => {
    const label = [m.name, m.strength].filter(Boolean).join(" ").trim();
    return `${label} | ${m.frequency || m.dose || "—"} | ${m.duration || "—"} | ${m.instructions || ""}`;
  }).join("\n");
}

export function parseMedsText(text: string): SiyaRxMed[] {
  return nl(text).map(line => {
    const p = line.split("|").map(x => x.trim());
    const full = p[0] || "";
    const parts = full.split(/\s+/);
    const name = parts.slice(0, -1).join(" ") || full;
    const maybeStrength = parts.length > 1 ? parts[parts.length - 1] : "";
    const hasDigit = /\d/.test(maybeStrength);
    return {
      name: hasDigit && parts.length > 1 ? name : full,
      strength: hasDigit && parts.length > 1 ? maybeStrength : "",
      frequency: p[1] || "",
      duration: p[2] || "",
      instructions: p[3] || "",
      dose: p[1] || "",
    };
  }).filter(m => m.name);
}

function PreviewBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #dde7ea", borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <h3 style={{ margin: "0 0 8px", color: TEAL, fontSize: 14, letterSpacing: 1 }}>{title}</h3>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: INK, whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}

function RxPage({
  clinicName, tagline, doctorName, doctorQual, doctorReg, dateStr, form,
}: {
  clinicName: string; tagline?: string; doctorName: string; doctorQual?: string; doctorReg?: string;
  dateStr: string; form: SiyaRxForm;
}) {
  const medRows = useMemo(() => parseMedsText(form.medsText), [form.medsText]);

  return (
    <div className="siya-rx-page" style={{
      background: "white", width: 794, minHeight: 1123, margin: "auto", padding: 45,
      boxShadow: "0 6px 25px rgba(0,0,0,.08)", boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `3px solid ${TEAL}`, paddingBottom: 15 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: "bold", color: TEAL }}>🦷 {clinicName}</div>
          <div style={{ fontSize: 12, color: MUTE }}>{tagline || "Advanced Care. Beautiful Smiles."}</div>
        </div>
        <div style={{ fontSize: 12, color: MUTE, textAlign: "right" }}>
          <b style={{ color: INK }}>{doctorName}</b><br />
          {doctorQual && <>{doctorQual}<br /></>}
          {doctorReg && <>Reg. No. {doctorReg}<br /></>}
          Date: {dateStr}
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.5fr", gap: 10,
        background: "#f0fbfa", padding: 14, margin: "18px 0", borderRadius: 10,
      }}>
        {[
          [form.patientName, "Patient Name"],
          [form.ageSex, "Age / Sex"],
          [form.patientId, "Patient ID"],
          [form.mobile, "Mobile"],
        ].map(([val, lbl]) => (
          <div key={lbl}>
            <b style={{ fontSize: 13 }}>{val || "—"}</b><br />
            <span style={{ fontSize: 12, color: MUTE }}>{lbl}</span>
          </div>
        ))}
      </div>

      {form.complaint.trim() && <PreviewBox title="CHIEF COMPLAINT">{form.complaint}</PreviewBox>}
      {form.findings.trim() && <PreviewBox title="CLINICAL FINDINGS / OBSERVATION">{form.findings}</PreviewBox>}
      {form.diagnosis.trim() && <PreviewBox title="DIAGNOSIS">{form.diagnosis}</PreviewBox>}
      {form.procedure.trim() && <PreviewBox title="PROCEDURE DONE TODAY">{form.procedure}</PreviewBox>}
      {form.plan.trim() && <PreviewBox title="TREATMENT PLAN">{form.plan}</PreviewBox>}

      {medRows.length > 0 && (
        <div style={{ border: "1px solid #dde7ea", borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 8px", color: TEAL, fontSize: 14, letterSpacing: 1 }}>PRESCRIPTION</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Medicine", "Dosage", "Duration", "Instruction"].map(h => (
                  <th key={h} style={{ borderBottom: "1px solid #ddd", padding: 8, textAlign: "left", fontSize: 13, color: INK }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medRows.map((m, i) => (
                <tr key={i}>
                  <td style={{ borderBottom: "1px solid #ddd", padding: 8, fontSize: 13 }}>{[m.name, m.strength].filter(Boolean).join(" ")}</td>
                  <td style={{ borderBottom: "1px solid #ddd", padding: 8, fontSize: 13 }}>{m.frequency || m.dose}</td>
                  <td style={{ borderBottom: "1px solid #ddd", padding: 8, fontSize: 13 }}>{m.duration}</td>
                  <td style={{ borderBottom: "1px solid #ddd", padding: 8, fontSize: 13 }}>{m.instructions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form.advice.trim() && <PreviewBox title="ADVICE / INSTRUCTIONS">{form.advice}</PreviewBox>}
      {form.followup.trim() && <PreviewBox title="FOLLOW-UP">{form.followup}</PreviewBox>}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 35, borderTop: "1px solid #ddd", paddingTop: 18 }}>
        <div style={{ fontSize: 12, color: MUTE }}>Scan QR in final version for patient portal / follow-up booking.</div>
        <div style={{ textAlign: "right", fontWeight: "bold", fontSize: 13 }}>
          {doctorName}<br />
          <span style={{ fontSize: 12, color: MUTE, fontWeight: 400 }}>Digital Signature</span>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontWeight: "bold", fontSize: 13, marginTop: 12, display: "block", color: INK };
const fld: React.CSSProperties = {
  width: "100%", padding: 10, marginTop: 5, border: "1px solid #ccc", borderRadius: 8,
  fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
};
const ta: React.CSSProperties = { ...fld, height: 70, resize: "vertical" as const };

export default function SiyaRxBuilder({
  clinicName, staff, initial, onApply, onClose, onFinalize, show, finalizing,
}: {
  clinicName: string;
  staff: any;
  initial: SiyaRxForm;
  onApply?: (form: SiyaRxForm, meds: SiyaRxMed[]) => void;
  onClose?: () => void;
  onFinalize?: (form: SiyaRxForm, meds: SiyaRxMed[]) => void | Promise<void>;
  show?: (m: string) => void;
  finalizing?: boolean;
}) {
  const [form, setForm] = useState<SiyaRxForm>(initial);
  const [preview, setPreview] = useState<SiyaRxForm>(initial);

  const doctorName = staff?.name?.startsWith("Dr") ? staff.name : `Dr. ${staff?.name || "Doctor"}`;
  const doctorQual = staff?.role === "doctor" ? "BDS, MDS" : staff?.qualification || "BDS";
  const doctorReg = staff?.reg_no || staff?.registration_no || "";
  const dateStr = new Date().toLocaleDateString("en-IN");

  const set = (k: keyof SiyaRxForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const updatePreview = useCallback(() => {
    setPreview({ ...form });
    const meds = parseMedsText(form.medsText);
    onApply?.(form, meds);
    show?.("Preview updated");
  }, [form, onApply, show]);

  const printRx = () => {
    setPreview({ ...form });
    const meds = parseMedsText(form.medsText);
    onApply?.(form, meds);
    setTimeout(() => window.print(), 120);
  };

  const pullFromChart = () => {
    setForm({ ...initial });
    setPreview({ ...initial });
    show?.("Reloaded from visit data");
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .siya-rx-print-root, .siya-rx-print-root * { visibility: visible; }
          .siya-rx-print-root { position: absolute; left: 0; top: 0; width: 100%; }
          .siya-rx-form-panel { display: none !important; }
          .siya-rx-page { box-shadow: none !important; width: auto !important; margin: 0 !important; }
        }
      `}</style>

      <div style={{
        display: "grid", gridTemplateColumns: onClose ? "minmax(320px, 380px) 1fr" : "380px 1fr",
        minHeight: onClose ? "auto" : "calc(100vh - 80px)", background: "#eef4f6", color: INK,
      }}>
        {/* LEFT — Form */}
        <div className="siya-rx-form-panel" style={{ background: "white", padding: 22, borderRight: "1px solid #ddd", overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ marginTop: 0, color: TEAL_DARK, fontSize: 20 }}>Prescription Builder</h2>
            {onClose && (
              <button onClick={onClose} style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700 }}>✕</button>
            )}
          </div>

          <label style={lbl}>Patient Name</label>
          <input style={fld} value={form.patientName} onChange={e => set("patientName", e.target.value)} />

          <label style={lbl}>Age / Sex</label>
          <input style={fld} value={form.ageSex} onChange={e => set("ageSex", e.target.value)} />

          <label style={lbl}>Mobile</label>
          <input style={fld} value={form.mobile} onChange={e => set("mobile", e.target.value)} />

          <label style={lbl}>Patient ID</label>
          <input style={fld} value={form.patientId} onChange={e => set("patientId", e.target.value)} />

          <label style={lbl}>Chief Complaint</label>
          <textarea style={ta} value={form.complaint} onChange={e => set("complaint", e.target.value)} />

          <label style={lbl}>Clinical Findings</label>
          <textarea style={{ ...ta, height: 90 }} value={form.findings} onChange={e => set("findings", e.target.value)} />

          <label style={lbl}>Diagnosis</label>
          <textarea style={ta} value={form.diagnosis} onChange={e => set("diagnosis", e.target.value)} />

          <label style={lbl}>Procedure Done Today</label>
          <textarea style={ta} value={form.procedure} onChange={e => set("procedure", e.target.value)} />

          <label style={lbl}>Treatment Plan</label>
          <textarea style={ta} value={form.plan} onChange={e => set("plan", e.target.value)} />

          <label style={lbl}>Medicines <span style={{ fontWeight: 400, color: MUTE }}>(Name | Dosage | Duration | Instruction — one per line)</span></label>
          <textarea style={{ ...ta, height: 100 }} value={form.medsText} onChange={e => set("medsText", e.target.value)} />

          <label style={lbl}>Advice</label>
          <textarea style={{ ...ta, height: 90 }} value={form.advice} onChange={e => set("advice", e.target.value)} />

          <label style={lbl}>Follow-up</label>
          <input style={fld} value={form.followup} onChange={e => set("followup", e.target.value)} />

          <button onClick={updatePreview} style={{ marginTop: 18, width: "100%", padding: 12, background: TEAL, color: "white", border: 0, borderRadius: 8, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
            Update Preview
          </button>
          <button onClick={printRx} style={{ marginTop: 10, width: "100%", padding: 12, background: "#0f766e", color: "white", border: 0, borderRadius: 8, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
            Print / PDF
          </button>
          {onFinalize && (
            <button
              disabled={finalizing}
              onClick={() => { const meds = parseMedsText(form.medsText); onApply?.(form, meds); onFinalize(form, meds); }}
              style={{ marginTop: 10, width: "100%", padding: 12, background: "#0F172A", color: "white", border: 0, borderRadius: 8, fontWeight: "bold", cursor: finalizing ? "wait" : "pointer", fontFamily: "inherit", opacity: finalizing ? .7 : 1 }}
            >
              {finalizing ? "Saving…" : "✓ Finalise & Save Prescription"}
            </button>
          )}
          <button onClick={pullFromChart} style={{ marginTop: 10, width: "100%", padding: 10, background: "#fff", color: TEAL_DARK, border: `1px solid ${TEAL}`, borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            ↻ Reload from visit
          </button>
        </div>

        {/* RIGHT — Preview */}
        <div className="siya-rx-print-root" style={{ padding: 30, overflow: "auto" }}>
          <RxPage
            clinicName={clinicName}
            doctorName={doctorName}
            doctorQual={doctorQual}
            doctorReg={doctorReg}
            dateStr={dateStr}
            form={preview}
          />
        </div>
      </div>
    </>
  );
}

/** Build form from treatment workspace state */
export function buildSiyaRxForm(args: {
  W: any; complaintText: string; visitNotes: string; activeItems: any[]; ticked: any[];
  rxMeds: SiyaRxMed[]; advice: string; followup?: string;
}): SiyaRxForm {
  const P = args.W?.patient;
  const findings = [
    ...(args.W?.tooth_conditions || []).map((x: any) => `${x.tooth} - ${x.condition}${x.notes ? ` (${x.notes})` : ""}`),
    ...(args.W?.tooth_examinations || []).map((x: any) => `${x.tooth} - ${x.finding}${x.notes ? ` (${x.notes})` : ""}`),
  ].join("\n");
  const diagnosis = Array.from(new Set([
    ...(args.W?.tooth_diagnoses || []).map((x: any) => `${x.tooth} - ${x.diagnosis}`),
    ...(args.activeItems || []).map((x: any) => x.diagnosis).filter(Boolean),
  ])).join("\n");
  const plan = (args.activeItems || [])
    .map((x: any) => `${x.treatment_name}${x.teeth?.length ? ` (#${x.teeth.join(", #")})` : ""}`)
    .join("\n");
  const procedure = (args.ticked || [])
    .map((x: any) => x.step)
    .join("\n");

  return {
    patientName: P?.name || "",
    ageSex: `${P?.age || "—"} / ${P?.gender || "—"}`,
    mobile: P?.phone || "",
    patientId: P?.id ? `SIDC-${String(P.id).slice(0, 6).toUpperCase()}` : "",
    complaint: args.complaintText || "",
    findings,
    diagnosis,
    procedure,
    plan,
    medsText: medsToText(args.rxMeds),
    advice: args.advice || "",
    followup: args.followup || "",
  };
}

export { medsToText };