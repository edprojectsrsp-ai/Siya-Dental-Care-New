"use client";
/** Simple prescription & visit tab — pro editor opens as optional final-review modal */
import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import PrescriptionStudio from "@/components/PrescriptionStudio";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";
const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const dmy = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

function SectionTitle({ children }: any) {
  return <div style={{ fontWeight: 800, fontSize: 14.5, color: INK, marginBottom: 8, display: "flex", alignItems: "center", gap: 7 }}>{children}</div>;
}
const card: any = { background: "#fff", borderRadius: 20, padding: 22, boxShadow: SHADOW };
const btn = (c: string): any => ({ background: c, color: "#fff", border: "none", padding: "12px 20px", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 14.5, fontFamily: "inherit" });
const iconBtn = (c: string): any => ({ width: 36, height: 36, borderRadius: 10, border: "none", background: c + "1A", color: c, cursor: "pointer", fontSize: 15, fontFamily: "inherit", fontWeight: 800 });
const chipGhost = (c: string): any => ({ background: c + "0D", color: c, border: `1.5px solid ${c}44`, padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
const lbl: any = { display: "block", fontSize: 12, fontWeight: 800, marginTop: 14, marginBottom: 7, color: "#475569", textTransform: "uppercase" as const, letterSpacing: .5 };
const inp: any = { width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "13px 16px", fontSize: 15, boxSizing: "border-box" as const, outline: "none", fontFamily: "inherit", background: "#fff" };

function normalizeStoredRx(rx: any) {
  return {
    id: rx.id,
    serial: rx.serial ?? rx.serial_number,
    date: rx.date || rx.created_at,
    complaint: rx.complaint || "",
    diagnosis: rx.diagnosis || "",
    oral_examination: rx.oral_examination || "",
    treatment_planned: rx.treatment_planned || "",
    treatment_done: rx.treatment_done || rx.doctor_raw_notes || "",
    doctor_notes: rx.doctor_notes || rx.internal_notes || "",
    medicines: Array.isArray(rx.medicines) ? rx.medicines : [],
    advice: rx.advice || rx.visible_advice || "",
    followup_date: rx.followup_date || null,
    pdf_url: rx.pdf_url || null,
  };
}

export default function RxTab({
  W, A, staff, show, clinicName, clinicId, aptId, reload,
  activeItems, ticked, toggleStep, toggleItemComplete,
  rxMeds, setRxMeds, advice, setAdvice, medCatalog, complaintText, setComplaintText, visitNotes, setVisitNotes,
}: any) {
  const [customStep, setCustomStep] = useState<Record<string, string>>({});
  const [viewRx, setViewRx] = useState<any>(null);
  const [showStudio, setShowStudio] = useState(false);
  const [showCombined, setShowCombined] = useState(false);
  const [lastRxId, setLastRxId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [learnedMeds, setLearnedMeds] = useState<{ name: string; reason: string; score: number }[]>([]);

  const doctorName = staff?.name || "Doctor";
  const activeDiags: string[] = useMemo(() =>
    Array.from(new Set((activeItems || []).map((x: any) => (x.diagnosis || "").trim()).filter(Boolean))), [activeItems]);
  const activeTreats: string[] = useMemo(() =>
    Array.from(new Set((activeItems || []).map((x: any) => (x.treatment_name || x.procedure_name || "").trim()).filter(Boolean))), [activeItems]);

  useEffect(() => {
    if (activeDiags.length === 0 && activeTreats.length === 0) { setLearnedMeds([]); return; }
    const diagP = activeDiags.map(d => api.wsClinicalSuggest("diag_medicine", d).then((r: any) => ({ d, suggestions: r.suggestions || [] })).catch(() => ({ d, suggestions: [] })));
    const treatP = activeTreats.map(t => api.wsClinicalSuggest("treat_med", t).then((r: any) => ({ t, suggestions: r.suggestions || [] })).catch(() => ({ t, suggestions: [] })));
    Promise.all([...diagP, ...treatP]).then(results => {
      const ranked = new Map<string, { score: number; reasons: Set<string> }>();
      results.forEach((r: any) => {
        const sourceLabel = r.d ? `for ${r.d}` : `for ${r.t}`;
        (r.suggestions || []).forEach((s: any) => {
          const existing = ranked.get(s.name) || { score: 0, reasons: new Set<string>() };
          existing.score += s.score || 1;
          existing.reasons.add(sourceLabel);
          ranked.set(s.name, existing);
        });
      });
      setLearnedMeds(Array.from(ranked.entries()).sort((a, b) => b[1].score - a[1].score).slice(0, 10)
        .map(([name, info]) => ({ name, score: info.score, reason: Array.from(info.reasons).slice(0, 2).join(" · ") })));
    });
  }, [activeDiags.join("|"), activeTreats.join("|")]); // eslint-disable-line

  const addSuggestedMed = (name: string) => {
    if (rxMeds.some((m: any) => (m.name || "").trim().toLowerCase() === name.toLowerCase())) { show(`"${name}" already in prescription`); return; }
    const cat = medCatalog.find((x: any) => x.name.toLowerCase() === name.toLowerCase());
    setRxMeds([...rxMeds, { name, strength: cat?.default_strength || "", dose: cat?.default_dose || "1 tab",
      frequency: cat?.default_frequency || "1-0-1", duration: cat?.default_duration || "5 days",
      instructions: cat?.instructions || "", linked_diagnosis: activeDiags[0] || null }]);
    show(`✓ ${name} added`);
  };

  const isTicked = (itemId: string, step: string) => ticked.some((t: any) => t.item_id === itemId && t.step === step);
  const itemDone = (itemId: string) => ticked.some((t: any) => t.item_id === itemId && t.item_completed);

  const addCustomStep = async (item: any) => {
    const v = (customStep[item.id] || "").trim();
    if (!v) return;
    toggleStep(item, v);
    if (item.procedure_id) api.wsAddWorkStep(item.procedure_id, v).then(() => show(`✓ "${v}" saved`)).catch(() => {});
    setCustomStep({ ...customStep, [item.id]: "" });
  };

  const addMedRow = () => setRxMeds([...rxMeds, { name: "", strength: "", dose: "1 tab", frequency: "1-0-1", duration: "5 days", instructions: "" }]);
  const setMed = (i: number, k: string, v: string) => { const n = [...rxMeds]; n[i] = { ...n[i], [k]: v }; setRxMeds(n); };
  const pickMed = (i: number, name: string) => {
    const m = medCatalog.find((x: any) => x.name === name);
    if (m) { const n = [...rxMeds]; n[i] = { name: m.name, strength: m.default_strength || "", dose: m.default_dose || "1 tab", frequency: m.default_frequency || "1-0-1", duration: m.default_duration || "5 days", instructions: m.instructions || "" }; setRxMeds(n); }
    else { setMed(i, "name", name); if (name.trim().length > 2) api.addMedicine({ name: name.trim(), category: "Custom", added_from: "workspace" }).catch(() => {}); }
    activeItems.forEach((item: any) => { if (item.treatment_name) api.wsRecordClinicalLink("treatment_medicine", item.treatment_name, name).catch(() => {}); });
  };

  const clinicalExamination = (W.tooth_examinations || []).map((x: any) => `Tooth ${x.tooth}: ${x.finding}${x.notes ? ` (${x.notes})` : ""}`).join("; ");
  const clinicalDiagnosis = Array.from(new Set([
    ...(W.tooth_diagnoses || []).map((x: any) => `Tooth ${x.tooth}: ${x.diagnosis}`),
    ...(activeItems || []).map((x: any) => x.diagnosis).filter(Boolean),
  ])).join("; ");
  const plannedTreatment = (activeItems || []).map((x: any) => `${x.treatment_name}${x.teeth?.length ? ` (${x.teeth.join(", ")})` : x.area_label ? ` (${x.area_label})` : ""}`).join("; ");

  const printRx = (visits: any[], fullClinical = true) => {
    const w = window.open("", "_blank", "width=820,height=900"); if (!w) return;
    const esc = (value: any) => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] || ch));
    const page = (rx: any, idx: number) => `
      <div class="page">
        <div class="head"><div><h1>🦷 ${clinicName}</h1><p>${esc(doctorName)}</p></div>
          <div class="meta">Rx #${rx.serial ?? idx + 1}<br/>${new Date(rx.date || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div></div>
        <div class="pt"><b>${esc(W.patient.name)}</b> · ${esc(W.patient.age || "—")}y / ${esc(W.patient.gender || "—")} · ${esc(W.patient.phone || "")}</div>
        ${rx.complaint ? `<section><b>Chief Complaint</b><p>${esc(rx.complaint)}</p></section>` : ""}
        ${fullClinical && rx.oral_examination ? `<section><b>Oral Examination</b><p>${esc(rx.oral_examination)}</p></section>` : ""}
        ${fullClinical && rx.diagnosis ? `<section><b>Diagnosis</b><p>${esc(rx.diagnosis)}</p></section>` : ""}
        ${fullClinical && rx.treatment_planned ? `<section><b>Treatment Planned</b><p>${esc(rx.treatment_planned)}</p></section>` : ""}
        ${fullClinical && rx.treatment_done ? `<section><b>Treatment Done Today</b><p>${esc(rx.treatment_done)}</p></section>` : ""}
        ${fullClinical && rx.doctor_notes ? `<section><b>Clinical Notes</b><p>${esc(rx.doctor_notes)}</p></section>` : ""}
        ${(rx.medicines || []).length ? `<table><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>
          ${rx.medicines.map((m: any, i: number) => `<tr><td>${i + 1}</td><td><b>${esc(m.name)}</b> ${esc(m.strength)}</td><td>${esc(m.dose)}</td><td>${esc(m.frequency)}</td><td>${esc(m.duration)}</td><td>${esc(m.instructions)}</td></tr>`).join("")}</table>` : ""}
        ${rx.advice ? `<section><b>Advice</b><p>${esc(rx.advice).replace(/\n/g, "<br/>")}</p></section>` : ""}
        ${rx.followup_date ? `<p><b>Review:</b> ${new Date(rx.followup_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>` : ""}
        <div class="sign">${esc(doctorName)}</div>
      </div>`;
    w.document.write(`<html><head><title>Prescription — ${W.patient.name}</title><style>
      body{font-family:system-ui,sans-serif;color:#0F172A;margin:0;background:#f1f5f9}
      .page{background:#fff;max-width:740px;margin:14px auto;padding:34px 40px;min-height:960px;position:relative;box-shadow:0 2px 10px rgba(0,0,0,.08);page-break-after:always}
      .head{display:flex;justify-content:space-between;border-bottom:3px solid #0E7C7B;padding-bottom:12px}
      h1{margin:0;font-size:24px;color:#0E7C7B} .head p{margin:3px 0 0;font-size:12px;color:#64748B}
      .meta{text-align:right;font-size:13px;font-weight:700} .pt{background:#F8FAFC;border-radius:8px;padding:8px 14px;margin:14px 0;font-size:14px}
      section{border-left:3px solid #0E7C7B;padding:5px 10px;margin:8px 0;background:#F8FAFC} section>b{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#0E7C7B} section p{margin:3px 0;font-size:13px;line-height:1.45}
      table{width:100%;border-collapse:collapse;font-size:13px;margin:10px 0} th,td{border:1px solid #CBD5E1;padding:7px 9px;text-align:left} th{background:#F1F5F9;font-size:11px}
      .sign{position:absolute;bottom:40px;right:46px;text-align:center;font-weight:700;border-top:1.5px solid #0F172A;padding-top:5px;font-size:13px}
      .toolbar{max-width:740px;margin:12px auto 0;padding:10px 14px;background:#0F172A;color:#CBD5E1;border-radius:10px;display:flex;align-items:center;gap:12px;font-size:12px}.toolbar button{border:0;border-radius:8px;padding:8px 16px;background:#0E7C7B;color:#fff;font-weight:800;cursor:pointer}
      @media print{body{background:#fff}.page{box-shadow:none;margin:0}.toolbar{display:none}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div>${visits.map(page).join("")}</body></html>`);
    w.document.close();
  };

  const currentRxObj = useMemo(() => ({
    serial: (W.prescriptions?.length || 0) + 1, date: new Date().toISOString(), complaint: complaintText,
    oral_examination: clinicalExamination, diagnosis: clinicalDiagnosis, treatment_planned: plannedTreatment,
    treatment_done: ticked.map((x: any) => `${x.step}${x.treatment ? ` — ${x.treatment}` : ""}${x.teeth?.length ? ` (${x.teeth.join(", ")})` : ""}`).join("; "),
    doctor_notes: visitNotes, medicines: rxMeds, advice, followup_date: null,
  }), [W.prescriptions, complaintText, clinicalExamination, clinicalDiagnosis, plannedTreatment, ticked, visitNotes, rxMeds, advice]); // eslint-disable-line

  const hasRxContent = rxMeds.length > 0 || advice.trim() || complaintText.trim() || clinicalDiagnosis || ticked.length > 0;
  const storedRxs = useMemo(() => (W.prescriptions || []).map(normalizeStoredRx), [W.prescriptions]);
  const allRxsForCombined = useMemo(() => {
    const list = [...storedRxs];
    if (hasRxContent) list.push(normalizeStoredRx({ ...currentRxObj, serial: list.length + 1 }));
    return list;
  }, [storedRxs, currentRxObj, hasRxContent]);

  const medsPayload = (meds: any[]) => meds.map(m => ({
    name: (m.name || "").trim(),
    strength: m.strength || "",
    dose: m.dose || "",
    frequency: m.frequency || "",
    duration: m.duration || "",
    instructions: m.instructions || "",
  })).filter(m => m.name);

  const finalizePrescription = async (form?: any, meds?: any[]) => {
    const useMeds = meds || rxMeds;
    const useAdvice = form?.advice ?? advice;
    const useComplaint = form?.complaint ?? complaintText;
    const useDiagnosis = form?.diagnosis ?? clinicalDiagnosis;
    const useNotes = form?.findings ?? visitNotes;
    const payload = {
      patient_id: W.patient.id,
      doctor_id: staff?.staff_id,
      clinic_id: clinicId,
      appointment_id: W.appointment?.id || aptId || null,
      plan_id: W.plan?.id || null,
      complaint: useComplaint || null,
      diagnosis: useDiagnosis || null,
      doctor_raw_notes: ticked.map((x: any) => x.step).join("; ") || useNotes || null,
      medicines: medsPayload(meds || useMeds),
      visible_advice: useAdvice || null,
      internal_notes: useNotes || null,
      followup_date: form?.followup ? new Date(form.followup).toISOString().slice(0, 10) : null,
    };
    if (!payload.medicines.length && !payload.visible_advice && !payload.complaint && !payload.diagnosis) {
      show("Add medicines, advice, or clinical notes before finalising");
      return null;
    }
    setBusy("finalise");
    try {
      const saved = await api.createPrescription(payload);
      setLastRxId(saved.id);
      show("✓ Prescription finalised & saved");
      setShowStudio(false);
      await reload?.();
      return saved;
    } catch (e: any) {
      show(e?.message || "Failed to save prescription");
      return null;
    } finally { setBusy(""); }
  };

  const sendRxById = async (rxId: string) => {
    setBusy("send");
    try {
      const res = await api.sendPrescription(rxId);
      show(res?.whatsapp?.status === "sent" ? "✓ Prescription sent on WhatsApp" : "✓ Send queued");
      return res;
    } catch (e: any) {
      show(e?.message || "Failed to send prescription");
      return null;
    } finally { setBusy(""); }
  };

  const sendCurrent = async () => {
    let rxId = lastRxId;
    if (!rxId) {
      const saved = await finalizePrescription();
      if (!saved) return;
      rxId = saved.id;
    }
    await sendRxById(rxId);
  };

  const waCombined = () => {
    const digits = (W.patient.phone || "").replace(/\D/g, "");
    const to = digits.length === 10 ? "91" + digits : digits;
    if (!to) { show("No patient phone number"); return; }
    const lines = [`🦷 ${clinicName} — Complete Prescription Record`, `${W.patient.name}`, ""];
    allRxsForCombined.forEach((rx, vi) => {
      lines.push(`── Visit ${rx.serial || vi + 1} · ${dmy(rx.date)} ──`);
      if (rx.complaint) lines.push(`Complaint: ${rx.complaint}`);
      if (rx.diagnosis) lines.push(`Diagnosis: ${rx.diagnosis}`);
      (rx.medicines || []).forEach((m: any, i: number) => {
        lines.push(`${i + 1}. ${m.name} ${m.strength || ""} — ${m.frequency || m.dose || ""} × ${m.duration || ""}`);
      });
      if (rx.advice) lines.push(`Advice: ${rx.advice}`);
      lines.push("");
    });
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
          <div style={card}>
            <SectionTitle>✅ Section A — Today&apos;s Work <span style={{ fontSize: 11, fontWeight: 500, color: MUTE }}>tick what was done</span></SectionTitle>
            {activeItems.length === 0 && <div style={{ fontSize: 13, color: MUTE }}>No active treatments — add them in Treatment Plan first.</div>}
            {activeItems.map((item: any) => {
              const steps: string[] = (item.work_steps || []).length ? item.work_steps : [`${item.treatment_name} Done`];
              const done: string[] = item.completed_steps || [];
              return (
                <div key={item.id} style={{ border: `1.5px solid ${itemDone(item.id) ? "#A7F3D0" : LINE}`, background: itemDone(item.id) ? "#F0FDF4" : "#fff", borderRadius: 14, padding: "12px 14px", marginBottom: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" as const }}>
                    <b style={{ fontSize: 14 }}>{item.treatment_name} <span style={{ color: A }}>{item.area_label || (item.teeth || []).join(", ")}</span></b>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: itemDone(item.id) ? "#059669" : MUTE, cursor: "pointer" }}>
                      <input type="checkbox" checked={itemDone(item.id)} onChange={() => toggleItemComplete(item)} style={{ width: 15, height: 15, accentColor: "#059669" }} />
                      Treatment fully completed
                    </label>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {steps.map(s => {
                      const prev = done.includes(s), now = isTicked(item.id, s);
                      return (
                        <button key={s} onClick={() => !prev && toggleStep(item, s)} disabled={prev}
                          style={{ border: now ? `2px solid ${A}` : `1.5px solid ${prev ? "#A7F3D0" : LINE}`, borderRadius: 999, padding: "6px 13px",
                            background: prev ? "#D1FAE5" : now ? A : "#fff", color: prev ? "#065F46" : now ? "#fff" : "#475569",
                            fontWeight: 700, fontSize: 12.5, cursor: prev ? "default" : "pointer", fontFamily: "inherit", opacity: prev ? .8 : 1 }}>
                          {(prev || now) ? "✓ " : "☐ "}{s}{prev ? " (earlier)" : ""}
                        </button>
                      );
                    })}
                  </div>
                  <input value={customStep[item.id] || ""} onChange={e => setCustomStep({ ...customStep, [item.id]: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && addCustomStep(item)} placeholder="Custom work + Enter" style={{ ...inp, fontSize: 12.5, padding: "7px 11px", marginTop: 8 }} />
                </div>
              );
            })}
          </div>

          <div style={card}>
            <SectionTitle>💊 Section B — Medicines <span style={{ background: A + "15", color: A, borderRadius: 999, padding: "1px 9px", fontSize: 11, fontWeight: 800 }}>{rxMeds.length}</span></SectionTitle>
            {learnedMeds.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {learnedMeds.map(m => {
                  const used = rxMeds.some((x: any) => (x.name || "").trim().toLowerCase() === m.name.toLowerCase());
                  return (
                    <button key={m.name} type="button" disabled={used} onClick={() => addSuggestedMed(m.name)}
                      style={{ ...chipGhost(used ? A : "#475569"), opacity: used ? .7 : 1 }}>{used ? "✓ " : "+ "}{m.name}</button>
                  );
                })}
              </div>
            )}
            {rxMeds.map((m: any, i: number) => (
              <div key={i} style={{ background: SOFT, borderRadius: 12, padding: 10, marginBottom: 7 }}>
                <div style={{ display: "grid", gridTemplateColumns: "3fr 1.4fr auto", gap: 6 }}>
                  <input list="ws-meds" value={m.name} onChange={e => pickMed(i, e.target.value)} placeholder="Medicine name" style={{ ...inp, fontWeight: 800 }} />
                  <input value={m.strength || ""} onChange={e => setMed(i, "strength", e.target.value)} placeholder="Strength" style={inp} />
                  <button onClick={() => setRxMeds(rxMeds.filter((_: any, x: number) => x !== i))} style={{ ...iconBtn("#EF4444"), width: 36, height: "auto" }}>🗑</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 6, marginTop: 6 }}>
                  <input value={m.dose || ""} onChange={e => setMed(i, "dose", e.target.value)} placeholder="Dose" style={inp} />
                  <input value={m.frequency || ""} onChange={e => setMed(i, "frequency", e.target.value)} placeholder="1-0-1" style={inp} />
                  <input value={m.duration || ""} onChange={e => setMed(i, "duration", e.target.value)} placeholder="5 days" style={inp} />
                  <input value={m.instructions || ""} onChange={e => setMed(i, "instructions", e.target.value)} placeholder="After food…" style={inp} />
                </div>
              </div>
            ))}
            <datalist id="ws-meds">{medCatalog.map((m: any) => <option key={m.id || m.name} value={m.name} />)}</datalist>
            <button onClick={addMedRow} style={{ ...btn("#6366F1"), marginTop: 4 }}>＋ Add Medicine</button>
          </div>

          <div style={card}>
            <SectionTitle>📝 Section C — Advice</SectionTitle>
            <textarea value={advice} onChange={e => setAdvice(e.target.value)} placeholder={"Avoid chewing on treated side\nWarm saline rinse twice daily"} style={{ ...inp, minHeight: 70, resize: "vertical" as const }} />
            <label style={lbl}>Clinical Notes</label>
            <textarea value={visitNotes} onChange={e => setVisitNotes(e.target.value)} placeholder="Clinical notes for this visit…" style={{ ...inp, minHeight: 52, resize: "vertical" as const }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
          <div style={card}>
            <SectionTitle>🕘 Section D — Previous Prescriptions <span style={{ fontSize: 11, fontWeight: 600, color: MUTE }}>({storedRxs.length})</span></SectionTitle>
            {storedRxs.length === 0 && <div style={{ fontSize: 13, color: MUTE }}>No saved prescriptions yet. Finalise today&apos;s Rx in Section E.</div>}
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {[...storedRxs].reverse().map((rx: any, i: number) => (
                <button key={rx.id} onClick={() => setViewRx(viewRx?.id === rx.id ? null : rx)}
                  style={{ ...chipGhost(viewRx?.id === rx.id ? A : "#475569"), padding: "7px 13px", fontSize: 12, ...(viewRx?.id === rx.id ? { background: A, color: "#fff", fontWeight: 800 } : {}) }}>
                  Visit {rx.serial || (storedRxs.length - i)} · {dmy(rx.date)}
                </button>
              ))}
            </div>
            {viewRx && (
              <div style={{ marginTop: 10, background: SOFT, borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.5 }}>
                {viewRx.complaint && <div style={{ marginBottom: 6 }}><b>Complaint:</b> {viewRx.complaint}</div>}
                {viewRx.diagnosis && <div style={{ marginBottom: 6 }}><b>Diagnosis:</b> {viewRx.diagnosis}</div>}
                {(viewRx.medicines || []).length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <b>Medicines:</b>
                    {(viewRx.medicines || []).map((m: any, i: number) => (
                      <div key={i} style={{ marginLeft: 8 }}>{i + 1}. <b>{m.name}</b> {m.strength} — {m.frequency || m.dose} × {m.duration}{m.instructions ? ` · ${m.instructions}` : ""}</div>
                    ))}
                  </div>
                )}
                {viewRx.advice && <div style={{ marginBottom: 8 }}><b>Advice:</b> {viewRx.advice}</div>}
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                  <button onClick={() => printRx([viewRx], true)} style={{ ...btn(A), fontSize: 12, padding: "7px 12px" }}>🖨 Print</button>
                  <button disabled={busy === "send"} onClick={() => sendRxById(viewRx.id)} style={{ ...btn("#25D366"), fontSize: 12, padding: "7px 12px", opacity: busy === "send" ? .7 : 1 }}>📲 Send</button>
                  <button onClick={() => window.open(api.prescriptionV2Url(viewRx.id), "_blank")} style={{ ...btn("#475569"), fontSize: 12, padding: "7px 12px" }}>📄 PDF</button>
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            <SectionTitle>🖨 Section E — Output</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button disabled={busy === "finalise"} onClick={() => setShowStudio(true)} style={{ ...btn(A), opacity: busy === "finalise" ? .7 : 1 }}>
                ✓ Finalise Prescription
              </button>
              <button onClick={() => printRx([currentRxObj], true)} style={btn("#0F172A")}>🖨 Print</button>
              <button disabled={busy === "send"} onClick={sendCurrent} style={{ ...btn("#25D366"), opacity: busy === "send" ? .7 : 1 }}>📲 Send</button>
              <button onClick={() => setShowCombined(true)} style={btn("#6366F1")}>📋 View Full Record</button>
            </div>
            <div style={{ fontSize: 11, color: MUTE, marginTop: 8 }}>
              Finalise opens the editor to review &amp; save. View Full Record shows all visits combined till date.
            </div>
          </div>

          <div style={card}>
            <SectionTitle>🩺 Visit History</SectionTitle>
            {(W.visits || []).slice(0, 6).map((v: any) => (
              <div key={v.id} style={{ borderLeft: `3px solid ${A}55`, paddingLeft: 10, marginBottom: 9 }}>
                <b style={{ fontSize: 12.5 }}>{dmy(v.date)}</b> <span style={{ color: "#059669", fontWeight: 800, fontSize: 12 }}>· {fmt(v.collected)}</span>
                <div style={{ fontSize: 12, color: "#475569" }}>{(v.work || []).map((w: any) => w.step).filter(Boolean).join(" · ") || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showStudio && (
        <PrescriptionStudio
          key={`rx-studio-${W?.patient?.id}-${rxMeds.length}`}
          W={W} staff={staff} clinicName={clinicName} accent={A} show={show}
          activeItems={activeItems} ticked={ticked}
          rxMeds={rxMeds} setRxMeds={setRxMeds} advice={advice} setAdvice={setAdvice}
          complaintText={complaintText} setComplaintText={setComplaintText}
          visitNotes={visitNotes} setVisitNotes={setVisitNotes}
          onClose={() => setShowStudio(false)}
          onFinalize={finalizePrescription}
        />
      )}

      {showCombined && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(15,23,42,.5)", backdropFilter: "blur(3px)", overflow: "auto", padding: 20 }}>
          <div style={{ maxWidth: 820, margin: "0 auto", background: "#fff", borderRadius: 20, padding: 22, boxShadow: SHADOW }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <SectionTitle>📋 Complete Prescription Record — {W.patient.name}</SectionTitle>
              <button onClick={() => setShowCombined(false)} style={{ ...iconBtn("#475569"), width: 40, height: 40 }}>✕</button>
            </div>
            {allRxsForCombined.length === 0 && <div style={{ fontSize: 13, color: MUTE }}>No prescription data yet.</div>}
            {allRxsForCombined.map((rx, vi) => (
              <div key={rx.id || `draft-${vi}`} style={{ border: `1.5px solid ${LINE}`, borderRadius: 14, padding: 14, marginBottom: 10, background: SOFT }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: A, marginBottom: 8 }}>Visit {rx.serial || vi + 1} · {dmy(rx.date)}</div>
                {rx.complaint && <div style={{ fontSize: 13, marginBottom: 4 }}><b>Complaint:</b> {rx.complaint}</div>}
                {rx.diagnosis && <div style={{ fontSize: 13, marginBottom: 4 }}><b>Diagnosis:</b> {rx.diagnosis}</div>}
                {rx.treatment_done && <div style={{ fontSize: 13, marginBottom: 4 }}><b>Treatment done:</b> {rx.treatment_done}</div>}
                {(rx.medicines || []).map((m: any, i: number) => (
                  <div key={i} style={{ fontSize: 13, marginLeft: 4 }}>{i + 1}. <b>{m.name}</b> {m.strength} — {m.frequency || m.dose} × {m.duration}</div>
                ))}
                {rx.advice && <div style={{ fontSize: 13, marginTop: 6 }}><b>Advice:</b> {rx.advice}</div>}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" as const }}>
              <button onClick={() => printRx(allRxsForCombined, true)} style={btn(A)}>🖨 Print All</button>
              <button onClick={waCombined} style={btn("#25D366")}>📲 Send via WhatsApp</button>
              <button disabled={busy === "send"} onClick={async () => {
                const lastSaved = storedRxs[storedRxs.length - 1];
                if (lastSaved?.id) await sendRxById(lastSaved.id);
                else { const s = await finalizePrescription(); if (s?.id) await sendRxById(s.id); }
              }} style={{ ...btn("#0F172A"), opacity: busy === "send" ? .7 : 1 }}>📲 Send Latest (PDF)</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}