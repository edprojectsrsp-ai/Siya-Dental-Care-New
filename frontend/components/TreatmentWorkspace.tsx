"use client";
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TREATMENT WORKSPACE v3 — intelligent chair-side assistant        ║
// ║  Fixed header (finance + Close Visit/Treatment) · 6 tabs:         ║
// ║  Overview · Treatment Plan (MASTER) · Prescription & Visit ·      ║
// ║  Tooth Chart · Files/RVG · Financials.                            ║
// ║  Everything derives from the Treatment Plan. Visits auto-create.  ║
// ║  Target: follow-up visit completed in under 1 minute.             ║
// ╚══════════════════════════════════════════════════════════════════╝
import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect, type ReactNode } from "react";
import * as api from "@/lib/api";
import { TypeBadge } from "@/components/AppointmentHub";
import { ClinicalToothTab } from "@/components/ClinicalToothTab";
import { LabGuardBanner } from "@/components/LabGuardBanner";
import type { ChartRegion } from "@/components/ToothWidget";
import { Save, ArrowLeft, CheckCircle, DollarSign } from "lucide-react";
import TreatmentPlanCards from "@/components/TreatmentPlanCards";
import { TreatmentPlanTab } from "@/components/clinical/TreatmentPlanTab";
import { PaymentsTab } from "@/components/clinical/PaymentsTab";
import { getPlanBillingBlockers, isPlanBillingReady, planBillingGateMessage } from "@/components/clinical/planBillingGate";
import ToothSummaryGrid from "@/components/clinical/ToothSummaryGrid";
import SendToLabModal from "@/components/SendToLabModal";
import SendToSpecialistModal from "@/components/SendToSpecialistModal";
import { DoctorCoordinationTab } from "@/components/DoctorCoordinationTab";
import RxTab from "@/components/RxTab";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";
const SHADOW_LG = "0 8px 30px rgba(15,23,42,.14)";
const COND_CHIPS = ["Diabetes", "Hypertension", "Thyroid", "Cardiac", "Allergy", "Pregnancy"];
const COMPLAINT_CHIPS = ["Tooth Pain", "Sensitivity", "Swelling", "Broken Tooth", "Bleeding Gums", "Cleaning"];
const ADJ_REASONS = ["Courtesy", "Regular Patient", "Staff Reference", "Other"];
const ADULT_Q = [[18,17,16,15,14,13,12,11],[21,22,23,24,25,26,27,28],[48,47,46,45,44,43,42,41],[31,32,33,34,35,36,37,38]];
const CHILD_Q = [[55,54,53,52,51],[61,62,63,64,65],[85,84,83,82,81],[71,72,73,74,75]];
const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const dmy = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

// ─── Care status: shared status → pill mapping (lab + specialist) ───
const LAB_PILL: Record<string, { label: string; color: string }> = {
  pending:  { label: "preparing to send", color: "#F59E0B" },
  sent:     { label: "at lab",            color: "#3B82F6" },
  received: { label: "ready — book fitting", color: "#059669" },
};
function labPillInfo(o: any) {
  const base = LAB_PILL[o.status];
  if (!base) return null;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = o.expected_date && o.expected_date < today && ["pending", "sent"].includes(o.status);
  const teeth = (o.teeth?.length ? o.teeth : o.linked_treatment_teeth) || [];
  const title = `${o.work_type || "Lab work"}${teeth.length ? ` ${teeth.join(",")}` : ""}`;
  const due = o.expected_date ? (overdue ? `overdue since ${dmy(o.expected_date)}` : `due ${dmy(o.expected_date)}`) : "";
  return { title, label: overdue ? "OVERDUE" : base.label, due, color: overdue ? "#DC2626" : base.color, overdue };
}
function specPillInfo(s: any) {
  const status = s.specialist_session_status || s.session_status || "pending";
  if (status === "verified") return null;
  const awaiting = status === "closed" || status === "done";
  return {
    title: `Dr. ${s.specialist_name || "Specialist"}`,
    label: awaiting ? "awaiting your verify" : `scheduled ${dmy(s.scheduled_date)}`,
    color: awaiting ? "#D97706" : "#7C3AED",
    awaiting,
  };
}

// ─── F1+F2: sticky strip — medical alerts + live lab/specialist status.
// Visible on every tab, survives scroll. Click a care pill → Coordination.
function CareStrip({ P, W, onOpenCoordination }: { P: any; W: any; onOpenCoordination: () => void }) {
  const alerts: string[] = Array.from(new Set([...(P.health_alerts || []), ...(P.existing_illnesses || [])]));
  const labPills = (W?.lab_orders || []).map(labPillInfo).filter(Boolean) as any[];
  const specPills = (W?.specialist_cases || []).map(specPillInfo).filter(Boolean) as any[];
  if (!alerts.length && !labPills.length && !specPills.length) return null;
  const pillBase = { display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "4px 11px", fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap" as const };
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 40, background: "#fff", borderRadius: 14, padding: "8px 14px", marginBottom: 12, boxShadow: SHADOW, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", border: alerts.length ? "1.5px solid #FECACA" : `1.5px solid ${LINE}` }}>
      {alerts.map(a => (
        <span key={a} style={{ ...pillBase, background: "#FEE2E2", color: "#991B1B" }}>⚠ {a}</span>
      ))}
      {alerts.length > 0 && (labPills.length + specPills.length) > 0 && (
        <span style={{ width: 1, height: 18, background: LINE }} />
      )}
      {labPills.map((p, i) => (
        <button key={`lab${i}`} onClick={onOpenCoordination} title={p.due || "Open coordination"}
          style={{ ...pillBase, background: p.color + "18", color: p.color, border: `1.5px solid ${p.color}55`, cursor: "pointer", fontFamily: "inherit" }}>
          🧪 {p.title} · {p.label}{p.due ? ` · ${p.due}` : ""}
        </button>
      ))}
      {specPills.map((p, i) => (
        <button key={`spec${i}`} onClick={onOpenCoordination} title="Open coordination"
          style={{ ...pillBase, background: p.color + "18", color: p.color, border: `1.5px solid ${p.color}55`, cursor: "pointer", fontFamily: "inherit" }}>
          👨‍⚕️ {p.title} · {p.label}
        </button>
      ))}
    </div>
  );
}


export function TreatmentWorkspace({ patientId, aptId, sessionId, clinicId, clinicName, staff, accent = "#0E7C7B", show, onExit }:
  { patientId: string; aptId?: string | null; sessionId?: string | null; clinicId: string; clinicName?: string;
    staff: any; accent?: string; show: (m: string) => void; onExit: () => void }) {

  const A = accent;
  const isSpec = staff?.role === "specialist";  // integrated specialist mode
  const [W, setW] = useState<any>(null);                 // full workspace payload
  const [tab, setTab] = useState("patient");
  const planTabRef = useRef<HTMLDivElement>(null);
  // ─── Cross-tab navigation state (Sprint A1: Tooth ↔ Plan bidirectional flow) ───
  const [pendingTooth, setPendingTooth] = useState<number | null>(null);       // legacy — jumpToTooth sets chart directly
  const [recentlyAddedItemId, setRecentlyAddedItemId] = useState<string | null>(null); // briefly highlight a plan row
  // ─── Chart selection state (shared Tooth ↔ Plan) ───
  const [chartSelectedTeeth, setChartSelectedTeeth] = useState<number[]>([]);
  const [chartMultiSelect, setChartMultiSelect] = useState(false);
  const [chartChild, setChartChild] = useState(false);
  const [chartRegion, setChartRegion] = useState<ChartRegion>("full");
  const [catalog, setCatalog] = useState<any[]>([]);
  const [medCatalog, setMedCatalog] = useState<any[]>([]);
  const [issueCatalog, setIssueCatalog] = useState<any[]>([]);
  const [examCatalog, setExamCatalog] = useState<any[]>([]);
  const [diagCatalog, setDiagCatalog] = useState<any[]>([]);
  const [ticked, setTicked] = useState<any[]>([]);
  const [rxMeds, setRxMeds] = useState<any[]>([]);
  const [advice, setAdvice] = useState("");
  const [complaintText, setComplaintText] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [collectToday, setCollectToday] = useState("");
  const [adjAmt, setAdjAmt] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [closeModal, setCloseModal] = useState<"" | "visit" | "treatment">("");
  const [billingNudgeIds, setBillingNudgeIds] = useState<string[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [labCompleteOrder, setLabCompleteOrder] = useState<any>(null);
  const [showSpecModal, setShowSpecModal] = useState(false);
  // Referral needs an appointment. If workspace was opened without one (e.g. from
  // Patients Database), auto-resolve the patient's most recent active appointment.
  const [specAptId, setSpecAptId] = useState<string | null>(null);
  const openSpecModal = async () => {
    if (aptId) { setSpecAptId(aptId); setShowSpecModal(true); return; }
    try {
      const r = await api.pdbAppointments(patientId, 30);
      const apts = r?.appointments || [];
      const usable = apts.find((a: any) => !["cancelled", "rejected", "no_show"].includes(a.status || a.ws || ""));
      if (usable) { setSpecAptId(usable.id); setShowSpecModal(true); }
      else show("⚠ No appointment found for this patient — book a visit first, then refer");
    } catch (e: any) { show("Error finding appointment: " + e.message); }
  };
  const draftLoaded = useRef(false);
  const draftBaseline = useRef<string>("");
  const [compact, setCompact] = useState(false);
  const [planEditItem, setPlanEditItem] = useState<any>(null);
  const [planPicker, setPlanPicker] = useState<any>(null);
  const [tabDir, setTabDir] = useState(1);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const syncDraftBaseline = useCallback((draft?: any) => {
    draftBaseline.current = JSON.stringify({
      ticked: draft?.ticked || [], rxMeds: draft?.rxMeds || [], advice: draft?.advice || "",
      complaint: draft?.complaint || "", visitNotes: draft?.visitNotes || "",
      collectToday: draft?.collectToday || "", adjAmt: draft?.adjAmt || "", adjReason: draft?.adjReason || "",
    });
  }, []);

  const patchWorkspace = useCallback((patch: (prev: any) => any) => {
    setW((prev: any) => (prev ? patch(prev) : prev));
  }, []);

  const isDraftDirty = useMemo(() => {
    const current = JSON.stringify({
      ticked, rxMeds, advice, complaint: complaintText, visitNotes,
      collectToday, adjAmt, adjReason,
    });
    return current !== draftBaseline.current;
  }, [ticked, rxMeds, advice, complaintText, visitNotes, collectToday, adjAmt, adjReason]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && closeModal) setCloseModal(""); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeModal]);

  const load = useCallback(async () => {
    try {
      const d = await api.wsFull(patientId, clinicId, aptId || undefined);
      setW(d);
      if (!draftLoaded.current) {
        draftLoaded.current = true;
        // Device backup exists only if a previous server save failed — it is
        // strictly newer than whatever the server has, so it wins.
        let localBackup: any = null;
        try { const raw = localStorage.getItem(`ws-offline-draft:${patientId}`); if (raw) localBackup = JSON.parse(raw)?.draft; } catch {}
        const draft = localBackup || d.draft;
        if (draft) {
          setTicked(draft.ticked || []); setRxMeds(draft.rxMeds || []); setAdvice(draft.advice || "");
          setComplaintText(draft.complaint || ""); setVisitNotes(draft.visitNotes || "");
          setCollectToday(draft.collectToday || ""); setAdjAmt(draft.adjAmt || ""); setAdjReason(draft.adjReason || "");
          syncDraftBaseline(localBackup ? d.draft || {} : draft); // local backup = still unsaved → stays dirty
          show(localBackup ? "📴 Unsaved notes from this device restored" : "📝 Draft restored");
        } else if (d.appointment?.chief_complaints?.length) {
          setComplaintText(d.appointment.chief_complaints.map((c: any) => typeof c === "string" ? c : c.text).join(", "));
          syncDraftBaseline({ complaint: d.appointment.chief_complaints.map((c: any) => typeof c === "string" ? c : c.text).join(", ") });
        } else {
          syncDraftBaseline({});
        }
      }
    } catch (e: any) { show("Error: " + e.message); }
  }, [patientId, clinicId, aptId, syncDraftBaseline]); // eslint-disable-line

  const tabOrder = isSpec ? ["patient", "treatment", "plan", "visit"] : ["patient", "treatment", "plan", "visit", "payments"];

  const navigateTab = useCallback(async (next: string, opts?: { itemId?: string; silent?: boolean }) => {
    if (next === tab) return;
    const order = tabOrder;
    const prevIdx = order.indexOf(tab);
    const nextIdx = order.indexOf(next);
    if (prevIdx >= 0 && nextIdx >= 0) setTabDir(nextIdx >= prevIdx ? 1 : -1);
    const planItems = W?.items || [];
    const blockers = getPlanBillingBlockers(planItems);
    if (next === "visit" && blockers.length > 0) {
      if (!opts?.silent) show(planBillingGateMessage(blockers));
      setTab("plan");
      setTabDir(1);
      return;
    }
    if (isDraftDirty) {
      try {
        await api.wsSaveDraft(patientId, { ticked, rxMeds, advice, complaint: complaintText, visitNotes, collectToday, adjAmt, adjReason });
        syncDraftBaseline({ ticked, rxMeds, advice, complaint: complaintText, visitNotes, collectToday, adjAmt, adjReason });
        if (!opts?.silent) show("💾 Visit draft auto-saved");
      } catch (e: any) {
        if (!confirm(`Could not auto-save visit draft (${e.message}). Switch tab anyway?`)) return;
      }
    }
    if (tab === "treatment" || next === "treatment" || tab === "plan" || next === "plan") {
      try { await load(); } catch { /* optimistic state remains */ }
    }
    if (opts?.itemId) {
      setRecentlyAddedItemId(opts.itemId);
      setTimeout(() => setRecentlyAddedItemId(null), 4000);
    }
    setTab(next);
  }, [tab, tabOrder, isDraftDirty, isSpec, ticked, rxMeds, advice, complaintText, visitNotes, collectToday, adjAmt, adjReason, patientId, show, syncDraftBaseline, load, W?.items]);

  const jumpToTooth = useCallback((toothNumber: number) => {
    if (toothNumber >= 51 && toothNumber <= 85) setChartChild(true);
    else if (toothNumber >= 11 && toothNumber <= 48) setChartChild(false);
    setChartSelectedTeeth([toothNumber]);
    navigateTab("treatment", { silent: true });
  }, [navigateTab]);
  const jumpToPlan = useCallback((newItemId?: string) => {
    navigateTab("plan", { itemId: newItemId, silent: true });
    setTimeout(() => planTabRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }, [navigateTab]);

  useEffect(() => { load(); api.wsTreatments().then(setCatalog).catch(() => {});
    api.getMedicines().then((m: any) => setMedCatalog(Array.isArray(m) ? m : m?.medicines || [])).catch(() => {});
    api.wsToothIssues().then(setIssueCatalog).catch(() => {});
    api.wsExamCatalog().then(setExamCatalog).catch(() => {});
    api.wsDiagCatalog().then(setDiagCatalog).catch(() => {}); }, [load]);

  const fin = W?.financial || { total_value: 0, paid: 0, outstanding: 0, today_added: 0, previous_outstanding: 0, ledger: [], lab_due: 0, specialist_due: 0 };
  const items = W?.items || [];
  const activeItems = items.filter((i: any) => i.status !== "completed" && i.status !== "cancelled");
  const billingBlockers = useMemo(() => getPlanBillingBlockers(items), [items]);
  const billingReady = useMemo(() => isPlanBillingReady(items), [items]);
  const blockCloseForBilling = useCallback(() => {
    if (billingBlockers.length === 0) return false;
    setBillingNudgeIds(billingBlockers.map(b => b.id));
    show(planBillingGateMessage(billingBlockers));
    navigateTab("plan", { silent: true });
    window.setTimeout(() => planTabRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    window.setTimeout(() => setBillingNudgeIds([]), 4500);
    return true;
  }, [billingBlockers, show, navigateTab]);

  // ── Draft ─────────────────────────────────────────────────────
  // Offline safety net: notes are mirrored to this device (localStorage) so a
  // server outage or crash mid-visit can never lose the doctor's work.
  const offlineKey = `ws-offline-draft:${patientId}`;
  const [offline, setOffline] = useState(false);
  const draftPayload = () => ({ ticked, rxMeds, advice, complaint: complaintText, visitNotes, collectToday, adjAmt, adjReason });

  const saveDraft = async (silent = false) => {
    setSavingDraft(true);
    const payload = draftPayload();
    try { localStorage.setItem(offlineKey, JSON.stringify({ at: Date.now(), draft: payload })); } catch { /* storage full/blocked */ }
    try {
      await api.wsSaveDraft(patientId, payload);
      syncDraftBaseline(payload);
      try { localStorage.removeItem(offlineKey); } catch {}
      setOffline(false);
      if (!silent) show("💾 Draft saved");
    } catch (e: any) {
      setOffline(true);
      if (!silent) show("📴 Server unreachable — notes kept safe on this device");
    } finally { setSavingDraft(false); }
  };

  // Every 5s while dirty: mirror to this device. Every 30s: push to server.
  const autosaveRef = useRef<() => void>(() => {});
  const mirrorRef = useRef<() => void>(() => {});
  autosaveRef.current = () => { if (isDraftDirty && !savingDraft) saveDraft(true); };
  mirrorRef.current = () => {
    if (!isDraftDirty) return;
    try { localStorage.setItem(offlineKey, JSON.stringify({ at: Date.now(), draft: draftPayload() })); } catch {}
  };
  useEffect(() => {
    const mirror = setInterval(() => mirrorRef.current(), 5000);
    const push = setInterval(() => autosaveRef.current(), 30000);
    return () => { clearInterval(mirror); clearInterval(push); };
  }, []);

  // ── Warn before closing tab / refresh with unsaved chairside work ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDraftDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDraftDirty]);

  // ── Guard the back/exit button. Local mirror means exit is always safe. ──
  const guardedExit = async () => {
    if (isDraftDirty) {
      try { await saveDraft(true); show("💾 Draft saved"); }
      catch { show("📴 Notes kept on this device — they'll restore when you reopen this patient"); }
    }
    onExit();
  };

  // ── Today's work ticking → medicine + advice intelligence ─────
  const toggleStep = async (item: any, step: string) => {
    const key = (t: any) => `${t.item_id}|${t.step}`;
    const entry = { item_id: item.id, treatment: item.treatment_name, teeth: item.teeth || [], step, item_completed: false };
    if (ticked.find(t => key(t) === key(entry))) { setTicked(ticked.filter(t => key(t) !== key(entry))); return; }
    setTicked(prev => [...prev, entry]);
    if (item.procedure_id) {                                   // auto prescription suggestion
      try {
        const sg = await api.getSuggestions([item.procedure_id]);
        if (sg?.length) {
          const meds = (sg[0].suggested_medicines || []).filter((m: any) => !rxMeds.find((r: any) => (r.name || "").toLowerCase() === (m.name || "").toLowerCase()));
          if (meds.length) { setRxMeds(prev => [...prev, ...meds.map((m: any) => ({ name: m.name, strength: m.default_strength || m.strength, dose: m.default_dose || "1 tab", frequency: m.default_frequency || "1-0-1", duration: m.default_duration || "5 days", instructions: m.instructions || "" }))]); }
          const adv = (sg[0].suggested_advice || []).filter((a: string) => !advice.includes(a));
          if (adv.length) setAdvice(prev => prev + (prev ? "\n" : "") + adv.join("\n"));
          if (meds.length || adv.length) show(`💊 ${meds.length} medicine(s) + ${adv.length} advice suggested`);
        }
      } catch {}
    }
  };
  const toggleItemComplete = (item: any) => {
    const has = ticked.find(t => t.item_id === item.id && t.item_completed);
    if (has) setTicked(ticked.map(t => t.item_id === item.id ? { ...t, item_completed: false } : t));
    else {
      const exists = ticked.find(t => t.item_id === item.id);
      if (exists) setTicked(ticked.map(t => t.item_id === item.id ? { ...t, item_completed: true } : t));
      else setTicked([...ticked, { item_id: item.id, treatment: item.treatment_name, teeth: item.teeth || [], step: "Completed", item_completed: true }]);
    }
  };

  // ── Close Visit / Close Treatment ─────────────────────────────
  const [closing, setClosing] = useState(false);
  const [followDate, setFollowDate] = useState(""); const [followTime, setFollowTime] = useState("10:00");
  const [nextInstr, setNextInstr] = useState("");
  const doClose = async (closeTreatment: boolean) => {
    setClosing(true);
    try {
      const r = await api.wsCloseVisit({
        patient_id: patientId, clinic_id: clinicId,
        appointment_id: aptId || null, session_id: sessionId || null,
        plan_id: W?.plan?.id || null,
        todays_work: ticked, complaint: complaintText || null,
        medicines: rxMeds, advice: advice || null, treatment_notes: visitNotes || null,
        amount_to_collect: parseFloat(collectToday) || 0,
        adjustment_amount: parseFloat(adjAmt) || 0, adjustment_reason: adjReason || null,
        followup_date: closeTreatment ? null : (followDate || null), followup_time: followTime,
        next_visit_instructions: nextInstr || null,
        chairside_notes: W?.patient?.chairside_notes ?? null,
        close_treatment: closeTreatment,
      });
      show(closeTreatment
        ? `📦 Treatment closed & archived — ${fmt(r.amount_to_collect)} sent to nurse`
        : r.amount_to_collect > 0
          ? `✅ Visit closed — ${fmt(r.amount_to_collect)} sent to nurse${followDate ? ` · follow-up ${dmy(followDate)}` : ""}`
          : `✅ Visit closed — zero patient payment${followDate ? ` · follow-up ${dmy(followDate)}` : ""}`);
      onExit();
    } catch (e: any) { show("Error: " + e.message); } finally { setClosing(false); }
  };

  const doSpecialistDone = async () => {
    if (!aptId) {
      show("No appointment linked to this specialist case");
      return;
    }
    setClosing(true);
    try {
      await saveDraft(true);
      const workSummary = ticked
        .map((t: any) => [t.treatment, t.step, t.item_completed ? "completed" : ""].filter(Boolean).join(" — "))
        .filter(Boolean)
        .join("\n");
      const notes = [
        visitNotes && `Notes: ${visitNotes}`,
        workSummary && `Work: ${workSummary}`,
        advice && `Advice: ${advice}`,
        rxMeds.length ? `Medicines: ${rxMeds.map((m: any) => [m.name, m.dose, m.frequency, m.duration].filter(Boolean).join(" ")).join("; ")}` : "",
      ].filter(Boolean).join("\n\n") || "Work completed by specialist";

      await api.specCloseSession(aptId, { notes });
      show("Specialist job completed — awaiting doctor verification");
      onExit();
    } catch (e: any) {
      show("Error: " + e.message);
    } finally {
      setClosing(false);
    }
  };

  const planCount = items.filter((i: any) => i.status !== "cancelled").length;
  const billingPendingCount = billingBlockers.length;
  const TABS = [
    ["patient", "👤 Patient", null],
    ["treatment", "🦷 Treatment", null],
    ["plan", "🧩 Treatment Plan", billingPendingCount > 0 ? billingPendingCount : (planCount || null)],
    ["visit", "✅ Finish Visit", null],
    ...(!isSpec ? [["payments", "💳 Payments", null] as const] : []),
  ];

  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[tab];
    const bar = tabBarRef.current;
    if (!btn || !bar) return;
    setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [tab, TABS.length, W]);

  useEffect(() => {
    const onResize = () => {
      const btn = tabBtnRefs.current[tab];
      const bar = tabBarRef.current;
      if (!btn || !bar) return;
      setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [tab, TABS.length, W]);

  if (!W) return (
    <div style={{ padding: 60, textAlign: "center" as const, color: MUTE, fontWeight: 700 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🦷</div>
      Loading treatment workspace…<br />
      <span style={{ fontSize: 12, opacity: 0.7 }}>Pulling plan, history, and tooth data</span>
    </div>
  );
  const P = W.patient;
  const labPendingCount = (W?.lab_orders || []).filter((o: any) => ["pending", "sent", "received"].includes(o.status)).length;
  const specPendingCount = (W?.specialist_cases || []).filter((s: any) => s.session_status !== "verified").length;

  return (
    <div className="animate-in" style={{ ["--tw-accent" as string]: A }}>
      {/* ══ HEADER — scrolls with page (more room for tab content) ══ */}
      <div style={{ background: "#fff", borderRadius: 18, padding: "14px 18px", boxShadow: SHADOW_LG, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" as const }}>
          {offline && (
            <span style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 999, padding: "6px 12px", fontSize: 11.5, fontWeight: 800 }}>
              📴 Offline — notes safe on this device
            </span>
          )}
          <button onClick={guardedExit} style={{ display: "flex", alignItems: "center", gap: 6, border: `1.5px solid ${LINE}`, background: "#fff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 800, fontSize: 13, fontFamily: "inherit" }}>
            <ArrowLeft size={16} /> Queue
          </button>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" as const }}>
              <b style={{ fontSize: 19, color: INK }}>{P.name}</b>
              <span style={{ fontSize: 13, color: MUTE, fontWeight: 600 }}>{P.age ? `${P.age}y` : ""}{P.gender ? ` · ${P.gender}` : ""}</span>
              <TypeBadge type={P.patient_type} />
              {/* Medical alert chips moved to the sticky CareStrip below (always visible on every tab) */}
            </div>
            <div style={{ fontSize: 12, color: MUTE, marginTop: 3 }}>
              {complaintText ? <span style={{ color: "#9A3412", fontWeight: 700 }}>🗣 {complaintText}</span> : "No complaint recorded"}
              {" · "}Last visit: <b>{dmy(W.last_visit?.date)}</b>
            </div>
          </div>
          {!isSpec && (
          <div style={{ display: "flex", gap: 14, alignItems: "center", background: SOFT, borderRadius: 14, padding: "8px 16px" }}>
            {[["Total Value", fin.total_value, INK], ["Paid", fin.paid, "#059669"], ["Outstanding", fin.outstanding, fin.outstanding > 0 ? "#DC2626" : "#059669"]].map(([l, v, c]: any) => (
              <div key={l} style={{ textAlign: "center" as const }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: MUTE, letterSpacing: .5 }}>{String(l).toUpperCase()}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: c, fontVariantNumeric: "tabular-nums" }}>{fmt(v)}</div>
              </div>
            ))}
          </div>
          )}
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <button onClick={() => setShowLabModal(true)} style={{ display: "flex", alignItems: "center", gap: 5, border: `2px solid #F59E0B`, background: "#FFFBEB", color: "#92400E", borderRadius: 13, padding: "10px 14px", cursor: "pointer", fontWeight: 800, fontSize: 12.5, fontFamily: "inherit" }} title="Create lab order for this patient">
              🧪 Send to Lab
            </button>
            {!isSpec && (
            <button onClick={openSpecModal} style={{ display: "flex", alignItems: "center", gap: 5, border: `2px solid #8B5CF6`, background: "#F5F3FF", color: "#5B21B6", borderRadius: 13, padding: "10px 14px", cursor: "pointer", fontWeight: 800, fontSize: 12.5, fontFamily: "inherit" }} title="Refer patient to a specialist">
              👨‍⚕️ Refer to Specialist
            </button>
            )}
            <button onClick={() => setCompact(!compact)} style={{ border: `1.5px solid ${LINE}`, background: compact ? A : "#fff", color: compact ? "#fff" : MUTE, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }} title="Toggle compact chair-side mode">
              {compact ? "Normal" : "Compact"}
            </button>
            <button onClick={() => saveDraft()} disabled={savingDraft} style={{ display: "flex", alignItems: "center", gap: 6, border: `2px solid ${A}`, background: "#fff", color: A, borderRadius: 13, padding: "11px 16px", cursor: "pointer", fontWeight: 800, fontSize: 13.5, fontFamily: "inherit" }}>
              <Save size={16} /> {savingDraft ? "Saving…" : "Save Draft"}
            </button>
            <button onClick={() => {
              if (isSpec) { doSpecialistDone(); return; }
              if (blockCloseForBilling()) return;
              setFollowDate(""); setCloseModal("visit");
            }} disabled={closing} style={{ display: "flex", alignItems: "center", gap: 6, background: `linear-gradient(135deg,${A},${A}DD)`, color: "#fff", border: "none", borderRadius: 13, padding: "11px 18px", cursor: closing ? "wait" : "pointer", fontWeight: 800, fontSize: 13.5, fontFamily: "inherit", boxShadow: `0 6px 18px ${A}55` }}>
              <CheckCircle size={16} /> {isSpec ? (closing ? "Completing…" : "Mark My Job Completed") : "Close Visit"}
            </button>
            {!isSpec && (
            <button onClick={() => {
              if (blockCloseForBilling()) return;
              setCollectToday(String(fin.outstanding || 0)); setCloseModal("treatment");
            }} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#DC2626,#EF4444)", color: "#fff", border: "none", borderRadius: 13, padding: "11px 18px", cursor: "pointer", fontWeight: 800, fontSize: 13.5, fontFamily: "inherit", boxShadow: "0 6px 18px #DC262655" }}>
              <DollarSign size={16} /> Close Treatment
            </button>
            )}
          </div>
        </div>
        <div className="tw-tabs" ref={tabBarRef}>
          {tabIndicator.width > 0 && (
            <div className="tw-tab-indicator" style={{ left: tabIndicator.left, width: tabIndicator.width }} />
          )}
          {TABS.map(([id, label, count]) => {
            const coordBadge = id === "patient" && !isSpec && (labPendingCount + specPendingCount) > 0;
            const showCount = typeof count === "number" && count > 0;
            return (
              <button
                key={id}
                ref={el => { tabBtnRefs.current[id] = el; }}
                onClick={() => navigateTab(id as string)}
                className={`tw-tab${tab === id ? " tw-tab-active" : ""}`}
              >
                {label}
                {showCount && (
                  <span className="tw-tab-badge" style={{ background: tab === id ? "#fff" : A, color: tab === id ? A : "#fff" }}>
                    {count}
                  </span>
                )}
                {coordBadge && (
                  <span className="tw-tab-badge" style={{ background: tab === id ? "#fff" : "#F59E0B", color: tab === id ? A : "#fff" }}>
                    {labPendingCount + specPendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* F1+F2 — always-visible safety + care-progress strip (lab/specialist actions live in Overview) */}
      <CareStrip P={P} W={W} onOpenCoordination={() => navigateTab("patient")} />

      {isDraftDirty && (
        <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 12, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#1E40AF" }}>
          <span>Visit notes / Rx draft has unsaved changes — auto-saves when you switch tabs</span>
          <button onClick={() => saveDraft()} disabled={savingDraft} style={{ border: "none", background: A, color: "#fff", borderRadius: 8, padding: "6px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>{savingDraft ? "Saving…" : "Save now"}</button>
        </div>
      )}

      <TabPanel tab={tab} id="patient" dir={tabDir}>
        <OverviewTab W={W} A={A} show={show} reload={load} aptId={aptId}
          complaintText={complaintText} setComplaintText={setComplaintText} setTab={navigateTab} />
        {!isSpec && ((W?.lab_orders || []).length > 0 || (W?.specialist_cases || []).length > 0) && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: INK }}>Lab & Specialist</div>
              {(labPendingCount + specPendingCount) > 0 && (
                <span style={{ background: "#FEF3C7", color: "#92400E", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>
                  {labPendingCount + specPendingCount} waiting
                </span>
              )}
            </div>
            <LabGuardBanner patientId={W.patient.id} />
            <DoctorCoordinationTab W={W} show={show} reload={load} staff={staff}
              onCompleteLabOrder={(order: any) => setLabCompleteOrder(order)} />
          </div>
        )}
      </TabPanel>

      <TabPanel tab={tab} id="treatment" dir={tabDir}>
        <ClinicalToothTab W={W} A={A} show={show} reload={load} patientId={patientId} clinicId={clinicId} aptId={aptId} isSpec={isSpec}
          issueCatalog={issueCatalog} setIssueCatalog={setIssueCatalog}
          examCatalog={examCatalog} setExamCatalog={setExamCatalog}
          diagCatalog={diagCatalog} setDiagCatalog={setDiagCatalog}
          catalog={catalog} setCatalog={setCatalog}
          chartSelectedTeeth={chartSelectedTeeth} setChartSelectedTeeth={setChartSelectedTeeth}
          chartMultiSelect={chartMultiSelect} setChartMultiSelect={setChartMultiSelect}
          chartChild={chartChild} setChartChild={setChartChild}
          chartRegion={chartRegion} setChartRegion={setChartRegion}
          onEditPlanItem={setPlanEditItem}
          onWorkspacePatch={patchWorkspace}
          onJumpToPlan={jumpToPlan} />
      </TabPanel>

      <TabPanel tab={tab} id="plan" dir={tabDir}>
        <div ref={planTabRef}>
          <TreatmentPlanTab
            W={W}
            accent={A}
            items={items}
            selectedTeeth={chartSelectedTeeth}
            highlightId={recentlyAddedItemId}
            onSelectTooth={(n) => jumpToTooth(n)}
            billingBlockers={billingBlockers}
            billingReady={billingReady}
            billingNudgeIds={billingNudgeIds}
            hidePrices={isSpec}
            onQuickPrice={async (item: any, rate: number, discount: number, notes?: string, opts?: { price_confirmed?: boolean }) => {
              try {
                const pays = Math.max(0, rate - discount);
                if (isSpec) {
                  // Specialist can only update work notes — money is the owner's domain
                  await api.wsEditPlanItem(item.id, { notes: notes ?? item.notes });
                  show(`✓ Notes saved — ${item.treatment_name}`);
                } else {
                  await api.wsEditPlanItem(item.id, {
                    doctor_rate: rate, suggested_rate: rate, discount,
                    notes: notes ?? item.notes,
                    price_confirmed: opts?.price_confirmed && pays > 0,
                  });
                  show(opts?.price_confirmed ? `✓ Confirmed ${item.treatment_name} — ${fmt(pays)}` : `✓ ${item.treatment_name} — ${fmt(pays)}`);
                }
                await load();
              } catch (e: any) { show(e.message); }
            }}
            onStatusCycle={async (item: any) => {
              const next = item.status === "advised" ? "in_progress" : item.status === "in_progress" ? "completed" : "advised";
              try { await api.wsEditPlanItem(item.id, { status: next }); show(`✓ ${item.treatment_name} → ${next}`); await load(); }
              catch (e: any) { show(e.message); }
            }}
            onDelete={async (item: any) => {
              if (!confirm(`Remove ${item.treatment_name}?`)) return;
              try { await api.wsDeletePlanItem(item.id); show("✓ Removed"); await load(); }
              catch (e: any) { show(e.message); }
            }}
            onEdit={(item: any) => setPlanEditItem(item)}
            onJumpToTreatment={() => navigateTab("treatment")}
            onAddForTooth={(n) => jumpToTooth(n)}
            catalog={catalog}
            onAddPlanItem={async ({ treatment, teeth, rate, discount, procedureId }) => {
              const examSummary = (W?.tooth_examinations || [])
                .filter((e: any) => teeth.includes(e.tooth ?? e.tooth_number))
                .map((e: any) => e.finding).filter(Boolean).join(", ");
              const diagSummary = (W?.tooth_diagnoses || [])
                .filter((d: any) => teeth.includes(d.tooth ?? d.tooth_number))
                .map((d: any) => d.diagnosis).filter(Boolean).join(", ");
              try {
                const pays = Math.max(0, rate - discount);
                const result = await api.wsAddPlanItem(patientId, {
                  treatment_name: treatment,
                  procedure_id: procedureId || null,
                  teeth,
                  suggested_rate: rate,
                  doctor_rate: rate,
                  discount,
                  clinic_id: clinicId,
                  examination_summary: examSummary || undefined,
                  diagnosis: diagSummary || undefined,
                  price_confirmed: pays > 0,
                });
                const itemId = result.item_id || result.id;
                if (itemId) setRecentlyAddedItemId(itemId);
                show(`✓ ${treatment} — ${fmt(Math.max(0, rate - discount))}`);
                await load();
              } catch (e: any) { show(e.message); }
            }}
          />
        </div>
      </TabPanel>

      <TabPanel tab={tab} id="visit" dir={tabDir}>
        {!billingReady && billingBlockers.length > 0 && (
          <div style={{
            background: "#FEF3C7", border: "2px solid #FCD34D", borderRadius: 14, padding: "12px 16px",
            marginBottom: 14, fontSize: 13, fontWeight: 700, color: "#92400E",
          }}>
            Confirm all treatment rates on <button type="button" onClick={() => navigateTab("plan")} style={{ border: "none", background: "transparent", color: A, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>Treatment Plan</button> before closing this visit.
          </div>
        )}
        <RxTab W={W} A={A} staff={staff} show={show} clinicName={clinicName || "Siya Dental Care"}
          clinicId={clinicId} aptId={aptId} reload={load}
          activeItems={activeItems} ticked={ticked} toggleStep={toggleStep} toggleItemComplete={toggleItemComplete}
          rxMeds={rxMeds} setRxMeds={setRxMeds} advice={advice} setAdvice={setAdvice}
          medCatalog={medCatalog} complaintText={complaintText} setComplaintText={setComplaintText}
          visitNotes={visitNotes} setVisitNotes={setVisitNotes} />
        {!isSpec && (
          <div style={{ marginTop: 16, fontSize: 13, color: MUTE, fontWeight: 600 }}>
            Patient, lab &amp; specialist payments are on the <button type="button" onClick={() => navigateTab("payments")} style={{ border: "none", background: "transparent", color: A, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>Payments</button> tab (next).
          </div>
        )}
      </TabPanel>

      <TabPanel tab={tab} id="payments" dir={tabDir}>
        {!isSpec && (
          <PaymentsTab
            W={W}
            fin={fin}
            accent={A}
            collectToday={collectToday}
            setCollectToday={setCollectToday}
            adjAmt={adjAmt}
            setAdjAmt={setAdjAmt}
            adjReason={adjReason}
            setAdjReason={setAdjReason}
            billingReady={billingReady}
            billingBlockers={billingBlockers}
            onGoToPlan={() => navigateTab("plan")}
          />
        )}
      </TabPanel>

      {/* Treatment entry/edit modal lifted so it can be opened from Tooth tab (for "edit from dropdown / added list") without leaving the view first. Modal is overlay so user stays in context. */}
      {(planPicker || planEditItem) && <TreatmentEntryModal A={A} show={show} treatment={planPicker} item={planEditItem} catalog={catalog}
        onClose={() => { setPlanPicker(null); setPlanEditItem(null); }}
        onSaved={() => { setPlanPicker(null); setPlanEditItem(null); load(); }}
        patientId={patientId} clinicId={clinicId}
        allowedTeeth={chartSelectedTeeth?.length ? chartSelectedTeeth : undefined}
        childModeDefault={chartChild} />}

      {/* ══ CLOSE MODAL — polished + Close Treatment warning ═══ */}
      {closeModal && (() => {
        const isTreatment = closeModal === "treatment";
        const finalCollect = Math.max((parseFloat(collectToday) || 0) - (parseFloat(adjAmt) || 0), 0);
        return (
          <div style={mBg} onClick={() => setCloseModal("")}>
            <div className="animate-slide" style={{ ...mBox, width: 540 }} onClick={e => e.stopPropagation()}>
              {isTreatment && (
                <div style={{ background: "linear-gradient(135deg,#FEF2F2,#FEE2E2)", border: "2px solid #FCA5A5", borderRadius: 16, padding: "14px 18px", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 26 }}>⚠️</span>
                    <b style={{ fontSize: 17, color: "#991B1B" }}>Close Entire Treatment?</b>
                  </div>
                  <div style={{ fontSize: 13.5, color: "#7F1D1D", lineHeight: 1.5 }}>
                    This will <b>archive the case permanently</b> and collect the full outstanding balance.
                    The plan will move to history — no further visits or follow-ups.
                  </div>
                  {fin.outstanding > 0 && (
                    <div style={{ marginTop: 10, background: "#fff", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#7F1D1D" }}>Outstanding to collect:</span>
                      <b style={{ fontSize: 22, color: "#DC2626" }}>{fmt(fin.outstanding)}</b>
                    </div>
                  )}
                </div>
              )}
              <h3 style={{ margin: "0 0 8px", fontSize: 22, color: INK, fontWeight: 900 }}>{isTreatment ? "📦 Close Treatment" : "✅ Close Visit"} — {P.name}</h3>
              <p style={{ margin: "0 0 16px", fontSize: 13.5, color: MUTE, lineHeight: 1.5 }}>
                {isTreatment
                  ? "Final visit + full balance collection + case archived with complete history."
                  : "Saves today's work + prescription, sends amount to nurse, plan stays active."}
              </p>
              <div style={{ background: SOFT, borderRadius: 14, padding: "12px 16px", fontSize: 13.5, marginBottom: 14, display: "flex", justifyContent: "space-around", gap: 8 }}>
                <div style={{ textAlign: "center" as const }}><div style={{ fontSize: 22, fontWeight: 900, color: A }}>{ticked.length}</div><div style={{ fontSize: 11, fontWeight: 700, color: MUTE }}>WORK ITEMS</div></div>
                <div style={{ textAlign: "center" as const }}><div style={{ fontSize: 22, fontWeight: 900, color: "#6366F1" }}>{rxMeds.length}</div><div style={{ fontSize: 11, fontWeight: 700, color: MUTE }}>MEDICINES</div></div>
                {!isSpec && <div style={{ textAlign: "center" as const }}><div style={{ fontSize: 22, fontWeight: 900, color: fin.outstanding > 0 ? "#DC2626" : "#059669" }}>{fmt(fin.outstanding)}</div><div style={{ fontSize: 11, fontWeight: 700, color: MUTE }}>OUTSTANDING</div></div>}
              </div>
              {!isSpec && (<>
              <label style={lbl}>💰 Amount To Collect Today {isTreatment && fin.outstanding > 0 && <span style={{ color: "#DC2626", textTransform: "none" as const, fontSize: 11 }}>· auto-filled with full outstanding</span>}</label>
              <input type="number" value={collectToday} onChange={e => setCollectToday(e.target.value)} placeholder="0"
                style={{ ...inp, fontSize: 28, fontWeight: 900, textAlign: "center" as const, borderColor: isTreatment ? "#DC2626" : A, borderWidth: 2.5, padding: "16px 18px" }} autoFocus />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Adjustment ₹ (optional)</label>
                  <input type="number" value={adjAmt} onChange={e => setAdjAmt(e.target.value)} placeholder="0" style={inp} /></div>
                <div><label style={lbl}>Reason</label>
                  <select value={adjReason} onChange={e => setAdjReason(e.target.value)} style={inp}>
                    <option value="">—</option>{ADJ_REASONS.map(r => <option key={r}>{r}</option>)}
                  </select></div>
              </div>
              </>)}
              {!isTreatment && <>
                <label style={lbl}>📅 Follow-up Date</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" as const }}>
                  {[["Tomorrow", 1], ["3 days", 3], ["7 days", 7], ["14 days", 14], ["1 month", 30]].map(([l, d]: any) => (
                    <button key={l} onClick={() => setFollowDate(new Date(Date.now() + d * 86400000).toISOString().split("T")[0])} style={chipGhost(A)}>{l}</button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                  <input type="date" value={followDate} onChange={e => setFollowDate(e.target.value)} style={inp} />
                  <input type="time" value={followTime} onChange={e => setFollowTime(e.target.value)} style={inp} />
                </div>
                <label style={lbl}>Next Visit Instructions</label>
                <input value={nextInstr} onChange={e => setNextInstr(e.target.value)} placeholder="e.g. Obturation next sitting — bring X-ray" style={inp} />
              </>}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={() => setCloseModal("")} style={{ flex: 1, padding: 16, border: `2px solid ${LINE}`, borderRadius: 14, cursor: "pointer", fontWeight: 800, fontSize: 15, fontFamily: "inherit", background: "#fff", color: "#475569" }}>Cancel</button>
                <button onClick={() => doClose(isTreatment)} disabled={closing}
                  style={{ flex: 2, padding: 16, border: "none", borderRadius: 14, cursor: closing ? "wait" : "pointer", fontWeight: 800, fontSize: 15, fontFamily: "inherit", color: "#fff",
                    background: isTreatment ? "linear-gradient(135deg,#DC2626,#EF4444)" : `linear-gradient(135deg,${A},${A}DD)`,
                    boxShadow: isTreatment ? "0 8px 24px #DC262655" : `0 8px 24px ${A}55` }}>
                  {closing ? "Closing…" : isTreatment ? `📦 Archive & Collect ${fmt(finalCollect)}` : isSpec ? "✅ Close Visit" : `✅ Close Visit — Collect ${fmt(finalCollect)}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {(showLabModal || labCompleteOrder) && W?.patient && (
        <SendToLabModal
          patientId={W.patient.id}
          patientName={W.patient.name}
          clinicId={clinicId}
          appointmentId={aptId || undefined}
          planItems={items}
          staffRole={labCompleteOrder ? "nurse" : staff?.role}
          existingOrder={labCompleteOrder}
          onClose={() => { setShowLabModal(false); setLabCompleteOrder(null); }}
          onSaved={() => {
            show(labCompleteOrder ? "Lab order completed & sent ✅" : staff?.role === "doctor" ? "Lab work assigned — nurse will complete order ✅" : "Lab order created ✅");
            setShowLabModal(false); setLabCompleteOrder(null); load();
          }}
        />
      )}
      {showSpecModal && W?.patient && specAptId && (
        <SendToSpecialistModal
          patientId={W.patient.id}
          patientName={W.patient.name}
          clinicId={clinicId}
          appointmentId={specAptId}
          onClose={() => { setShowSpecModal(false); setSpecAptId(null); }}
          onSaved={() => { show("Specialist referred ✅"); load(); }}
        />
      )}
    </div>
  );
}

// ════════════════════ TAB 1 · OVERVIEW ═══════════════════════
function OverviewTab({ W, A, show, reload, aptId, complaintText, setComplaintText, setTab }: any) {
  const P = W.patient;
  const [conds, setConds] = useState<string[]>(P.existing_illnesses || []);
  const [complaints, setComplaints] = useState<string[]>(complaintText ? complaintText.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
  const [customCond, setCustomCond] = useState(""); const [customComp, setCustomComp] = useState("");
  const [dbConds, setDbConds] = useState<any[]>([]); const [dbComps, setDbComps] = useState<any[]>([]);
  const [notes, setNotes] = useState(P.chairside_notes || "");
  useEffect(() => { api.hubConditions().then(setDbConds).catch(() => {}); api.hubComplaints().then(setDbComps).catch(() => {}); }, []);

  const saveConds = async (next: string[]) => {
    setConds(next);
    try { await api.hubUpdateIllnesses(P.id, next); }
    catch (e: any) { show("Error saving illnesses: " + e.message); }
  };
  const saveComps = async (next: string[]) => {
    setComplaints(next); setComplaintText(next.join(", "));
    if (aptId) {
      try { await api.wsAptComplaints(aptId, next); }
      catch (e: any) { show("Error saving complaints: " + e.message); }
    }
  };
  const condOptions = useMemo(() => {
    const names = new Set([...COND_CHIPS, ...dbConds.map((c: any) => c.name)]);
    return Array.from(names).filter(n => !conds.includes(n));
  }, [dbConds, conds]);
  const compOptions = useMemo(() => {
    const names = new Set([...COMPLAINT_CHIPS, ...dbComps.map((c: any) => c.name)]);
    return Array.from(names).filter(n => !complaints.includes(n));
  }, [dbComps, complaints]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {/* Patient info + previous visit */}
      <div style={card}>
        <SectionTitle>👤 Patient Information</SectionTitle>
        <InfoRow l="Name" v={P.name} /><InfoRow l="Age / Gender" v={`${P.age || "—"} / ${P.gender || "—"}`} />
        <InfoRow l="Mobile" v={P.phone} /><InfoRow l="Total Visits" v={String(P.total_visits)} />

        <div style={{ marginTop: 16 }}>
          <SectionTitle>🕘 Previous Visit Summary</SectionTitle>
          {W.last_visit ? <>
            <InfoRow l="Last Visit" v={dmy(W.last_visit.date)} />
            <InfoRow l="Last Treatment" v={(W.last_visit.work || []).map((w: any) => w.step || w.procedure_name).filter(Boolean).slice(0, 4).join(", ") || W.last_visit.notes || "—"} />
            <InfoRow l="Last Rx" v={W.last_visit.rx_summary || "—"} />
            <InfoRow l="Amount Collected" v={fmt(W.last_visit.collected)} />
          </> : <div style={{ fontSize: 13, color: MUTE }}>First visit — no history yet.</div>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
        {/* Medical conditions */}
        <div style={card}>
          <SectionTitle>⚠ Medical Conditions <span style={{ fontWeight: 500, fontSize: 11, color: MUTE }}>(saved instantly)</span></SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 7 }}>
            {conds.map(c => <ChipX key={c} text={c} bg="#FEE2E2" color="#991B1B" onX={() => saveConds(conds.filter(x => x !== c))} />)}
            {conds.length === 0 && <span style={{ fontSize: 12.5, color: MUTE }}>None recorded</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 7 }}>
            {condOptions.slice(0, 9).map(c => <button key={c} onClick={() => saveConds([...conds, c])} style={chipGhost("#EF4444")}>+ {c}</button>)}
          </div>
          <input value={customCond} onChange={e => setCustomCond(e.target.value)} placeholder="Custom condition + Enter (auto-saved for future)"
            onKeyDown={e => { if (e.key === "Enter" && customCond.trim()) { const v = customCond.trim(); api.hubAddCondition(v).then(() => api.hubConditions().then(setDbConds)).catch(() => {}); saveConds([...conds, v]); setCustomCond(""); } }} style={inp} />
        </div>
        {/* Chief complaints */}
        <div style={card}>
          <SectionTitle>🗣 Chief Complaints</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 7 }}>
            {complaints.map(c => <ChipX key={c} text={c} bg="#FFEDD5" color="#9A3412" onX={() => saveComps(complaints.filter(x => x !== c))} />)}
            {complaints.length === 0 && <span style={{ fontSize: 12.5, color: MUTE }}>None recorded</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 7 }}>
            {compOptions.slice(0, 9).map(c => <button key={c} onClick={() => saveComps([...complaints, c])} style={chipGhost("#F97316")}>+ {c}</button>)}
          </div>
          <input value={customComp} onChange={e => setCustomComp(e.target.value)} placeholder="Custom complaint + Enter (auto-saved for future)"
            onKeyDown={e => { if (e.key === "Enter" && customComp.trim()) { const v = customComp.trim(); api.hubAddComplaint(v).then(() => api.hubComplaints().then(setDbComps)).catch(() => {}); saveComps([...complaints, v]); setCustomComp(""); } }} style={inp} />
        </div>
        {/* Chair-side notes */}
        <div style={card}>
          <SectionTitle>🪑 Chair-side Notes <span style={{ fontWeight: 500, fontSize: 11, color: MUTE }}>(visible in future visits)</span></SectionTitle>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            onBlur={() => api.wsChairsideNotes(P.id, notes).then(() => show("✓ Notes saved")).catch((e: any) => show("Error saving notes: " + e.message))}
            placeholder={"e.g. Patient travelling next month\nCrown shade A2 selected\nPrefers evening appointments"}
            style={{ ...inp, minHeight: 86, resize: "vertical" as const }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════ TAB 2 · TREATMENT PLAN (MASTER) ═════════════
function PlanTab({ W, A, show, reload, catalog, setCatalog, patientId, clinicId, recentlyAddedItemId, onJumpToTooth, chartSelectedTeeth, chartChild, editItem: propEditItem, setEditItem: propSetEditItem, picker: propPicker, setPicker: propSetPicker, simple }: any) {
  const items = (W.items || []).filter((i: any) => i.status !== "cancelled");
  // Use lifted props if provided (for cross-tab edit from Tooth view), else local fallback for standalone use
  const [localPicker, setLocalPicker] = useState<any>(null);
  const [localEditItem, setLocalEditItem] = useState<any>(null);
  const picker = propPicker !== undefined ? propPicker : localPicker;
  const setPicker = propSetPicker || setLocalPicker;
  const editItem = propEditItem !== undefined ? propEditItem : localEditItem;
  const setEditItem = propSetEditItem || setLocalEditItem;

  const [customName, setCustomName] = useState(""); const [customRate, setCustomRate] = useState(""); const [customTooth, setCustomTooth] = useState(true);
  const [showRevs, setShowRevs] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);  // hidden by default — spec
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateApplying, setTemplateApplying] = useState<any>(null);  // template being teeth-mapped
  const [planSearch, setPlanSearch] = useState("");
  const frequentProcedures = useMemo(() => {
    const toothFirst = catalog.filter((c: any) => c.is_tooth_based);
    const general = catalog.filter((c: any) => !c.is_tooth_based);
    return [...toothFirst, ...general].slice(0, 8);
  }, [catalog]);
  const filteredPlanCatalog = useMemo(() => {
    const q = planSearch.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter((c: any) => c.name.toLowerCase().includes(q)).slice(0, 16);
  }, [catalog, planSearch]);
  const normalizeTemplate = (tpl: any) => {
    let procs = tpl.procedures;
    if (typeof procs === "string") { try { procs = JSON.parse(procs); } catch { procs = []; } }
    procs = Array.isArray(procs) ? procs : [];
    const rateEach = tpl.estimated_cost ? Number(tpl.estimated_cost) / Math.max(procs.length, 1) : 0;
    const needsTeeth = ["endodontic", "restorative", "prosthetic", "surgical"].includes((tpl.category || "").toLowerCase());
    return {
      ...tpl,
      name: tpl.template_name || tpl.name,
      items: procs.length ? procs.map((p: any) => ({
        treatment_name: p.procedure_name || p.name || "Procedure",
        teeth_placeholder: needsTeeth,
        suggested_rate: rateEach,
        doctor_rate: rateEach,
        notes: p.notes,
      })) : (tpl.items || []),
    };
  };
  useEffect(() => {
    if (!clinicId || templates.length > 0) return;
    api.treatmentTemplatesList(clinicId).then((res: any) => {
      const list = (res?.templates || res || []).map(normalizeTemplate);
      setTemplates(list);
    }).catch(() => api.adminListTemplates().then((rows: any) => setTemplates((Array.isArray(rows) ? rows : []).map(normalizeTemplate))).catch(() => {}));
  }, [clinicId]); // eslint-disable-line

  const applyTemplate = async (tpl: any, mappedTeeth: { [k: string]: number[] }) => {
    let added = 0;
    for (const [idx, item] of (tpl.items || []).entries()) {
      const teeth = item.teeth_placeholder ? (mappedTeeth[String(idx)] || []) : (item.teeth || []);
      if (item.teeth_placeholder && teeth.length === 0) continue;
      const procMatch = catalog.find((c: any) => c.name.toLowerCase() === (item.treatment_name || "").toLowerCase());
      try {
        await api.wsAddPlanItem(patientId, {
          treatment_name: item.treatment_name,
          procedure_id: procMatch?.id || null,
          teeth, area_label: item.area_label || null,
          suggested_rate: item.suggested_rate || procMatch?.rate || 0,
          doctor_rate: item.doctor_rate || item.suggested_rate || procMatch?.rate || 0,
          discount: item.discount || 0,
          clinic_id: clinicId,
        });
        added++;
      } catch (e: any) { show("Template error: " + e.message); }
    }
    if (added > 0) {
      await api.adminUseTemplate(tpl.id).catch(() => {});
      show(`✓ Template "${tpl.name}" — ${added} item(s) added`);
      setTemplateApplying(null); reload();
    }
  };

  const addCustom = async () => {
    if (!customName.trim()) return;
    try {
      const r = await api.wsAddTreatment({ name: customName.trim(), default_cost: parseFloat(customRate) || 0, is_tooth_based: customTooth });
      const fresh = await api.wsTreatments(); setCatalog(fresh);
      const t = fresh.find((x: any) => x.id === r.id);
      show(`✓ "${customName}" saved — will appear in future suggestions`);
      setCustomName(""); setCustomRate("");
      if (t) setPicker(t);
    } catch (e: any) { show("Error: " + e.message); }
  };

  return (
    <div>
      {!simple && <>
      {/* Templates — hidden behind a discover button (spec: "if required, use") */}
      <div style={{ marginBottom: 14, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setShowTemplates(!showTemplates)}
          style={{ background: showTemplates ? A : "#fff", color: showTemplates ? "#fff" : A,
            border: `2px solid ${A}`, borderRadius: 12, padding: "10px 18px", cursor: "pointer",
            fontWeight: 800, fontSize: 13.5, fontFamily: "inherit", transition: "all .12s",
            boxShadow: showTemplates ? `0 4px 14px ${A}55` : "none" }}>
          📋 {showTemplates ? "Hide" : "Use"} Treatment Templates {templates.length > 0 && <span style={{ background: showTemplates ? "#fff" : A, color: showTemplates ? A : "#fff", borderRadius: 999, padding: "0 8px", marginLeft: 6, fontSize: 11 }}>{templates.length}</span>}
        </button>
      </div>
      {showTemplates && <div style={{ ...card, marginBottom: 14, background: "linear-gradient(135deg,#F0FDFA,#fff)" }}>
        <SectionTitle>📋 Treatment Templates <span style={{ fontWeight: 500, fontSize: 11.5, color: MUTE }}>— common combos · one click apply</span></SectionTitle>
        {templates.length === 0 && <div style={{ fontSize: 13, color: MUTE, marginTop: 6 }}>No templates yet. Build a plan first, then save it as a template.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10, marginTop: 8 }}>
          {templates.map((tpl: any) => (
            <button key={tpl.id} onClick={() => setTemplateApplying(tpl)}
              style={{ textAlign: "left" as const, border: `2px solid ${LINE}`, background: "#fff", borderRadius: 14,
                padding: 14, cursor: "pointer", fontFamily: "inherit", transition: "border .12s, transform .08s",
                position: "relative" as const }}
              onMouseEnter={e => { e.currentTarget.style.border = `2px solid ${A}`; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.border = `2px solid ${LINE}`; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: INK, marginBottom: 4 }}>{tpl.name}</div>
              <div style={{ fontSize: 12, color: MUTE, lineHeight: 1.4, marginBottom: 8 }}>{tpl.description || ""}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: A }}>
                {tpl.items?.length || 0} treatment(s){tpl.usage_count > 0 ? ` · used ${tpl.usage_count}×` : ""}
              </div>
            </button>
          ))}
        </div>
      </div>}
      {templateApplying && <TemplateApplyModal A={A} template={templateApplying}
        onCancel={() => setTemplateApplying(null)} onApply={applyTemplate} />}

      {/* Add treatment — search-first; chair-side adding happens on the Tooth Chart */}
      <div style={card}>
        <SectionTitle>➕ Add Treatment <span style={{ fontSize: 11, fontWeight: 500, color: MUTE }}>— review &amp; billing · tooth-wise on the Tooth Chart</span></SectionTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 10 }}>
          <input
            value={planSearch}
            onChange={e => setPlanSearch(e.target.value)}
            placeholder="🔍 Search procedure by name…"
            style={{ ...inp, flex: 1, minWidth: 200, marginBottom: 0 }}
          />
          <button onClick={() => onJumpToTooth?.(chartSelectedTeeth[0] || 11)} style={{ ...btn("#6366F1"), padding: "10px 16px", fontSize: 13 }}>
            🎨 Open Canvas
          </button>
        </div>
        {filteredPlanCatalog.length > 0 && (
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, marginBottom: 10, maxHeight: 220, overflow: "auto" }}>
            {filteredPlanCatalog.map((t: any) => (
              <button key={t.id} onClick={() => { setPicker(t); setPlanSearch(""); }}
                style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "11px 14px", border: "none", borderBottom: `1px solid ${SOFT}`, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                {t.name} <span style={{ color: MUTE, fontWeight: 600 }}>{fmt(t.rate)}</span>
                {t.is_tooth_based && <span style={{ marginLeft: 8, fontSize: 10, color: A, fontWeight: 800 }}>TOOTH</span>}
              </button>
            ))}
          </div>
        )}
        {!planSearch && frequentProcedures.length > 0 && (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: MUTE, letterSpacing: 0.4, marginBottom: 6, textTransform: "uppercase" as const }}>Frequent procedures</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 12 }}>
              {frequentProcedures.map((t: any) => (
                <button key={t.id} onClick={() => setPicker(t)} style={chipGhost(t.is_tooth_based ? A : "#6366F1")}>
                  + {t.name} <span style={{ opacity: 0.7 }}>{fmt(t.rate)}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" as const }}>
          <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Custom treatment name" style={{ ...inp, flex: 2, minWidth: 160 }} />
          <input type="number" value={customRate} onChange={e => setCustomRate(e.target.value)} placeholder="Rate ₹" style={{ ...inp, width: 100 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#475569" }}>
            <input type="checkbox" checked={customTooth} onChange={e => setCustomTooth(e.target.checked)} style={{ accentColor: A }} />Tooth-based
          </label>
          <button onClick={addCustom} style={{ ...btn(A), padding: "10px 16px" }}>＋ Add Custom</button>
        </div>
      </div>
      </>}

      {/* Tooth-wise summary — exam / diagnosis / treatment + amounts per tooth */}
      {!simple && ((W.tooth_examinations || []).length + (W.tooth_diagnoses || []).length + (W.tooth_treatments || []).length) > 0 && (
        <div style={{ ...card, marginTop: 14, background: "linear-gradient(135deg,#F8FAFC,#fff)" }}>
          <SectionTitle>🦷 Tooth-wise summary <span style={{ fontSize: 11, fontWeight: 500, color: MUTE }}>— tap a tooth to open on chart</span></SectionTitle>
          <ToothSummaryGrid W={W} accent={A} planItems={items} selectedTeeth={chartSelectedTeeth} onSelectTooth={(n) => onJumpToTooth?.(n)} />
        </div>
      )}

      {/* Plan table — redesigned T.1 cards */}
      <div style={{ ...card, marginTop: simple ? 0 : 14, padding: 0, overflow: "hidden" }}>
        {!simple && <div style={{ padding: "14px 18px 10px" }}>
          <SectionTitle>🧩 Treatment Plan {items.length > 0 && <span style={{ background: A, color: "#fff", borderRadius: 999, padding: "1px 9px", fontSize: 11 }}>{items.length}</span>}</SectionTitle>
        </div>}
        <TreatmentPlanCards
          items={items}
          accent={A}
          fmt={fmt}
          show={show}
          reload={reload}
          simple={simple}
          onQuickPrice={async (item: any, rate: number, discount: number) => {
            try {
              await api.wsEditPlanItem(item.id, { doctor_rate: rate, discount });
              show(`✓ ${item.treatment_name} — ₹${Math.max(0, rate - discount).toLocaleString("en-IN")}`);
              reload();
            } catch (e: any) { show(e.message); }
          }}
          onEdit={(item: any) => setEditItem(item)}
          onDelete={async (item: any) => {
            if (!confirm(`Remove ${item.treatment_name}?`)) return;
            try { await api.wsDeletePlanItem(item.id); show("✓ Removed"); reload(); }
            catch (e: any) { show(e.message); }
          }}
          onDuplicate={async (item: any) => {
            try { await api.wsDuplicatePlanItem(item.id); show("✓ Duplicated"); reload(); }
            catch (e: any) { show(e.message); }
          }}
          onStatusCycle={async (item: any) => {
            const next = item.status === "advised" ? "in_progress" : item.status === "in_progress" ? "completed" : item.status === "completed" ? "advised" : "advised";
            try { await api.wsEditPlanItem(item.id, { status: next }); show(`✓ ${item.treatment_name} → ${next}`); reload(); }
            catch (e: any) { show(e.message); }
          }}
          onJumpToTooth={onJumpToTooth}
          onOpenInCanvas={(item: any) => {
            const t = (item.teeth || [])[0];
            if (t) onJumpToTooth?.(t);
            else onJumpToTooth?.(chartSelectedTeeth[0] || 11);
          }}
        />
      </div>

      {!simple && <div style={{ ...card, marginTop: 14 }}>
        <button onClick={() => setShowRevs(!showRevs)} style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "inherit", color: INK, padding: 0 }}>
          🕑 Treatment Revision History ({(W.revisions || []).length}) {showRevs ? "▲" : "▼"} <span style={{ fontSize: 11, fontWeight: 500, color: MUTE }}>auto-maintained</span>
        </button>
        {showRevs && <div style={{ marginTop: 10 }}>
          {(W.revisions || []).map((r: any) => (
            <div key={r.n} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: `1px dashed ${SOFT}`, fontSize: 13 }}>
              <span style={{ background: A + "15", color: A, borderRadius: 8, padding: "1px 8px", fontWeight: 800, fontSize: 11, height: "fit-content" }}>Rev {r.n}</span>
              <span style={{ flex: 1 }}>{r.summary}</span>
              <span style={{ color: MUTE, fontSize: 11.5, whiteSpace: "nowrap" as const }}>{new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
          {(W.revisions || []).length === 0 && <div style={{ fontSize: 13, color: MUTE }}>No revisions yet.</div>}
        </div>}
      </div>}

      {/* Modal is now rendered at TreatmentWorkspace top level for cross-tab editing support (e.g. edit from tooth view dropdown/added list) */}
    </div>
  );
}

// ── Treatment entry / edit modal (multi-tooth + rate math) ──────
function TreatmentEntryModal({ A, show, treatment, item, catalog = [], onClose, onSaved, patientId, clinicId, allowedTeeth, childModeDefault }: any) {
  const t = treatment || {};
  const isEdit = !!item;

  // When editing, allow changing the Treatment Type via dropdown (user request)
  const [editTreatmentName, setEditTreatmentName] = useState(isEdit ? item.treatment_name : (t.name || ""));
  const currentTreat = (catalog.find((c: any) => c.name === editTreatmentName) || t || {});

  const toothBased = isEdit
    ? (item.teeth?.length > 0 || !item.area_label) && (item.teeth?.length > 0 || currentTreat?.is_tooth_based !== false)
    : !!currentTreat?.is_tooth_based;

  const restrictTeeth = !isEdit && allowedTeeth && allowedTeeth.length > 0;
  const initialTeeth = isEdit ? (item.teeth || []) : (restrictTeeth ? allowedTeeth! : []);
  const [teeth, setTeeth] = useState<number[]>(initialTeeth);
  const [fullMouth, setFullMouth] = useState(isEdit ? item.area_label === "Full Mouth" : false);
  const [childMode, setChildMode] = useState(childModeDefault || false);

  const unitRate = currentTreat.rate || (
    isEdit ? (Number(item.suggested_rate || 0) / Math.max(item.teeth?.length || 1, 1)) : 0
  );
  const suggested = fullMouth ? unitRate : unitRate * Math.max(teeth.length, toothBased ? 0 : 1);

  const [discount, setDiscount] = useState<string>(isEdit ? String(item.discount || "") : "");
  const [notes, setNotes] = useState(isEdit ? (item.notes || "") : "");
  const [saving, setSaving] = useState(false);
  const dr = suggested, disc = parseFloat(discount) || 0;
  const final = Math.max(dr - disc, 0);

  const toggleTooth = (n: number) => {
    if (restrictTeeth && !allowedTeeth!.includes(n)) return;
    setTeeth(teeth.includes(n) ? teeth.filter(x => x !== n) : [...teeth, n].sort((a, b) => a - b));
  };
  const Q = childMode ? CHILD_Q : ADULT_Q;
  const toothVisible = (n: number) => !restrictTeeth || allowedTeeth!.includes(n);

  const save = async () => {
    if (toothBased && !fullMouth && teeth.length === 0) { show("Select tooth/teeth or Full Mouth"); return; }
    setSaving(true);
    try {
      const finalTreatmentName = isEdit ? editTreatmentName : t.name;
      const proc = catalog.find((c: any) => c.name === finalTreatmentName);
      const payload = {
        treatment_name: finalTreatmentName,
        teeth: fullMouth ? [] : teeth, area_label: fullMouth ? "Full Mouth" : (!toothBased ? "General" : null),
        suggested_rate: suggested, doctor_rate: dr, discount: disc, notes: notes || null,
      };
      if (isEdit) {
        await api.wsEditPlanItem(item.id, payload);
      } else {
        await api.wsAddPlanItem(patientId, { ...payload, procedure_id: proc?.id || t.id, clinic_id: clinicId });
      }
      show(`✓ ${finalTreatmentName} ${fullMouth ? "Full Mouth" : teeth.join(",") || ""} — ${fmt(final)} · tooth chart updated`);
      onSaved();
    } catch (e: any) { show("Error: " + e.message); } finally { setSaving(false); }
  };

  return (
    <div style={mBg} onClick={onClose}>
      <div className="animate-slide" style={{ ...mBox, width: 580 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: INK, fontWeight: 900 }}>
            {isEdit ? "✏️ Edit Treatment" : "➕ Add Treatment"}
          </h3>
          <button onClick={onClose} style={iconBtn("#94A3B8")}>✕</button>
        </div>

        {/* Clear context for the dentist when editing */}
        {isEdit && (
          <div style={{ background: SOFT, borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 13, fontWeight: 700, color: INK }}>
            Tooth: <span style={{ color: A }}>{(item.teeth || []).join(", ") || item.area_label || "—"}</span> &nbsp;&nbsp; Current: <span style={{ color: A }}>{item.treatment_name}</span>
          </div>
        )}

        {/* CHANGE TREATMENT TYPE — the main thing the user asked for in the edit dialog */}
        {isEdit && catalog.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...lbl, marginBottom: 4 }}>Change Treatment Type</label>
            <select
              value={editTreatmentName}
              onChange={e => setEditTreatmentName(e.target.value)}
              style={{ ...inp, fontWeight: 700, borderColor: A }}
            >
              {catalog
                .filter((c: any) => toothBased ? c.is_tooth_based : !c.is_tooth_based)
                .map((c: any) => (
                  <option key={c.id} value={c.name}>
                    {c.name} {c.rate ? `— ${fmt(c.rate)}` : ""}
                  </option>
                ))}
            </select>
            <div style={{ fontSize: 11, color: MUTE, marginTop: 3 }}>Changing this will update the suggested rate. You can still adjust Doctor Rate below.</div>
          </div>
        )}
        {toothBased && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ ...lbl, margin: 0 }}>Tooth / Area {teeth.length > 0 && <b style={{ color: A }}>— {teeth.join(", ")}</b>}</label>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setChildMode(!childMode)} style={chipGhost("#8B5CF6")}>{childMode ? "🧒 Child teeth" : "🧑 Adult teeth"} ⇄</button>
              {!restrictTeeth && (
                <button onClick={() => { setFullMouth(!fullMouth); if (!fullMouth) setTeeth([]); }} style={{ ...chipGhost(fullMouth ? "#10B981" : MUTE), ...(fullMouth ? { background: "#D1FAE5", fontWeight: 800 } : {}) }}>{fullMouth ? "✓ " : ""}Full Mouth</button>
              )}
            </div>
          </div>
          {restrictTeeth && (
            <div style={{ fontSize: 12, color: "#92400E", background: "#FFFBEB", borderRadius: 10, padding: "8px 12px", marginBottom: 8, fontWeight: 600 }}>
              Showing only teeth selected in Clinical Chart ({allowedTeeth!.join(", ")})
            </div>
          )}
          {!fullMouth && <div style={{ background: SOFT, borderRadius: 14, padding: 10 }}>
            {[0, 1].map(half => (
              <div key={half} style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: half === 0 ? 8 : 0, paddingBottom: half === 0 ? 8 : 0, borderBottom: half === 0 ? `1.5px dashed ${LINE}` : "none" }}>
                {[Q[half * 2], Q[half * 2 + 1]].map((quad, qi) => (
                  <div key={qi} style={{ display: "flex", gap: 3 }}>
                    {quad.filter(toothVisible).map(n => (
                      <button key={n} onClick={() => toggleTooth(n)}
                        style={{ width: 32, height: 36, borderRadius: 8, cursor: "pointer", fontWeight: 800, fontSize: 11.5, fontFamily: "inherit",
                          border: teeth.includes(n) ? `2px solid ${A}` : `1.5px solid ${LINE}`,
                          background: teeth.includes(n) ? A : "#fff", color: teeth.includes(n) ? "#fff" : "#475569" }}>{n}</button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>}
        </>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
          <div><label style={lbl}>Suggested {toothBased && !fullMouth && teeth.length > 1 ? `(${teeth.length} × ${fmt(unitRate)})` : ""}</label>
            <div style={{ ...inp, background: SOFT, fontWeight: 800, color: MUTE }}>{fmt(suggested)}</div></div>
          <div><label style={lbl}>Doctor Amount</label>
            <div style={{ ...inp, background: "#ECFDF5", fontWeight: 900, color: "#047857" }}>{fmt(suggested)}</div></div>
          <div><label style={lbl}>Discount</label>
            <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" style={inp} /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ECFDF5", border: "1.5px solid #A7F3D0", borderRadius: 12, padding: "10px 14px", marginTop: 10 }}>
          <b style={{ fontSize: 13, color: "#065F46" }}>Final Amount = Doctor Rate − Discount</b>
          <b style={{ fontSize: 22, color: "#059669" }}>{fmt(final)}</b>
        </div>
        <label style={lbl}>Notes (optional)</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Crown shade A2 · zirconia" style={inp} />
        <button onClick={save} disabled={saving} style={{ ...btn(A), width: "100%", padding: 14, marginTop: 14, fontSize: 14.5, boxShadow: `0 5px 16px ${A}44` }}>
          {saving ? "Saving…" : isEdit ? "✓ Save Changes" : "✅ Add to Treatment Plan"}
        </button>
      </div>
    </div>
  );
}

/** Animated tab content panel — slides forward/back based on tab order */
function TabPanel({ tab, id, dir, children }: { tab: string; id: string; dir: number; children: ReactNode }) {
  if (tab !== id) return null;
  return (
    <div key={id} className={`tw-tab-panel ${dir >= 0 ? "tw-tab-panel-forward" : "tw-tab-panel-back"}`}>
      {children}
    </div>
  );
}

// ── shared bits used by parts 2 (RxTab/ToothTab/FilesTab/FinTab appended below) ──
function SectionTitle({ children }: any) { return <div style={{ fontWeight: 800, fontSize: 14.5, color: INK, marginBottom: 8, display: "flex", alignItems: "center", gap: 7 }}>{children}</div>; }
function InfoRow({ l, v }: any) { return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", borderBottom: `1px dashed ${SOFT}`, fontSize: 13.5 }}><span style={{ color: MUTE, fontWeight: 600 }}>{l}</span><b style={{ textAlign: "right" as const }}>{v}</b></div>; }
function ChipX({ text, bg, color, onX }: any) { return <span style={{ background: bg, color, padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>{text}<button onClick={onX} style={{ background: "transparent", border: "none", cursor: "pointer", color, fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button></span>; }
const card: any = { background: "#fff", borderRadius: 20, padding: 22, boxShadow: SHADOW };
const btn = (c: string): any => ({ background: c, color: "#fff", border: "none", padding: "12px 20px", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 14.5, fontFamily: "inherit" });
const iconBtn = (c: string): any => ({ width: 36, height: 36, borderRadius: 10, border: "none", background: c + "1A", color: c, cursor: "pointer", fontSize: 15, fontFamily: "inherit", fontWeight: 800 });
const tBtn = (c: string): any => ({ border: `1.5px solid ${LINE}`, background: "#fff", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", color: INK });
const chipGhost = (c: string): any => ({ background: c + "0D", color: c, border: `1.5px solid ${c}44`, padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
const lbl: any = { display: "block", fontSize: 12, fontWeight: 800, marginTop: 14, marginBottom: 7, color: "#475569", textTransform: "uppercase" as const, letterSpacing: .5 };
const inp: any = { width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "13px 16px", fontSize: 15, boxSizing: "border-box" as const, outline: "none", fontFamily: "inherit", background: "#fff" };
const mBg: any = { position: "fixed" as const, inset: 0, background: "rgba(15,23,42,.55)", backdropFilter: "blur(3px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const mBox: any = { background: "#fff", borderRadius: 22, padding: 28, maxWidth: "95vw", maxHeight: "92vh", overflow: "auto", boxShadow: SHADOW_LG };

// ═══════════════════ TAB 5 · FILES / RVG ══════════════════════
const FILE_KINDS = ["RVG", "X-Ray", "OPG", "Clinical Photo", "Report", "Consent Form"];
function FilesTab({ patientId, aptId, A, show, items }: any) {
  const [files, setFiles] = useState<any[]>([]);
  const [kind, setKind] = useState("RVG"); const [tooth, setTooth] = useState(""); const [caption, setCaption] = useState("");
  const [filter, setFilter] = useState("All");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      setFiles(await api.listPatientUploads(patientId));
    } catch (e: any) { show("Error loading files: " + e.message); }
  }, [patientId, show]);
  useEffect(() => { loadFiles(); }, [loadFiles]);

  const upload = async (fl: FileList | null) => {
    if (!fl?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(fl)) {
        const fd = new FormData();
        fd.append("file", f); fd.append("file_kind", kind);
        if (aptId) fd.append("appointment_id", aptId);
        if (tooth) fd.append("tooth_number", tooth);
        if (caption) fd.append("caption", caption);
        await api.uploadPatientFile(patientId, fd);
      }
      show(`✓ ${fl.length} file(s) uploaded as ${kind}`); setCaption(""); setTooth(""); loadFiles();
    } catch (e: any) { show("Error: " + e.message); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const today = new Date().toISOString().slice(0, 10);
  const filtered = files.filter(f => filter === "All" ? true : filter === "Today" ? (f.uploaded_at || "").slice(0, 10) === today : (f.file_kind || "Other") === filter);
  const groups: any = {};
  filtered.forEach(f => { const g = (f.uploaded_at || "").slice(0, 10) === today ? "📌 Current Visit" : `🗓 ${dmy(f.uploaded_at)}`; (groups[g] = groups[g] || []).push(f); });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 14, alignItems: "start" }}>
      <div style={card}>
        <SectionTitle>📤 Upload</SectionTitle>
        <label style={lbl}>Type</label>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
          {FILE_KINDS.map(k => <button key={k} onClick={() => setKind(k)} style={{ ...chipGhost(kind === k ? A : MUTE), ...(kind === k ? { background: A, color: "#fff", fontWeight: 800 } : {}) }}>{k}</button>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <div><label style={lbl}>Tooth (optional)</label><input type="number" value={tooth} onChange={e => setTooth(e.target.value)} placeholder="36" style={inp} /></div>
          <div><label style={lbl}>Note</label><input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Pre-op RVG…" style={inp} /></div>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ width: "100%", marginTop: 12, padding: "26px 10px", border: `2px dashed ${A}88`, borderRadius: 14, background: A + "08", color: A, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>
          {uploading ? "Uploading…" : "📎 Drop or tap to upload (images / PDF / video)"}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,video/*" style={{ display: "none" }} onChange={e => upload(e.target.files)} />
      </div>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap" as const, gap: 6 }}>
          <SectionTitle>🗂 Files ({files.length})</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
            {["All", "Today", ...FILE_KINDS].map(f => <button key={f} onClick={() => setFilter(f)} style={{ ...chipGhost(filter === f ? A : MUTE), fontSize: 11, ...(filter === f ? { background: A, color: "#fff" } : {}) }}>{f}</button>)}
          </div>
        </div>
        {Object.keys(groups).length === 0 && <div style={{ fontSize: 13, color: MUTE }}>No files yet.</div>}
        {Object.entries(groups).map(([g, list]: [string, any]) => (
          <div key={g} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: MUTE, marginBottom: 6 }}>{g}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8 }}>
              {list.map((f: any) => (
                <div key={f.id} style={{ border: `1.5px solid ${LINE}`, borderRadius: 12, overflow: "hidden", background: SOFT }}>
                  <a href={f.file_url} target="_blank" style={{ display: "block", textDecoration: "none" }}>
                    {f.file_type === "image"
                      ? <img src={f.file_url} alt="" style={{ width: "100%", height: 78, objectFit: "cover" as const, display: "block" }} />
                      : <div style={{ height: 78, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{f.file_type === "video" ? "🎬" : "📄"}</div>}
                  </a>
                  <div style={{ padding: "5px 8px" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: A }}>{f.file_kind || f.file_type}{f.tooth_number ? ` · 🦷${f.tooth_number}` : ""}</div>
                    <div style={{ fontSize: 10, color: MUTE, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{f.caption || f.file_name}</div>
                    <button onClick={async () => { if (!confirm("Delete file?")) return; try { await api.deletePatientUpload(f.id); loadFiles(); } catch (e: any) { show("Error: " + e.message); } }}
                      style={{ border: "none", background: "transparent", color: "#EF4444", fontSize: 10.5, fontWeight: 800, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════ TAB 6 · FINANCIALS ═══════════════════════
function FinTab({ fin, A, collectToday, setCollectToday, adjAmt, setAdjAmt, adjReason, setAdjReason }: any) {
  const CARDS = [
    ["Total Treatment Value", fin.total_value, INK], ["Paid Till Date", fin.paid, "#059669"],
    ["Previous Outstanding", fin.previous_outstanding, "#D97706"], ["Today's Added Value", fin.today_added, "#6366F1"],
    ["Current Outstanding", fin.outstanding, fin.outstanding > 0 ? "#DC2626" : "#059669"],
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 14 }}>
        {CARDS.map(([l, v, c]: any) => (
          <div key={l} style={{ ...card, padding: "14px 16px", position: "relative" as const, overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c},${c}55)` }} />
            <div style={{ fontSize: 10.5, fontWeight: 800, color: MUTE, letterSpacing: .4 }}>{String(l).toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: c, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmt(v)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 14, alignItems: "start" }}>
        <div style={card}>
          <SectionTitle>💰 Amount To Collect Today</SectionTitle>
          <div style={{ fontSize: 12, color: MUTE, marginBottom: 8 }}>Set per-treatment prices on the Treatment tab. Here, enter what the nurse collects when you close the visit.</div>
          <input type="number" value={collectToday} onChange={(e: any) => setCollectToday(e.target.value)} placeholder="0"
            style={{ ...inp, fontSize: 28, fontWeight: 900, textAlign: "center" as const, borderColor: A, borderWidth: 2 }} />
          <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" as const }}>
            {[fin.today_added, fin.outstanding].filter((v: number, i: number, a: number[]) => v > 0 && a.indexOf(v) === i).map((v: number) => (
              <button key={v} onClick={() => setCollectToday(String(v))} style={chipGhost(A)}>{v === fin.outstanding ? "Full outstanding" : "Today's value"} {fmt(v)}</button>
            ))}
          </div>
          <label style={lbl}>Final Adjustment (optional — separate from Doctor Rate)</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input type="number" value={adjAmt} onChange={(e: any) => setAdjAmt(e.target.value)} placeholder="₹ 0" style={inp} />
            <select value={adjReason} onChange={(e: any) => setAdjReason(e.target.value)} style={inp}>
              <option value="">Reason…</option>{ADJ_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          {(parseFloat(adjAmt) || 0) > 0 && <div style={{ marginTop: 10, background: "#FEF3C7", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 800, color: "#92400E" }}>
            Nurse will collect {fmt(Math.max((parseFloat(collectToday) || 0) - (parseFloat(adjAmt) || 0), 0))}
          </div>}
        </div>
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px 8px" }}><SectionTitle>📒 Payment History</SectionTitle></div>
          {(fin.ledger || []).length === 0 && <div style={{ padding: "0 18px 16px", fontSize: 13, color: MUTE }}>No payments recorded yet.</div>}
          {(fin.ledger || []).length > 0 && <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
            <thead><tr style={{ background: SOFT }}>{["Date", "Amount", "Mode", "Ref", "Balance After"].map(h => <th key={h} style={{ padding: "8px 14px", textAlign: "left" as const, fontSize: 10.5, fontWeight: 800, color: MUTE }}>{h.toUpperCase()}</th>)}</tr></thead>
            <tbody>{fin.ledger.map((r: any, i: number) => (
              <tr key={i} style={{ borderTop: `1px solid ${SOFT}` }}>
                <td style={{ padding: "8px 14px", fontWeight: 700 }}>{dmy(r.date)}</td>
                <td style={{ padding: "8px 14px", fontWeight: 900, color: "#059669" }}>{fmt(r.amount)}</td>
                <td style={{ padding: "8px 14px", textTransform: "capitalize" as const }}>{r.mode === "cash" ? "💵" : r.mode === "upi" ? "📱" : "💳"} {r.mode}</td>
                <td style={{ padding: "8px 14px", color: MUTE, fontSize: 11.5 }}>{r.ref || "—"}</td>
                <td style={{ padding: "8px 14px", fontWeight: 800, color: r.balance_after > 0 ? "#DC2626" : "#059669" }}>{fmt(r.balance_after)}</td>
              </tr>
            ))}</tbody>
          </table>}
        </div>
      </div>
    </div>
  );
}

// ── Template apply modal (maps placeholder teeth before adding) ──
function TemplateApplyModal({ A, template, onCancel, onApply }: any) {
  const [mapped, setMapped] = useState<{ [k: string]: number[] }>({});
  const [child, setChild] = useState(false);
  const items = template.items || [];
  const Q = child ? CHILD_Q : ADULT_Q;
  const toggleTooth = (idx: number, n: number) => {
    const cur = mapped[String(idx)] || [];
    setMapped({ ...mapped, [String(idx)]: cur.includes(n) ? cur.filter(x => x !== n) : [...cur, n].sort((a, b) => a - b) });
  };
  const placeholderItems = items.map((it: any, idx: number) => ({ ...it, idx })).filter((it: any) => it.teeth_placeholder);
  const allMapped = placeholderItems.every((it: any) => (mapped[String(it.idx)] || []).length > 0);
  return (
    <div style={mBg} onClick={onCancel}>
      <div className="animate-slide" style={{ ...mBox, width: 620 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900, color: INK }}>📋 Apply Template — {template.name}</h3>
        <p style={{ fontSize: 13.5, color: MUTE, margin: "0 0 14px" }}>{template.description}</p>
        <div style={{ background: SOFT, borderRadius: 14, padding: 14, marginBottom: 12 }}>
          {items.map((it: any, idx: number) => (
            <div key={idx} style={{ padding: "8px 0", borderBottom: idx < items.length - 1 ? `1px dashed ${LINE}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <b style={{ fontSize: 14 }}>{it.treatment_name}{it.area_label ? ` · ${it.area_label}` : ""}</b>
                <span style={{ fontSize: 13, fontWeight: 700, color: A }}>{fmt(it.doctor_rate || it.suggested_rate || 0)}</span>
              </div>
              {it.teeth_placeholder && <div style={{ fontSize: 12, color: MUTE, fontWeight: 600 }}>
                Tooth: {(mapped[String(idx)] || []).length > 0 ? <b style={{ color: A }}>{(mapped[String(idx)] || []).join(", ")}</b> : <span style={{ color: "#DC2626" }}>Pick tooth/teeth below ↓</span>}
              </div>}
            </div>
          ))}
        </div>
        {placeholderItems.length > 0 && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ ...lbl, margin: 0 }}>Select Teeth for placeholder items</label>
            <button onClick={() => setChild(!child)} style={chipGhost("#8B5CF6")}>{child ? "🧒 Child" : "🧑 Adult"} ⇄</button>
          </div>
          {placeholderItems.map((it: any) => (
            <div key={it.idx} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6 }}>→ {it.treatment_name}</div>
              <div style={{ background: SOFT, borderRadius: 12, padding: 10 }}>
                {[0, 1].map(half => (
                  <div key={half} style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: half === 0 ? 6 : 0, paddingBottom: half === 0 ? 6 : 0, borderBottom: half === 0 ? `1.5px dashed ${LINE}` : "none" }}>
                    {[Q[half * 2], Q[half * 2 + 1]].map((quad, qi) => (
                      <div key={qi} style={{ display: "flex", gap: 3 }}>
                        {quad.map(n => {
                          const on = (mapped[String(it.idx)] || []).includes(n);
                          return (
                            <button key={n} onClick={() => toggleTooth(it.idx, n)}
                              style={{ width: 34, height: 38, borderRadius: 8, cursor: "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit",
                                border: on ? `2px solid ${A}` : `1.5px solid ${LINE}`,
                                background: on ? A : "#fff", color: on ? "#fff" : "#475569" }}>{n}</button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 14, border: `2px solid ${LINE}`, borderRadius: 13, background: "#fff", color: "#475569", fontWeight: 800, fontSize: 14.5, fontFamily: "inherit", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onApply(template, mapped)} disabled={!allMapped && placeholderItems.length > 0}
            style={{ flex: 2, padding: 14, border: "none", borderRadius: 13, fontFamily: "inherit", cursor: allMapped || placeholderItems.length === 0 ? "pointer" : "not-allowed",
              fontWeight: 800, fontSize: 14.5, color: "#fff",
              background: allMapped || placeholderItems.length === 0 ? `linear-gradient(135deg,${A},${A}DD)` : "#94A3B8",
              boxShadow: `0 6px 18px ${A}44` }}>
            ✅ Apply Template ({items.length} item{items.length !== 1 ? "s" : ""})
          </button>
        </div>
      </div>
    </div>
  );
}
