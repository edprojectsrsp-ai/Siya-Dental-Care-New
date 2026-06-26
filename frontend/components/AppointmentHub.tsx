"use client";
// Appointment Hub v3 nurse workflow UI.
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as api from "@/lib/api";
import { MedicalConditionsPicker } from "@/components/MedicalConditionsPicker";
import CallConfirmModal from "@/components/CallConfirmModal";
import { Calendar, Clock, Phone, MessageCircle, Edit3, Eye, Trash2, Plus, Users, ArrowRight, Search, X, Bell, Check, ChevronDown, GripVertical } from "lucide-react";

// Design tokens.
const INK = "#18181B", MUTE = "#71717A", LINE = "#E4E4E7", SOFT = "#FAFAFA";
const R = 24; // border-radius base
const SHADOW = "0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)";
const SHADOW_LG = "0 8px 40px rgba(0,0,0,.1)";

export const PT: any = {
  new:       { dot: "#F59E0B", bg: "#FEF3C7", text: "#92400E", label: "New" },
  followup:  { dot: "#3B82F6", bg: "#DBEAFE", text: "#1E40AF", label: "Follow-up" },
  walkin:    { dot: "#8B5CF6", bg: "#F3E8FF", text: "#6B21A8", label: "Walk-in" },
  emergency: { dot: "#EF4444", bg: "#FEE2E2", text: "#991B1B", label: "Emergency" },
};
export const WF: any = {
  scheduled:       { bg: "#F4F4F5", text: "#52525B", label: "Scheduled",   dot: "#A1A1AA" },
  pending:         { bg: "#FEF3C7", text: "#92400E", label: "Pending",     dot: "#F59E0B" },
  confirmed:       { bg: "#D1FAE5", text: "#065F46", label: "Confirmed",   dot: "#10B981" },
  arrived:         { bg: "#D1FAE5", text: "#065F46", label: "In Queue",    dot: "#10B981" },
  ready:           { bg: "#D1FAE5", text: "#065F46", label: "In Queue",    dot: "#10B981" },
  in_treatment:    { bg: "#EDE9FE", text: "#5B21B6", label: "In Treatment", dot: "#8B5CF6" },
  in_progress:     { bg: "#EDE9FE", text: "#5B21B6", label: "In Treatment", dot: "#8B5CF6" },
  payment_pending: { bg: "#FFEDD5", text: "#9A3412", label: "Payment Due", dot: "#F97316" },
  completed:       { bg: "#D1FAE5", text: "#065F46", label: "Done",        dot: "#10B981" },
  done:            { bg: "#D1FAE5", text: "#065F46", label: "Done",        dot: "#10B981" },
  cancelled:       { bg: "#FEE2E2", text: "#991B1B", label: "Cancelled",   dot: "#EF4444" },
  rescheduled:     { bg: "#E9D5FF", text: "#6B21A8", label: "Rescheduled", dot: "#A855F7" },
};
const CS: any = {
  pending_call:         { c: "#A1A1AA", bg: "#F4F4F5", text: "#52525B", label: "Pending Call" },
  confirmed:            { c: "#10B981", bg: "#D1FAE5", text: "#065F46", label: "Confirmed" },
  no_answer:            { c: "#F59E0B", bg: "#FEF3C7", text: "#92400E", label: "No Answer" },
  call_back_later:      { c: "#F59E0B", bg: "#FFF7ED", text: "#9A3412", label: "Call Back Later" },
  cancelled_by_patient: { c: "#EF4444", bg: "#FEE2E2", text: "#991B1B", label: "Cancelled" },
  rescheduled:          { c: "#3B82F6", bg: "#DBEAFE", text: "#1E40AF", label: "Rescheduled" },
};

// Helpers.
export function TypeBadge({ type }: { type: string }) {
  const t = PT[type] || PT.followup;
  return <span style={{ background: t.bg, color: t.text, borderRadius: 999, padding: "4px 14px", fontSize: 13, fontWeight: 500 }}>{t.label}</span>;
}
function StatusPill({ ws }: { ws: string }) {
  const w = WF[ws] || WF.scheduled;
  return <span style={{ background: w.bg, color: w.text, borderRadius: 999, padding: "4px 14px", fontSize: 13, fontWeight: 500 }}>{w.label}</span>;
}
function HubStatusPill({ appointment }: { appointment: any }) {
  const isCancelledWaitingReschedule =
    appointment?.workflow_status === "cancelled" &&
    !appointment?.scheduled_date &&
    !appointment?.requested_date;
  if (isCancelledWaitingReschedule) {
    return (
      <span style={{ background: "#FEF2F2", color: "#991B1B", borderRadius: 999, padding: "4px 14px", fontSize: 13, fontWeight: 600 }}>
        Cancelled → Waiting Reschedule
      </span>
    );
  }
  return <StatusPill ws={appointment?.workflow_status} />;
}
function BookingStagePill({ stage }: { stage?: string }) {
  const meta: any = { active_treatment: { bg: "#EDE9FE", text: "#5B21B6", label: "Active Case" }, returning: { bg: "#DBEAFE", text: "#1E40AF", label: "Returning" }, new: { bg: "#FEF3C7", text: "#92400E", label: "New" } };
  const b = meta[stage || "new"] || meta.new;
  return <span style={{ background: b.bg, color: b.text, borderRadius: 999, padding: "4px 14px", fontSize: 13, fontWeight: 500 }}>{b.label}</span>;
}
function Empty({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return <div style={{ padding: "48px 24px", textAlign: "center", background: "#fff", borderRadius: R, border: `1.5px solid ${LINE}` }}>
    <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontWeight: 600, color: MUTE, fontSize: 18 }}>{text}</div>
    {sub && <div style={{ fontSize: 14, color: "#A1A1AA", marginTop: 6 }}>{sub}</div>}
  </div>;
}
const solidBtn = (c: string): any => ({ border: "none", borderRadius: R, padding: "14px 28px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit", background: c, color: "#fff", transition: "all .15s", display: "inline-flex", alignItems: "center", gap: 10 });
const ghostBtn = (c: string): any => ({ border: `1.5px solid ${LINE}`, borderRadius: R, padding: "14px 28px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit", background: "#fff", color: c, transition: "all .15s", display: "inline-flex", alignItems: "center", gap: 10 });
const actionBarBtn = (bg: string, color: string): any => ({ flex: 1, padding: "16px 0", background: bg, border: "none", borderRadius: R, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, fontSize: 14, color, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .12s" });
const mBg: any = { position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const mBox: any = { background: "#fff", borderRadius: R + 4, maxHeight: "90vh", overflowY: "auto", position: "relative" };
const lbl: any = { display: "block", fontSize: 12, fontWeight: 600, color: MUTE, marginBottom: 6, marginTop: 14, textTransform: "uppercase", letterSpacing: .8 };
const inp: any = { width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 16, padding: "12px 16px", fontSize: 15, fontWeight: 500, fontFamily: "inherit", marginBottom: 4, outline: "none", boxSizing: "border-box" };
const chip = (on: boolean, c: string): any => ({ border: `1.5px solid ${on ? c : LINE}`, borderRadius: 999, padding: "8px 18px", background: on ? `${c}12` : "#fff", color: on ? c : MUTE, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" });
const chipGhost = (c: string): any => ({ border: `1px dashed ${c}66`, borderRadius: 999, padding: "6px 12px", background: "transparent", color: c, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit" });
const iconBtn = (c: string): any => ({ border: `1.5px solid ${c}33`, borderRadius: 12, background: `${c}08`, color: c, cursor: "pointer", padding: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34 });
const smBtn = (c: string): any => ({ background: c, color: "#fff", border: "none", borderRadius: 12, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });
const Chip = ({ text, color, bg, onX }: { text: string; color: string; bg: string; onX: () => void }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: bg, color, borderRadius: 999, padding: "4px 14px", fontSize: 13, fontWeight: 600 }}>
    {text} <span onClick={onX} style={{ cursor: "pointer", opacity: .5, fontWeight: 900 }}>×</span>
  </span>
);
const isoDate = (d: Date) => d.toISOString().split("T")[0];
const todayStr = () => isoDate(new Date());
const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate() + 1); return isoDate(d); };
const dayAfterStr = () => { const d = new Date(); d.setDate(d.getDate() + 2); return isoDate(d); };
const dateLabelShort = (ds: string) => {
  if (ds === todayStr()) return "Today";
  if (ds === tomorrowStr()) return "Tomorrow";
  if (ds === dayAfterStr()) return "Day After";
  return new Date(ds + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};
const fmt12 = (t: string) => {
  if (!t || t === "—") return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};
const shortDate = (d?: string | null) => {
  if (!d) return "";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
  catch { return d; }
};

// Prompt modal — replaces window.prompt() for date / time / reason entry.
// Native pickers validate input and work inside Capacitor/Android WebView
// (where window.prompt is blocked).
type PromptConfig = {
  title: string;
  label: string;
  type: "date" | "time" | "text";
  value: string;
  placeholder?: string;
  submitLabel?: string;
  danger?: boolean;
  onSubmit: (value: string) => void;
};
function PromptModal({ config, accent, onClose }: { config: PromptConfig; accent: string; onClose: () => void }) {
  const [val, setVal] = useState(config.value || "");
  const valid = config.type === "text" ? true : !!val;
  const submit = () => { if (!valid) return; config.onSubmit(val.trim()); onClose(); };
  return (
    <div style={mBg} onClick={onClose}>
      <div style={{ ...mBox, width: 440, maxWidth: "94vw", padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 2 }}>{config.title}</div>
        <label style={lbl}>{config.label}</label>
        {config.type === "text" ? (
          <textarea autoFocus value={val} onChange={e => setVal(e.target.value)} placeholder={config.placeholder}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
            style={{ ...inp, minHeight: 92, resize: "vertical" }} />
        ) : (
          <input autoFocus type={config.type} value={val} min={config.type === "date" ? todayStr() : undefined}
            placeholder={config.placeholder} onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }} style={inp} />
        )}
        {config.type === "date" && val && val < todayStr() && (
          <div style={{ fontSize: 12.5, color: "#B45309", background: "#FEF3C7", borderRadius: 10, padding: "8px 12px", marginTop: 6 }}>
            ⚠ This date is in the past — double-check before applying.
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...ghostBtn(MUTE), padding: "12px 22px" }}>Cancel</button>
          <button onClick={submit} disabled={!valid}
            style={{ ...solidBtn(config.danger ? "#EF4444" : accent), padding: "12px 22px", opacity: valid ? 1 : .5, cursor: valid ? "pointer" : "not-allowed" }}>
            {config.submitLabel || "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component.
export function AppointmentHub({ clinicId, staff, accent = "#059669", show, view = "hub", onNavigate }:
  { clinicId: string; staff: any; accent?: string; show: (m: string) => void;
    view?: "hub" | "dashboard" | "payments" | "billing"; onNavigate?: (section: string) => void }) {

  const A = accent;
  const [activeTab, setActiveTab] = useState<string>("schedule");
  const [activeDay, setActiveDay] = useState<number>(0); // 0=today,1=tomorrow,2=dayafter,3=future
  const [allApts, setAllApts] = useState<any[]>([]);
  const [queueData, setQueueData] = useState<any>(null);
  const [diaryData, setDiaryData] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addPrefillDate, setAddPrefillDate] = useState<string | null>(null);
  const [payPat, setPayPat] = useState<any>(null);
  const [reschedApt, setReschedApt] = useState<any>(null);
  const [busy, setBusy] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [dragApt, setDragApt] = useState<any>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [callModalApt, setCallModalApt] = useState<any>(null);
  const [specCallApt, setSpecCallApt] = useState<any>(null);
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [pendingBusy, setPendingBusy] = useState<string | number | null>(null);
  const [promptModal, setPromptModal] = useState<PromptConfig | null>(null);
  const prevPendingCount = useRef(0);

  // Load data.
  const loadAll = useCallback(async () => {
    if (!clinicId) return;
    try {
      const start = new Date(); start.setDate(start.getDate() - 180);
      const end = new Date(); end.setDate(end.getDate() + 60);
      const d = await api.hubAppointmentsRange(clinicId, isoDate(start), isoDate(end));
      setAllApts(Array.isArray(d.appointments || d) ? (d.appointments || d) : []);
      const todayData = await api.hubToday(clinicId).catch(() => null);
      setStats(todayData?.stats || {});
    } catch { setAllApts([]); }
  }, [clinicId]);
  const loadQueue = useCallback(async () => { try { setQueueData(await api.hubQueue(clinicId)); } catch {} }, [clinicId]);
  const loadDiary = useCallback(async () => { try { setDiaryData(await api.hubCallDiary(clinicId)); } catch {} }, [clinicId]);
  const loadPendingRequests = useCallback(async () => {
    try { const d = await api.hubPendingRequests(clinicId); setPendingRequests(Array.isArray(d) ? d : d?.requests || []); } catch { setPendingRequests([]); }
  }, [clinicId]);
  const refreshAll = useCallback(() => { loadAll(); loadQueue(); loadDiary(); loadPendingRequests(); }, [loadAll, loadQueue, loadDiary, loadPendingRequests]);
  useEffect(() => { refreshAll(); }, [refreshAll]);
  useEffect(() => { const iv = setInterval(refreshAll, 15000); return () => clearInterval(iv); }, [refreshAll]);
  useEffect(() => {
    if (pendingRequests.length > prevPendingCount.current && pendingRequests.length > 0) {
      setShowNotifPanel(true);
      show(`🔔 ${pendingRequests.length} new website booking request${pendingRequests.length > 1 ? "s" : ""}`);
    }
    prevPendingCount.current = pendingRequests.length;
  }, [pendingRequests.length, show]);

  const today = todayStr(), tomorrow = tomorrowStr(), dayAfter = dayAfterStr();

  const requestService = (req: any) =>
    req.service ||
    (typeof req.message === "string" && req.message.match(/Service:\s*(.+)/)?.[1]?.split("\n")[0]?.trim()) ||
    "General";

  const requestPreferredDate = (req: any) => {
    const raw = req.preferred_date;
    if (!raw) return today;
    if (typeof raw === "string") return raw.slice(0, 10);
    return today;
  };

  // Build date buckets.
  // Build date buckets.
  // Closed visits by status for count badges
  const completedApts = useMemo(() =>
    allApts.filter((a: any) => ["completed", "done", "payment_pending"].includes(a.workflow_status)),
  [allApts]);

  const activeApts = useMemo(() => {
    let list = [...allApts];
    if (kpiFilter === "arrived") list = list.filter((a: any) => ["arrived", "ready"].includes(a.workflow_status));
    else if (kpiFilter === "in_treatment") list = list.filter((a: any) => ["in_treatment", "in_progress"].includes(a.workflow_status));
    else if (kpiFilter === "calls_pending") list = list.filter((a: any) => !a.call_status || a.call_status === "pending_call");
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((a: any) => (a.patient_name || "").toLowerCase().includes(q) || (a.phone || "").includes(q) || (a.reason || a.chief_complaint || "").toLowerCase().includes(q));
    }
    return list;
  }, [allApts, searchTerm, kpiFilter]);

  const buckets = useMemo(() => {
    const b: Record<string, any[]> = { today: [], tomorrow: [], day_after: [], future: [], unscheduled: [] };
    for (const a of activeApts) {
      const d = a.scheduled_date || a.requested_date;
      if (!d || a.workflow_status === "cancelled") { b.unscheduled.push(a); continue; }
      if (d === today) b.today.push(a);
      else if (d === tomorrow) b.tomorrow.push(a);
      else if (d === dayAfter) b.day_after.push(a);
      else if (d > dayAfter) b.future.push(a);
      else if (d < today) b.unscheduled.push(a);
    }
    Object.values(b).forEach(arr => arr.sort((a: any, b: any) => (a.scheduled_time || "99:99").localeCompare(b.scheduled_time || "99:99")));
    return b;
  }, [activeApts, today, tomorrow, dayAfter]);

  const futureGroups = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    const nextMonth = nextMonthDate.getMonth();
    const nextMonthYear = nextMonthDate.getFullYear();
    const groups: Record<string, any[]> = { this_month: [], next_month: [], later: [] };
    for (const a of buckets.future) {
      const d = a.scheduled_date || a.requested_date;
      if (!d) continue;
      const dt = new Date(`${d}T00:00:00`);
      if (dt.getFullYear() === currentYear && dt.getMonth() === currentMonth) groups.this_month.push(a);
      else if (dt.getFullYear() === nextMonthYear && dt.getMonth() === nextMonth) groups.next_month.push(a);
      else groups.later.push(a);
    }
    return groups;
  }, [buckets.future]);

  const currentBucket = activeDay === 0 ? buckets.today : activeDay === 1 ? buckets.tomorrow : activeDay === 2 ? buckets.day_after : [];
  const currentDate = activeDay === 0 ? today : activeDay === 1 ? tomorrow : activeDay === 2 ? dayAfter : "";
  const currentLabel = activeDay === 0 ? "Today" : activeDay === 1 ? "Tomorrow" : activeDay === 2 ? "Day After Tomorrow" : "All Future";

  // Split into halves (before 2PM / after 2PM)
  const firstHalf = currentBucket.filter((a: any) => { const t = a.scheduled_time || ""; return t < "14:00" || !t; });
  const secondHalf = currentBucket.filter((a: any) => { const t = a.scheduled_time || ""; return t >= "14:00"; });

  const callStats = useMemo(() => {
    const calc = (arr: any[]) => ({
      pending: arr.filter(a => !a.call_status || a.call_status === "pending_call").length,
      confirmed: arr.filter(a => a.call_status === "confirmed").length,
      noAnswer: arr.filter(a => ["no_answer", "call_back_later"].includes(a.call_status)).length,
      total: arr.length,
    });
    return { today: calc(buckets.today), tomorrow: calc(buckets.tomorrow), day_after: calc(buckets.day_after), all: calc(activeApts) };
  }, [buckets, activeApts]);

  const payPending = queueData?.segments?.payment_pending || [];
  const s = stats;

  // Actions.
  const markArrived = async (a: any) => {
    setBusy(a.id);
    try {
      const gates = await api.bookingGates(a.patient_id).catch(() => null);
      if (gates && !gates.can_finalize) {
        const blocks = (gates.gates || []).filter((g: any) => g.severity === "block");
        if (blocks.length) {
          show(blocks.map((g: any) => g.message).join(" • "));
          return;
        }
      }
      await api.hubMarkStatus(a.id, "arrived");
      show(`🟢 ${a.patient_name} → Doctor Queue`);
      refreshAll();
    } catch (e: any) { show("Error: " + e.message); } finally { setBusy(""); }
  };
  const mark = async (id: string, st: string, cancelReason?: string) => { try { await api.hubMarkStatus(id, st, cancelReason); show(`✓ ${st.replace("_"," ")}`); refreshAll(); } catch (e: any) { show("Error: " + e.message); } };
  const moveToDate = async (id: string, date: string, name: string) => { setBusy(id); try { await api.hubMoveAppointment(id, date); show(`✓ ${name} → ${dateLabelShort(date)}`); refreshAll(); } catch (e: any) { show("Error: " + e.message); } finally { setBusy(""); } };
  const moveToUnscheduled = async (id: string, name: string) => { setBusy(id); try { await api.hubUnschedule(id); show(`↩ ${name} → Unscheduled`); refreshAll(); } catch (e: any) { show("Error: " + e.message); } finally { setBusy(""); } };
  const updateTime = async (id: string, t: string) => { try { await api.hubUpdateTime(id, t); show(`✓ Time → ${fmt12(t)}`); refreshAll(); } catch (e: any) { show("Error: " + e.message); } };
  const submitPendingAction = async (a: any, payload: any) => {
    try {
      await api.applyPendingAction(a.id, payload);
      show(`✓ Pending ${a.pending_action === "change_date" ? "date" : "time"} applied`);
      refreshAll();
    } catch (e: any) {
      show("Error: " + e.message);
    }
  };
  const applyPendingAction = (a: any) => {
    if (a.pending_action === "change_date") {
      setPromptModal({
        title: `Reschedule ${a.patient_name}`,
        label: "New appointment date",
        type: "date",
        value: a.pending_new_date || a.scheduled_date || today,
        submitLabel: "Apply date",
        onSubmit: (v) => submitPendingAction(a, { new_date: v }),
      });
    } else if (a.pending_action === "change_time") {
      setPromptModal({
        title: `Change time for ${a.patient_name}`,
        label: "New appointment time",
        type: "time",
        value: a.pending_new_time || a.scheduled_time || "10:00",
        submitLabel: "Apply time",
        onSubmit: (v) => submitPendingAction(a, { new_time: v }),
      });
    }
  };
  const sendWA = async (id: string) => { try { const d = await api.diaryWhatsAppTemplate(id); window.open(d.whatsapp_url, "_blank"); await api.diaryLogMessage(id, "whatsapp", "confirmation", d.message); show("✓ WhatsApp opened"); } catch (e: any) { show("Error: " + e.message); } };
  const msgSpecialist = (a: any) => {
    let to = String(a.specialist_whatsapp || a.specialist_phone || "").replace(/[^0-9]/g, "");
    if (!to) { show("No phone number on file for this specialist"); return; }
    if (to.length === 10) to = "91" + to;
    const date = a.scheduled_date || a.requested_date || "the scheduled date";
    const time = a.scheduled_time || a.requested_time || "";
    const msg = `Hi ${a.specialist_name || ""}, regarding patient ${a.patient_name} on ${date} ${time}. Please confirm your availability. Thank you.`;
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(msg)}`, "_blank");
  };
  const bulkWA = async () => { try { const d = await api.hubBulkWhatsApp(clinicId); if (d.count === 0) { show("Everyone already contacted"); return; } for (const p of d.patients) { window.open(p.whatsapp_url, "_blank"); await new Promise(r => setTimeout(r, 1100)); } show(`✓ ${d.count} WhatsApp(s) opened`); } catch (e: any) { show("Error: " + e.message); } };
  const sendListToDoctor = async () => { try { const d = await api.hubDoctorDayList(clinicId); window.open(d.whatsapp_url, "_blank"); show(`✓ ${d.count} patients sent to doctor`); } catch (e: any) { show("Error: " + e.message); } };
  const confirmRequest = async (req: any, date: string) => {
    if (pendingBusy) return;
    const dateKey = date.slice(0, 10);
    setPendingBusy(req.id);
    try {
      await api.hubConfirmRequest(req.id, dateKey, req.preferred_time || undefined);
      show(`✓ ${req.patient_name} → ${dateLabelShort(dateKey)} — now in schedule`);
      setShowNotifPanel(false);
      await loadPendingRequests();
      await loadAll();
      setActiveTab("schedule");
      setActiveDay(dateKey === today ? 0 : dateKey === tomorrow ? 1 : dateKey === dayAfter ? 2 : 0);
    } catch (e: any) { show("Error: " + (e?.message || "Could not confirm booking")); }
    finally { setPendingBusy(null); }
  };
  const rejectRequest = async (req: any) => {
    if (pendingBusy) return;
    setPendingBusy(req.id);
    try {
      await api.hubRejectRequest(req.id);
      show(`✕ ${req.patient_name} — request rejected`);
      await loadPendingRequests();
      if (pendingRequests.length <= 1) setShowNotifPanel(false);
    } catch (e: any) { show("Error: " + (e?.message || "Could not reject booking")); }
    finally { setPendingBusy(null); }
  };

  // ─── Inline Lab order actions (nurse can confirm received / update expected date from card) ───
  const confirmLabReceived = async (orderId: string, workType: string) => {
    setBusy(orderId);
    try {
      await api.labReceiveOrder(orderId);
      show(`✓ Lab order "${workType}" marked as received`);
      refreshAll();
    } catch (e: any) { show("Error: " + e.message); }
    finally { setBusy(""); }
  };
  const updateLabExpectedDate = async (orderId: string, newDate: string) => {
    try {
      await api.labUpdateOrder(orderId, { expected_date: newDate });
      show(`✓ Expected date updated`);
      refreshAll();
    } catch (e: any) { show("Error: " + e.message); }
  };

  // Drag & drop
  const onDragStart = (e: any, apt: any) => { setDragApt(apt); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: any, key: string) => { e.preventDefault(); setDragOverDate(key); };
  const onDragLeave = () => setDragOverDate(null);
  const onDrop = async (e: any, targetDate: string) => { e.preventDefault(); setDragOverDate(null); if (!dragApt) return; if (targetDate === "unscheduled") await moveToUnscheduled(dragApt.id, dragApt.patient_name); else await moveToDate(dragApt.id, targetDate, dragApt.patient_name); setDragApt(null); };

// Patient card.
  const PatientCard = ({ a, dateCtx }: { a: any; dateCtx: string }) => {
    const tm = a.scheduled_time || a.requested_time || "—";
    const aptDate = a.scheduled_date || a.requested_date || "";
    const isToday = aptDate === today;
    const complaint = a.complaints?.length ? a.complaints.join(", ") : a.reason || a.chief_complaint || "General Consultation";
    const doctor = a.doctor_name || a.doctor || "";
    const canArrive = isToday && ["scheduled","pending","confirmed","rescheduled"].includes(a.workflow_status);
    const isConfirmedCall = a.call_status === "confirmed";
    const callCount = a.call_count || 0;
    const noAnswerCount = a.no_answer_count || 0;
    const isBusy = busy === a.id;
    const hasPendingAction = !!a.pending_action;
    // Specialist assigned by doctor must be called & confirmed too. A NULL/blank status
    // (specialist just assigned) counts as pending — only "confirmed" clears the gate.
    // The specialist may have been assigned on a now-completed visit; fall back to the
    // patient-level pending specialist so it still shows while scheduling the next visit.
    const specAptId = a.specialist_id ? a.id : (a.pending_specialist_apt_id || null);
    const specId = a.specialist_id || a.pending_specialist_id || null;
    const specName = a.specialist_id ? a.specialist_name : (a.pending_specialist_name || a.specialist_name);
    const specStatus = a.specialist_id ? a.specialist_confirmation_status : a.pending_specialist_status;
    const specPhone = a.specialist_id ? (a.specialist_whatsapp || a.specialist_phone) : (a.pending_specialist_whatsapp || a.pending_specialist_phone);
    const hasSpecialist = !!specId;
    const hasPendingSpecialist = hasSpecialist && (specStatus || "pending_call") !== "confirmed";
    // Lab order placed by doctor must be marked "received" in the Lab module before queue.
    const hasPendingLab = (a.pending_lab_orders || 0) > 0;
    const labAssigned = ((a.pending_lab_orders || 0) + (a.lab_received_orders || 0)) > 0;
    const canSendToQueue = canArrive && isConfirmedCall && !hasPendingAction && !hasPendingSpecialist && !hasPendingLab;
    const isQueued = ["arrived", "ready"].includes(a.workflow_status);
    const cancelReason = a.cancel_reason || (a.workflow_status === "cancelled" ? a.latest_call_notes : "");

    // Status-based card colouring
    const isInTreatment = ["in_treatment", "in_progress"].includes(a.workflow_status);
    const isPaymentPending = a.workflow_status === "payment_pending";
    const isDone = ["completed", "done"].includes(a.workflow_status);
    const isClosed = isPaymentPending || isDone; // all buttons disabled except Collect / Reschedule

    const cardBg = isDone ? "#F0FDF4" : isPaymentPending ? "#FFF7ED" : isInTreatment ? "#FFFDF0" : "#fff";
    const cardBorderLeft = isDone ? "6px solid #10B981"
      : isPaymentPending ? "6px solid #F97316"
      : isInTreatment ? "6px solid #F59E0B"
      : hasPendingLab ? "6px solid #3B82F6"
      : hasPendingAction ? "6px solid #F59E0B"
      : hasPendingSpecialist ? "6px solid #8B5CF6"
      : "1px solid #f1f5f9";

    const halfLabel = (tm && tm < "14:00") ? "1st Half • Up to 2 PM" : "2nd Half • After 2 PM";

    return (
      <div
        draggable={!isClosed && !isInTreatment} onDragStart={e => (!isClosed && !isInTreatment) && onDragStart(e, a)}
        style={{
          background: cardBg,
          borderRadius: 24,
          boxShadow: "0 1px 2px rgba(15,23,42,.05), 0 10px 15px -3px rgb(0 0 0 / 0.1)",
          border: `1px solid #f1f5f9`,
          borderLeft: cardBorderLeft,
          padding: 26,
          marginBottom: 14,
          cursor: (isClosed || isInTreatment) ? "default" : "grab",
          opacity: isBusy ? .5 : 1,
          transition: "all .3s cubic-bezier(.4,0,.2,1)",
          animation: isPaymentPending ? "blinkCardPayment 1s ease-in-out infinite"
                   : !isClosed && hasPendingAction ? "blinkCard 1.1s ease-in-out infinite"
                   : !isClosed && hasPendingSpecialist ? "blinkCardSpec 1.3s ease-in-out infinite"
                   : undefined,
        }}
      >
        <div style={{ display: "flex", gap: 24 }}>
          {/* Large time slot */}
          <div style={{ width: 132, flexShrink: 0 }}>
            <div style={{ background: "#ecfdf5", border: "1.5px solid #a7f3d0", borderRadius: 20, padding: "18px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>{tm !== "—" ? tm : "—"}</div>
              <input
                type="time"
                  value={tm === "—" ? "" : tm}
                onChange={e => updateTime(a.id, e.target.value)}
                style={{ fontSize: 36, fontWeight: 800, color: "#0F172A", border: "none", background: "transparent", textAlign: "center", width: "100%", cursor: "pointer", fontFamily: "inherit", padding: 0, marginTop: 4, lineHeight: 1 }}
                title="Edit time"
              />
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, fontWeight: 600 }}>{halfLabel}</div>
              <div style={{ marginTop: 6, display: "inline-block", fontSize: 10, fontWeight: 800, padding: "1px 9px", borderRadius: 999, background: "#059669", color: "#fff" }}>
                #{a.token_number ?? a.token ?? "—"}
              </div>
            </div>
          </div>

          {/* Details (middle) + header right actions like reference */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: "#18181b" }}>{a.patient_name}</span>
                  <TypeBadge type={a.appointment_type === "Emergency" ? "emergency" : (a.patient_type || "followup")} />
                  <HubStatusPill appointment={a} />
                  {(a.booking_source === "whatsapp" || a.source === "whatsapp") && (
                    <span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>📱 via WhatsApp</span>
                  )}
                  {(a.booking_source === "public_site" || a.source === "public_site" || a.booking_source === "website") && (
                    <span style={{ background: "#DBEAFE", color: "#1E40AF", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>🌐 via Website</span>
                  )}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 22, color: "#52525b", fontSize: 14 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Phone size={14} /> {a.phone || "—"}</span>
                  <span>{a.gender?.charAt(0) || "—"} · {a.age || "—"} years</span>
                  {doctor && <span style={{ color: A, fontWeight: 600 }}>Dr. {doctor}</span>}
                </div>

                <div style={{ marginTop: 6, fontSize: 14, color: "#9A3412", fontWeight: 500 }}>{complaint}</div>

                <div style={{ marginTop: 6, fontSize: 13, color: isConfirmedCall ? "#059669" : (callCount > 0 ? "#ef4444" : "#a1a1aa"), display: "flex", alignItems: "center", gap: 5 }}>
                  <Phone size={13} /> {isConfirmedCall ? "Called & Confirmed ✓" : noAnswerCount > 0 ? `Not received ${noAnswerCount} time(s)` : callCount > 0 ? `Calls attempted ${callCount}` : "Not yet called"}
                </div>

                {/* Engagement history — specialist engaged on / lab received (or tentative) — persists after work done */}
                {(a.hist_spec_name || a.hist_lab_work) && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {a.hist_spec_name && (
                      <span style={{ fontSize: 12, color: "#5B21B6", background: "#F5F3FF", borderRadius: 8, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 5, width: "fit-content" }}>
                        🩺 Specialist {a.hist_spec_name} engaged{a.hist_spec_on ? ` on ${shortDate(a.hist_spec_on)}` : ""}
                        {a.hist_spec_status === "confirmed" ? " · confirmed ✓" : " · awaiting confirmation"}
                      </span>
                    )}
                    {a.hist_lab_work && (
                      <span style={{ fontSize: 12, color: "#1E40AF", background: "#EFF6FF", borderRadius: 8, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 5, width: "fit-content" }}>
                        🧪 Lab {a.hist_lab_work} {["received", "fitted", "completed"].includes(a.hist_lab_status)
                          ? `received on ${shortDate(a.hist_lab_received) || "—"} ✓`
                          : `expected by ${shortDate(a.hist_lab_expected) || "TBD"} (tentative)`}
                      </span>
                    )}
                  </div>
                )}
                {!!cancelReason && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Trash2 size={13} /> Cancel reason: {String(cancelReason)}
                  </div>
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {hasPendingAction && (
                    <span style={{ background: "#FEF3C7", color: "#92400E", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800 }}>
                Action needed: {a.pending_action === "change_date" ? `Change date${a.pending_new_date ? ` → ${a.pending_new_date}` : ""}` : `Change time${a.pending_new_time ? ` → ${a.pending_new_time}` : ""}`}
                    </span>
                  )}
                  {hasPendingSpecialist && (
                    <span style={{ background: "#F5F3FF", color: "#6D28D9", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800 }}>
                Specialist: {a.specialist_name || "Assigned"} · {a.specialist_confirmation_status}
                    </span>
                  )}
                  {!!a.latest_call_notes && !hasPendingAction && (
                    <span style={{ background: "#EFF6FF", color: "#1D4ED8", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                      Last note: {String(a.latest_call_notes).slice(0, 40)}
                    </span>
                  )}
                </div>
              </div>

              {/* Right header actions — hidden when visit is closed */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                {isClosed ? (
                  <div style={{ fontSize: 13, fontWeight: 700, color: isDone ? "#059669" : "#F97316", padding: "8px 14px", borderRadius: 12, background: isDone ? "#D1FAE5" : "#FFEDD5" }}>
                    {isDone ? "✓ Visit Done · Payment Collected" : "⏳ Awaiting Payment"}
                  </div>
                ) : isInTreatment ? (
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", padding: "8px 14px", borderRadius: 12, background: "#FEF3C7" }}>
                    🟡 Under Treatment
                  </div>
                ) : isQueued ? (
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#065F46", padding: "8px 14px", borderRadius: 12, background: "#D1FAE5" }}>
                    ✓ Already In Queue
                  </div>
                ) : (
                  <>
                    {/* Gate 1 — Call & Confirm patient: red until confirmed, then green */}
                    <button
                      onClick={() => setCallModalApt(a)}
                      style={{
                        border: "none",
                        background: isConfirmedCall ? "#10b981" : "#EF4444",
                        color: "#fff",
                        padding: "12px 20px", borderRadius: 14, fontWeight: 700, fontSize: 14,
                        display: "flex", alignItems: "center", gap: 6, cursor: "pointer", minWidth: 180, justifyContent: "center"
                      }}
                    >
                      <Phone size={15} /> {isConfirmedCall ? "Call Confirmed ✓" : "Call & Confirm"}
                    </button>

                    {/* Gate 2 — Specialist (if doctor assigned one, even on a prior visit): red until confirmed, then green. */}
                    {hasSpecialist && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button onClick={() => hasPendingSpecialist && setSpecCallApt({ ...a, id: specAptId, specialist_name: specName })}
                          style={{ background: hasPendingSpecialist ? "#EF4444" : "#10b981", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: hasPendingSpecialist ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6, minWidth: 150, justifyContent: "center" }}>
                          <Phone size={14} /> {hasPendingSpecialist
                            ? `Confirm ${specName || "Specialist"}`
                            : `${specName || "Specialist"} ✓`}
                        </button>
                        <button title={`Message ${specName || "specialist"}`}
                          onClick={() => msgSpecialist({ ...a, specialist_name: specName, specialist_whatsapp: a.specialist_id ? a.specialist_whatsapp : a.pending_specialist_whatsapp, specialist_phone: specPhone })}
                          style={{ background: "#fff", color: "#059669", border: "1.5px solid #10b981", padding: "11px 12px", borderRadius: 14, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                          <MessageCircle size={15} /> Msg
                        </button>
                      </div>
                    )}

                    {/* Gate 3 — Lab orders: inline confirmation per pending order */}
                    {labAssigned && !hasPendingLab && (
                      <div style={{ background: "#10b981", color: "#fff", padding: "12px 20px", borderRadius: 14, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6, minWidth: 180, justifyContent: "center" }}>
                        🧪 Lab Received ✓
                      </div>
                    )}
                    {hasPendingLab && (a.pending_lab_details || []).length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                        {(a.pending_lab_details || []).map((lo: any) => (
                          <div key={lo.order_id} style={{
                            background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12,
                            padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap"
                          }}>
                            <div style={{ flex: 1, minWidth: 140 }}>
                              <div style={{ fontWeight: 800, fontSize: 13, color: "#991B1B" }}>
                                🧪 {lo.work_type}{lo.teeth ? ` (${lo.teeth})` : ""}
                              </div>
                              <div style={{ fontSize: 11.5, color: "#7F1D1D", marginTop: 2 }}>
                                {lo.vendor_name} · Expected: {lo.expected_date
                                  ? new Date(lo.expected_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                                  : "TBD"}
                              </div>
                            </div>
                            <input type="date" defaultValue={lo.expected_date || ""}
                              onChange={e => e.target.value && updateLabExpectedDate(lo.order_id, e.target.value)}
                              style={{ border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", width: 130 }}
                              title="Update expected date"
                            />
                            <button onClick={() => confirmLabReceived(lo.order_id, lo.work_type)}
                              disabled={busy === lo.order_id}
                              style={{
                                background: "#EF4444", color: "#fff", border: "none", borderRadius: 10,
                                padding: "8px 14px", fontWeight: 800, fontSize: 12.5, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" as const,
                              }}>
                              {busy === lo.order_id ? "..." : "✓ Received"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {hasPendingLab && !(a.pending_lab_details || []).length && (
                      <button onClick={() => onNavigate ? onNavigate("lab") : show("Open the Lab module to mark the order received")}
                        style={{ background: "#EF4444", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, minWidth: 180, justifyContent: "center" }}>
                        🧪 Lab Order — Confirm Received
                      </button>
                    )}

                    {hasPendingAction && (
                      <button onClick={() => applyPendingAction(a)}
                        style={{ background: "#F59E0B", color: "#fff", border: "none", padding: "12px 22px", borderRadius: 14, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                        Apply Pending Change
                      </button>
                    )}

                    {/* All gates clear → activate queue. Locked button + hint while any gate is red. */}
                    {canSendToQueue ? (
                      <button onClick={() => markArrived(a)} disabled={isBusy}
                        style={{ background: "#059669", color: "#fff", border: "none", padding: "12px 22px", borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 12px #05966944", minWidth: 180, justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }}>
                        {isBusy ? "..." : "✓ Move to Queue"}
                      </button>
                    ) : canArrive ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <div style={{ background: "#E5E7EB", color: "#9CA3AF", padding: "12px 22px", borderRadius: 14, fontWeight: 800, fontSize: 14, minWidth: 180, textAlign: "center" }}>
                          🔒 Move to Queue
                        </div>
                        <div style={{ fontSize: 11, color: "#92400E", background: "#FEF3C7", padding: "5px 10px", borderRadius: 10, maxWidth: 200, textAlign: "center" }}>
                          {hasPendingAction ? "Apply the pending change first"
                            : !isConfirmedCall ? "Call & confirm the patient first"
                            : hasPendingSpecialist ? "Confirm specialist availability first"
                            : hasPendingLab ? "Confirm all lab orders received above"
                            : "Clear all red buttons to unlock"}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>

          {/* Bottom action bar */}
            {isPaymentPending ? (
              // Payment pending: Collect Payment only — no reschedule allowed
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button onClick={() => setPayPat(a)} style={{ flex: 1, padding: "18px 0", background: "#F97316", color: "#fff", borderRadius: 24, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: "pointer", fontSize: 15 }}>
                  💵 Collect Payment — Required Before Reschedule
                </button>
              </div>
            ) : isDone ? (
              // Visit done + payment collected: green confirmation + reschedule from here
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <div style={{ flex: 2, padding: "18px 0", background: "#D1FAE5", color: "#065F46", borderRadius: 24, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}>
                  ✅ Visit Done · Payment Collected
                </div>
                <button onClick={() => setReschedApt(a)} style={{ flex: 1, padding: "18px 0", background: "#f4f4f5", borderRadius: 24, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: "pointer" }}>
                  <Edit3 size={16} /> Reschedule
                </button>
              </div>
            ) : isInTreatment ? (
              // Under treatment: fully locked
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <div style={{ flex: 1, padding: "18px 0", background: "#FEF3C7", color: "#92400E", borderRadius: 24, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}>
                  🟡 Under Treatment — actions locked
                </div>
              </div>
            ) : isQueued ? (
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <div style={{ flex: 1, padding: "18px 0", background: "#ECFDF5", color: "#065F46", borderRadius: 24, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}>
                  Patient is already in queue — actions locked
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button onClick={() => sendWA(a.id)} style={{ flex: 1, padding: "20px 0", background: "#f4f4f5", borderRadius: 24, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: "pointer" }}>
                  <MessageCircle size={16} color="#059669" /> WhatsApp
                </button>
                <button onClick={() => setReschedApt(a)} style={{ flex: 1, padding: "20px 0", background: "#f4f4f5", borderRadius: 24, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: "pointer" }}>
                  <Edit3 size={16} /> Edit
                </button>
                <button onClick={() => setPromptModal({
                  title: `Cancel appointment`,
                  label: `Reason for cancelling ${a.patient_name}`,
                  type: "text",
                  value: a.cancel_reason || "",
                  placeholder: "e.g. Patient requested, clinic closed, double-booked…",
                  submitLabel: "Cancel appointment",
                  danger: true,
                  onSubmit: (reason) => mark(a.id, "cancelled", reason || "Cancelled"),
                })} style={{ flex: 1, padding: "20px 0", background: "#fef2f2", color: "#ef4444", borderRadius: 24, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: "pointer" }}>
                  <Trash2 size={16} /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

// Render.
// Render.
// Render.
  if (view === "payments" || view === "billing") {
    return <PaymentsView queueData={queueData} A={A} show={show} setPayPat={setPayPat} refreshAll={refreshAll} payPat={payPat} />;
  }

  return (
    <div>
      {/* Blink animation for cards awaiting action (pending date/time change or specialist confirmation) */}
      <style>{`
        @keyframes blinkCard {
          0%, 100% { box-shadow: 0 1px 2px rgba(15,23,42,.05), 0 10px 15px -3px rgb(0 0 0 / 0.1); }
          50% { box-shadow: 0 0 0 4px rgba(245,158,11,.55), 0 10px 20px -3px rgba(245,158,11,.45); }
        }
        @keyframes blinkCardSpec {
          0%, 100% { box-shadow: 0 1px 2px rgba(15,23,42,.05), 0 10px 15px -3px rgb(0 0 0 / 0.1); }
          50% { box-shadow: 0 0 0 4px rgba(139,92,246,.55), 0 10px 20px -3px rgba(139,92,246,.45); }
        }
        @keyframes blinkCardPayment {
          0%, 100% { box-shadow: 0 1px 2px rgba(15,23,42,.05), 0 10px 15px -3px rgb(0 0 0 / 0.1); }
          50% { box-shadow: 0 0 0 6px rgba(249,115,22,.65), 0 10px 24px -3px rgba(249,115,22,.55); }
        }
        @keyframes blinkNotifBar {
          0%, 100% { box-shadow: 0 8px 30px rgba(249,115,22,.3); }
          50% { box-shadow: 0 4px 40px rgba(249,115,22,.7), 0 0 0 4px rgba(249,115,22,.25); }
        }
      `}</style>
      {/* Header */}
      {view !== "dashboard" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <div style={{ color: A, fontWeight: 600, letterSpacing: 3, fontSize: 13, textTransform: "uppercase" }}>OVERVIEW</div>
            <div style={{ fontSize: 42, fontWeight: 700, color: INK, marginTop: 4 }}>Appointment Hub</div>
          </div>
          <div style={{ color: MUTE, fontSize: 15 }}>
            Today at a glance · <span style={{ fontWeight: 600, color: INK }}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
        </div>
      )}

      {/* Notification bar */}
      {pendingRequests.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #F97316, #F59E0B)", color: "#fff", borderRadius: R, padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, boxShadow: "0 8px 30px rgba(249,115,22,.3)", cursor: "pointer", animation: "blinkNotifBar 1.5s ease-in-out infinite" }}
          onClick={() => setShowNotifPanel(!showNotifPanel)}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, background: "rgba(255,255,255,.2)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🔔</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{pendingRequests.length} New Booking Request{pendingRequests.length > 1 ? "s" : ""}</div>
              <div style={{ fontSize: 14, opacity: .85 }}>
                {pendingRequests.filter(r => r.source === "public_site").length > 0 && `Website: ${pendingRequests.filter(r => r.source === "public_site").length}`}
                {pendingRequests.filter(r => r.source === "whatsapp").length > 0 && ` · WhatsApp: ${pendingRequests.filter(r => r.source === "whatsapp").length}`}
                 {" — Click to review"}
              </div>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setShowNotifPanel(true); }} style={{ background: "#fff", color: "#EA580C", fontWeight: 600, padding: "14px 28px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: 15, fontFamily: "inherit" }}>
            Review Now →
          </button>
        </div>
      )}

      {/* Expanded notification panel */}
      {showNotifPanel && pendingRequests.length > 0 && (
        <div style={{ background: "#fff", borderRadius: R, padding: 24, marginBottom: 20, boxShadow: SHADOW_LG, border: `1.5px solid #FDE68A` }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#92400E", marginBottom: 14 }}>📋 Pending Booking Requests</div>
          {pendingRequests.map((req: any) => (
            <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderRadius: 16, background: "#FFFBEB", marginBottom: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <b style={{ fontSize: 15 }}>{req.patient_name}</b> <span style={{ fontSize: 13, color: MUTE }}>{req.phone}</span>
                <div style={{ fontSize: 13, color: MUTE, marginTop: 4 }}>
                  {requestService(req)} · Preferred: {req.preferred_date ? new Date(requestPreferredDate(req) + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Any"} {req.preferred_time || ""}
                  {req.branch ? ` · ${req.branch}` : ""}
                  {req.message && !req.service ? <span style={{ display: "block", marginTop: 2, fontSize: 12 }}>{req.message}</span> : null}
                  {req.source && <span style={{ marginLeft: 8, background: "#FDE68A", color: "#92400E", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{req.source === "public_site" ? "Website" : req.source === "whatsapp" ? "WhatsApp" : req.source}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                <button type="button" disabled={pendingBusy === req.id} onClick={() => confirmRequest(req, today)} style={{ ...smBtn("#059669"), opacity: pendingBusy === req.id ? 0.6 : 1 }}>{pendingBusy === req.id ? "…" : "→ Today"}</button>
                <button type="button" disabled={pendingBusy === req.id} onClick={() => confirmRequest(req, tomorrow)} style={{ ...smBtn("#3B82F6"), opacity: pendingBusy === req.id ? 0.6 : 1 }}>→ Tomorrow</button>
                <button type="button" disabled={pendingBusy === req.id} onClick={() => confirmRequest(req, dayAfter)} style={{ ...smBtn("#8B5CF6"), opacity: pendingBusy === req.id ? 0.6 : 1 }}>→ Day After</button>
                <button type="button" disabled={pendingBusy === req.id} onClick={() => confirmRequest(req, requestPreferredDate(req))} style={{ ...smBtn(A), opacity: pendingBusy === req.id ? 0.6 : 1 }}>✓ Confirm Preferred</button>
                <button type="button" disabled={pendingBusy === req.id} onClick={() => rejectRequest(req)} style={{ ...smBtn("#EF4444"), opacity: pendingBusy === req.id ? 0.6 : 1 }}>✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats — clickable KPI tiles (all show today data) */}
      {kpiFilter && (
        <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 16, padding: "10px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1D4ED8" }}>Filtering: {kpiFilter.replace("_", " ")} — showing today only</span>
          <button onClick={() => setKpiFilter(null)} style={{ background: "transparent", border: "none", color: "#1D4ED8", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>✕ Clear filter</button>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 18, marginBottom: 36 }}>
        {[
          { label: "TODAY", v: buckets.today.length, c: "#059669", icon: "📅", onClick: () => { setActiveTab("schedule"); setActiveDay(0); setKpiFilter(null); } },
          { label: "ARRIVED", v: s.arrived ?? 0, c: "#059669", icon: "✓", onClick: () => { setActiveTab("schedule"); setActiveDay(0); setKpiFilter("arrived"); } },
          { label: "IN TREATMENT", v: s.in_treatment ?? 0, c: "#D97706", icon: "🩺", onClick: () => { setActiveTab("schedule"); setActiveDay(0); setKpiFilter("in_treatment"); } },
          { label: "PENDING ₹", v: payPending.length, c: "#7C3AED", icon: "⏳", onClick: () => { setActiveTab("payments"); setKpiFilter(null); } },
          { label: "REVENUE", v: `₹${(s.revenue || 0).toLocaleString()}`, c: "#0284C7", icon: "₹", onClick: null },
          { label: "CALLS PENDING", v: callStats.all.pending, c: "#E11D48", icon: "📞", onClick: () => { setActiveTab("schedule"); setActiveDay(0); setKpiFilter("calls_pending"); } },
          ...(pendingRequests.length > 0 ? [{ label: "WEB REQUESTS", v: pendingRequests.length, c: "#EA580C", icon: "🌐", onClick: () => setShowNotifPanel(true) }] : []),
        ].map(st => (
          <div key={st.label}
            onClick={st.onClick || undefined}
            style={{ background: "#fff", borderRadius: R, padding: "22px 24px", boxShadow: SHADOW, border: `1px solid ${LINE}`, transition: "transform .2s, box-shadow .2s", cursor: st.onClick ? "pointer" : "default" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; if (st.onClick) (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.12)"); }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = SHADOW; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: st.c, fontSize: 12, fontWeight: 600, letterSpacing: 1.5 }}>{st.label}{st.onClick ? " ↗" : ""}</div>
                <div style={{ fontSize: 38, fontWeight: 700, color: INK, marginTop: 6, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{st.v}</div>
              </div>
              <span style={{ fontSize: 42, opacity: .12 }}>{st.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
        {/* Tab switcher */}
        <div style={{ display: "flex", background: "#fff", borderRadius: R, padding: 4, boxShadow: SHADOW, border: `1px solid ${LINE}` }}>
          {[
            { id: "schedule", label: "Schedule", n: activeApts.length },
            { id: "payments", label: "Payments", n: payPending.length },
          ].map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); if (t.id !== "schedule") setKpiFilter(null); }}
              style={{ padding: "12px 28px", borderRadius: 20, fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", fontFamily: "inherit",
                background: activeTab === t.id ? A : "transparent", color: activeTab === t.id ? "#fff" : MUTE, transition: "all .15s" }}>
              {t.label} {t.n > 0 && <span style={{ opacity: .75 }}>{t.n}</span>}
            </button>
          ))}
        </div>

        {/* Day pills */}
        {activeTab === "schedule" && (
          <div style={{ display: "flex", background: "#fff", borderRadius: R, padding: 4, boxShadow: SHADOW, border: `1px solid ${LINE}` }}>
            {[
              { i: 0, label: "Today", n: buckets.today.length },
              { i: 1, label: "Tomorrow", n: buckets.tomorrow.length },
              { i: 2, label: "Day After", n: buckets.day_after.length },
              { i: 3, label: "Future + Unscheduled", n: buckets.future.length + buckets.unscheduled.length },
            ].map(d => (
              <button key={d.i} onClick={() => setActiveDay(d.i)}
                style={{ padding: "12px 24px", borderRadius: 20, fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: activeDay === d.i ? A : "transparent", color: activeDay === d.i ? "#fff" : MUTE, transition: "all .15s" }}>
                {d.label} {d.n > 0 && <span style={{ opacity: .7, fontSize: 12 }}>({d.n})</span>}
              </button>
            ))}
          </div>
        )}

        {/* Walk-in */}
        <button onClick={() => setShowAdd(true)}
          style={{ ...solidBtn(A), padding: "16px 28px", boxShadow: `0 6px 20px ${A}33` }}>
          <Plus size={18} /> Walk-in / Book
        </button>
      </div>

      {/* Search bar */}
      {activeTab === "schedule" && (
        <div style={{ position: "relative", marginBottom: 20 }}>
          <Search size={18} style={{ position: "absolute", left: 18, top: 16, color: "#A1A1AA" }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search name, phone, complaint..."
            style={{ width: "100%", background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: R, padding: "14px 18px 14px 48px", fontSize: 15, fontWeight: 500, fontFamily: "inherit", boxShadow: SHADOW }} />
          {searchTerm && <button onClick={() => setSearchTerm("")} style={{ position: "absolute", right: 16, top: 14, background: "transparent", border: "none", color: MUTE, cursor: "pointer" }}><X size={18} /></button>}
        </div>
      )}

      {/* Schedule tab */}
      {activeTab === "schedule" && activeDay < 3 && (
        <div onDragOver={e => onDragOver(e, currentDate)} onDragLeave={onDragLeave} onDrop={e => onDrop(e, currentDate)}>
          {/* Section header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: INK, margin: 0 }}>
              {currentLabel} — <span style={{ color: A }}>{currentBucket.length} patient{currentBucket.length !== 1 ? "s" : ""}</span>
            </h2>
            {activeDay === 0 && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={sendListToDoctor} style={{ ...solidBtn(A), padding: "12px 24px" }}><Check size={16} /> Confirm & Send to Doctor</button>
                <button onClick={bulkWA} style={{ ...ghostBtn(A), padding: "12px 24px" }}>Bulk WA (Patients)</button>
              </div>
            )}
          </div>

          {/* Drag highlight */}
          {dragOverDate === currentDate && <div style={{ border: `2px dashed ${A}`, borderRadius: R, padding: 20, textAlign: "center", color: A, fontWeight: 600, marginBottom: 14 }}>Drop here to move to {currentLabel}</div>}

          {/* 1st Half (up to 2 PM) */}
          {firstHalf.length > 0 ? (
            firstHalf.map(a => <PatientCard key={a.id} a={a} dateCtx={currentLabel} />)
          ) : (
            <div style={{ background: "#fff", border: "1.5px solid #bae6fd", borderRadius: 20, padding: "32px 24px", textAlign: "center", marginBottom: 12 }}>
              <div style={{ color: "#0369a1", fontWeight: 600 }}>1st Half (up to 2 PM)</div>
              <div style={{ color: "#64748b", fontSize: 18, marginTop: 6 }}>No appointments scheduled</div>
              <button
                onClick={() => { setAddPrefillDate(currentDate || todayStr()); setShowAdd(true); }}
                style={{ marginTop: 14, background: "#18181b", color: "#fff", border: "none", padding: "14px 28px", borderRadius: 20, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <Plus size={16} /> Add New Appointment
              </button>
            </div>
          )}

          {/* 2nd Half (from 2 PM) */}
          {secondHalf.length > 0 && (
            <div style={{ background: "#fff", border: `1.5px solid #fde68a`, borderRadius: R, padding: "10px 18px", textAlign: "center", margin: "12px 0 8px" }}>
              <span style={{ color: "#b45309", fontWeight: 600, fontSize: 14 }}>2nd Half (from 2 PM onwards)</span>
            </div>
          )}
          {secondHalf.length > 0 ? (
            secondHalf.map(a => <PatientCard key={a.id} a={a} dateCtx={currentLabel} />)
          ) : (
            <div style={{ background: "#fff", border: "1.5px solid #fde68a", borderRadius: 20, padding: "32px 24px", textAlign: "center", marginBottom: 12 }}>
              <div style={{ color: "#b45309", fontWeight: 600 }}>2nd Half (from 2 PM onwards)</div>
              <div style={{ color: "#64748b", fontSize: 18, marginTop: 6 }}>No appointments scheduled</div>
              <button
                onClick={() => { setAddPrefillDate(currentDate || todayStr()); setShowAdd(true); }}
                style={{ marginTop: 14, background: "#18181b", color: "#fff", border: "none", padding: "14px 28px", borderRadius: 20, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <Plus size={16} /> Add New Appointment
              </button>
            </div>
          )}

          {/* Empty state for whole day */}
          {currentBucket.length === 0 && <Empty icon="🌤️" text={`No appointments for ${currentLabel.toLowerCase()}`} sub="Use the Add button above or Walk-in / Book" />}
        </div>
      )}

      {/* All future stacked date blocks */}
      {activeTab === "schedule" && activeDay === 3 && (
        <div>
          {[
            { key: "today", label: "Today", apts: buckets.today, date: today },
            { key: "tomorrow", label: "Tomorrow", apts: buckets.tomorrow, date: tomorrow },
            { key: "day_after", label: "Day After", apts: buckets.day_after, date: dayAfter },
          ].filter(b => b.apts.length > 0).map(b => (
            <div key={b.key} style={{ marginBottom: 28 }}
              onDragOver={e => onDragOver(e, b.date)} onDragLeave={onDragLeave} onDrop={e => onDrop(e, b.date)}>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: INK, marginBottom: 12 }}>{b.label} — <span style={{ color: A }}>{b.apts.length}</span></h3>
              {dragOverDate === b.date && <div style={{ border: `2px dashed ${A}`, borderRadius: R, padding: 16, textAlign: "center", color: A, fontWeight: 600, marginBottom: 10 }}>Drop → {b.label}</div>}
              {b.apts.map(a => <PatientCard key={a.id} a={a} dateCtx={b.key} />)}
            </div>
          ))}
          {futureGroups.this_month.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: INK, marginBottom: 12 }}>This Month — <span style={{ color: A }}>{futureGroups.this_month.length}</span></h3>
              {futureGroups.this_month.map(a => <PatientCard key={a.id} a={a} dateCtx="this_month" />)}
            </div>
          )}
          {futureGroups.next_month.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: INK, marginBottom: 12 }}>Next Month — <span style={{ color: A }}>{futureGroups.next_month.length}</span></h3>
              {futureGroups.next_month.map(a => <PatientCard key={a.id} a={a} dateCtx="next_month" />)}
            </div>
          )}
          {futureGroups.later.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: INK, marginBottom: 12 }}>Later — <span style={{ color: A }}>{futureGroups.later.length}</span></h3>
              {futureGroups.later.map(a => <PatientCard key={a.id} a={a} dateCtx="later" />)}
            </div>
          )}
          {buckets.unscheduled.length > 0 && (
            <div style={{ marginTop: 10 }} onDragOver={e => onDragOver(e, "unscheduled")} onDragLeave={onDragLeave} onDrop={e => onDrop(e, "unscheduled")}>
              <div style={{ background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: R, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: INK, marginBottom: 14 }}>📌 Unscheduled ({buckets.unscheduled.length})</div>
                {buckets.unscheduled.map(a => <PatientCard key={a.id} a={a} dateCtx="unscheduled" />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === "payments" && <PaymentsInline queueData={queueData} A={A} show={show} setPayPat={setPayPat} payPending={payPending} />}


      {/* Modals */}
      {promptModal && <PromptModal config={promptModal} accent={A} onClose={() => setPromptModal(null)} />}
      {showAdd && <AddPatientModal clinicId={clinicId} accent={A} show={show} onClose={() => { setShowAdd(false); setAddPrefillDate(null); }} onAdded={refreshAll} defaultDate={addPrefillDate || undefined} />}
      {reschedApt && <RescheduleModal apt={reschedApt} accent={A} show={show} onClose={() => setReschedApt(null)} onDone={() => { setReschedApt(null); refreshAll(); }} />}
      {payPat && <PaymentModal apt={payPat} accent={A} show={show} onClose={() => setPayPat(null)} onDone={() => { setPayPat(null); refreshAll(); }} />}
      {callModalApt && (
        <CallConfirmModal
          appointmentId={callModalApt.id}
          patientName={callModalApt.patient_name}
          currentDate={callModalApt.scheduled_date}
          currentTime={callModalApt.scheduled_time}
          onClose={() => setCallModalApt(null)}
          onDone={(result) => {
            const msgMap: any = {
              confirm: "Patient confirmed. You can now send to queue.",
              refused: "Patient refused appointment",
              change_date: "Date change requested",
              change_time: "Time change requested",
              no_answer: "Call marked as not received",
              call_back_later: "Call back later saved",
            };
            show(msgMap[result.action] || "Call result saved");
            refreshAll();
          }}
        />
      )}
      {specCallApt && (
        <CallConfirmModal
          appointmentId={specCallApt.id}
          patientName={specCallApt.patient_name}
          specialistName={specCallApt.specialist_name}
          mode="specialist"
          onClose={() => setSpecCallApt(null)}
          onDone={(result) => {
            show(result.action === "confirmed" ? "Specialist confirmed" : "Specialist declined");
            refreshAll();
          }}
        />
      )}

      <style>{`.hub-card:hover{transform:translateY(-3px);box-shadow:${SHADOW_LG}!important}`}</style>
    </div>
  );
}

// Payments inline.
function PaymentsInline({ queueData, A, show, setPayPat, payPending }: any) {
  const collectedToday = (queueData?.segments?.collected || []).reduce((s: number, p: any) => s + (p.amount_collected || 0), 0);
  const totalToCollect = payPending.reduce((s: number, p: any) => s + Math.max((p.amount_payable || 0) - (p.amount_collected || 0), 0), 0);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
        <div style={{ background: "linear-gradient(135deg, #F97316, #EA580C)", color: "#fff", padding: 28, borderRadius: R, boxShadow: "0 8px 30px rgba(249,115,22,.25)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: .85, letterSpacing: 1.5 }}>TO COLLECT NOW</div>
          <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>₹{totalToCollect.toLocaleString()}</div>
          <div style={{ fontSize: 14, opacity: .9, marginTop: 4 }}>{payPending.length} patient{payPending.length !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #059669, #047857)", color: "#fff", padding: 28, borderRadius: R, boxShadow: "0 8px 30px rgba(5,150,105,.25)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: .85, letterSpacing: 1.5 }}>✓ COLLECTED TODAY</div>
          <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8 }}>₹{collectedToday.toLocaleString()}</div>
        </div>
      </div>
      {payPending.length === 0 && collectedToday === 0 && <Empty icon="✨" text="Nothing pending" sub="Patients appear here after treatment" />}
      {[...payPending].sort((a: any, b: any) => ((b.amount_payable||0)-(b.amount_collected||0))-((a.amount_payable||0)-(a.amount_collected||0))).map((p: any) => {
        const balance = (p.amount_payable||0)-(p.amount_collected||0);
        return (
          <div key={p.apt_id} style={{ background: "#fff", borderRadius: R, padding: 24, marginBottom: 12, boxShadow: SHADOW, border: `1px solid ${LINE}`, borderLeft: "5px solid #F97316", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 16 }}>{p.patient_name}</b> <TypeBadge type={p.patient_type || "followup"} />
              <div style={{ fontSize: 13, color: MUTE, marginTop: 4 }}>{p.phone} · {p.appointment_type}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#F97316" }}>₹{balance.toLocaleString()}</div>
              {(p.amount_collected||0) > 0 && <div style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>₹{p.amount_collected.toLocaleString()} paid</div>}
            </div>
            <button onClick={() => setPayPat(p)} style={{ ...solidBtn("#F97316"), padding: "14px 24px", fontSize: 15 }}>💵 Collect</button>
          </div>
        );
      })}
    </div>
  );
}

function PaymentsView({ queueData, A, show, setPayPat, refreshAll, payPat }: any) {
  const payPending = queueData?.segments?.payment_pending || [];
  return <div><PaymentsInline queueData={queueData} A={A} show={show} setPayPat={setPayPat} payPending={payPending} />
      {payPat && <PaymentModal apt={payPat} accent={A} show={show} onClose={() => setPayPat(null)} onDone={() => { setPayPat(null); refreshAll(); }} />}
  </div>;
}

// Payment modal.
function PaymentModal({ apt, accent, show, onClose, onDone }: any) {
  const balance = Math.max((apt.amount_payable || 0) - (apt.amount_collected || 0), 0);
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [cardAmount, setCardAmount] = useState(String(balance));
  const [upiTxnId, setUpiTxnId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const total = (parseFloat(cashAmount || "0") || 0) + (parseFloat(upiAmount || "0") || 0) + (parseFloat(cardAmount || "0") || 0);
  const collect = async () => {
    const upi = parseFloat(upiAmount || "0") || 0;
    if (!apt.session_id && !apt.apt_id) { show("No active treatment session found for this payment"); return; }
    if (balance > 0 && (!total || total <= 0)) { show("Enter at least one payment amount"); return; }
    if (upi > 0 && !upiTxnId.trim()) { show("UPI reference is required when UPI amount is entered"); return; }
    setSaving(true);
    try {
      await api.hubCollectPayment({
        session_id: apt.session_id || undefined,
        appointment_id: apt.apt_id || undefined,
        cash_amount: parseFloat(cashAmount || "0") || 0,
        upi_amount: upi,
        card_amount: parseFloat(cardAmount || "0") || 0,
        upi_txn_id: upiTxnId.trim() || undefined,
        notes: notes || undefined,
      });
      show(total > 0 ? `✓ ₹${total.toLocaleString()} collected` : "✓ Zero-payment visit completed");
      onDone();
    }
    catch (e: any) { show("Error: "+e.message); } finally { setSaving(false); } };
  return <div style={mBg} onClick={onClose}><div style={{ ...mBox, width: 440, padding: 32 }} onClick={e => e.stopPropagation()}>
    <h3 style={{ margin: "0 0 18px", color: INK, fontSize: 20, fontWeight: 700 }}>💵 Collect from {apt.patient_name}</h3>
    <div style={{ fontSize: 13, color: MUTE, marginBottom: 14 }}>Balance due: <b>₹{balance.toLocaleString()}</b></div>
    <label style={lbl}>Cash (₹)</label><input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} style={inp} autoFocus />
    <label style={lbl}>UPI (₹)</label><input type="number" value={upiAmount} onChange={e => setUpiAmount(e.target.value)} style={inp} />
    <label style={lbl}>UPI Reference {parseFloat(upiAmount || "0") > 0 ? "(required)" : "(optional)"}</label><input value={upiTxnId} onChange={e => setUpiTxnId(e.target.value)} style={inp} placeholder="UPI txn id" />
    <label style={lbl}>Card (₹)</label><input type="number" value={cardAmount} onChange={e => setCardAmount(e.target.value)} style={inp} />
    <label style={lbl}>Notes</label><input value={notes} onChange={e => setNotes(e.target.value)} style={inp} placeholder="Optional remarks" />
    <div style={{ fontSize: 13, color: total > balance ? "#DC2626" : "#059669", marginBottom: 18 }}>
      Total to collect: <b>₹{total.toLocaleString()}</b>{total > balance ? " · exceeds current balance" : ""}
    </div>
    <button onClick={collect} disabled={saving} style={{ ...solidBtn(accent), width: "100%", padding: 16, fontSize: 16, justifyContent: "center" }}>{saving ? "..." : total > 0 ? `Collect ₹${total.toLocaleString()}` : "Confirm Zero Collection"}</button>
  </div></div>;
}

// Reschedule modal.
function RescheduleModal({ apt, accent, show, onClose, onDone }: any) {
  const [date, setDate] = useState(apt.scheduled_date || apt.requested_date || todayStr());
  const [time, setTime] = useState(apt.scheduled_time || apt.requested_time || "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); try { await api.hubReschedule(apt.id, date, { time: time||undefined, reason }); show(`✓ ${apt.patient_name} → ${dateLabelShort(date)} ${time}`); onDone(); }
    catch (e: any) { show("Error: "+e.message); } finally { setSaving(false); } };
  return <div style={mBg} onClick={onClose}><div style={{ ...mBox, width: 460, padding: 32 }} onClick={e => e.stopPropagation()}>
    <h3 style={{ margin: "0 0 18px", color: INK, fontSize: 20, fontWeight: 700 }}>📅 Reschedule — {apt.patient_name}</h3>
    <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
      <button onClick={() => setDate(todayStr())} style={chip(date===todayStr(),"#059669")}>Today</button>
      <button onClick={() => setDate(tomorrowStr())} style={chip(date===tomorrowStr(),"#3B82F6")}>Tomorrow</button>
      <button onClick={() => setDate(dayAfterStr())} style={chip(date===dayAfterStr(),"#8B5CF6")}>Day After</button>
    </div>
    <label style={lbl}>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
    <label style={lbl}>Time</label><input type="time" value={time} onChange={e => setTime(e.target.value)} style={inp} />
    <label style={lbl}>Reason (optional)</label><input value={reason} onChange={e => setReason(e.target.value)} style={inp} placeholder="Patient requested..." />
    <button onClick={save} disabled={saving} style={{ ...solidBtn(accent), width: "100%", padding: 16, fontSize: 15, marginTop: 14, justifyContent: "center" }}>{saving ? "..." : `✓ Move to ${dateLabelShort(date)}`}</button>
  </div></div>;
}

// Add patient modal.
export function AddPatientModal({ clinicId, accent, show, onClose, onAdded, defaultDate }: any) {
  const A = accent;
  const [isDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 768 : true);
  const [step, setStep] = useState<"phone"|"exists"|"details">("phone");
  const [phone, setPhone] = useState(""); const [matches, setMatches] = useState<any[]>([]);
  const [existingPatient, setExistingPatient] = useState<any>(null);
  const [form, setForm] = useState({ name: "", age: "", gender: "" });
  const [aptType, setAptType] = useState("Consultation"); const [aptTypes, setAptTypes] = useState<any[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [ills, setIlls] = useState<string[]>([]);
  const [complaints, setComplaints] = useState<string[]>([]); const [commonComplaints, setCommonComplaints] = useState<any[]>([]);
  const [customComplaint, setCustomComplaint] = useState(""); const [customType, setCustomType] = useState("");
  const [saving, setSaving] = useState(false); const [checking, setChecking] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [liveSearching, setLiveSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<any>(null);

  const effectiveDate = defaultDate || todayStr();

  useEffect(() => { if (searchTimer.current) clearTimeout(searchTimer.current); const q = searchQ.trim();
    if (q.length < 2) { setLiveMatches([]); setShowDropdown(false); return; }
    searchTimer.current = setTimeout(async () => { setLiveSearching(true);
      try { const r = await api.searchPatients(q); setLiveMatches(Array.isArray(r)?r.slice(0,8):[]); setShowDropdown(true); } catch { setLiveMatches([]); } finally { setLiveSearching(false); }
    }, 250); return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQ]);
  const isPhoneLike = (s: string) => { const c = s.replace(/\D/g,""); return c.length >= 4 && c.length / s.length > 0.5; };
  const pickLiveMatch = (m: any) => { setShowDropdown(false); setPhone(m.phone||""); continueExisting({ id: m.id, name: m.name, phone: m.phone, age: m.age, gender: m.gender, total_visits: m.total_visits||0, existing_illnesses: m.existing_illnesses||[], last_visit: null, last_treatment: null }); };

  useEffect(() => { api.hubConditions().catch(()=>{}); api.hubComplaints().then(setCommonComplaints).catch(()=>{});
    api.hubAppointmentTypes().then(setAptTypes).catch(() => setAptTypes([{name:"Consultation"},{name:"Tooth Pain"},{name:"Cleaning"},{name:"RCT"}])); }, []);

  const checkPhone = async () => { if (!phone || phone.replace(/\D/g,"").length < 6) { show("Enter valid number"); return; } setChecking(true);
    try { const d = await api.hubCheckPhone(phone); if (d.exists) { setMatches(d.matches); setStep("exists"); } else setStep("details"); }
    catch (e: any) { show("Error: "+e.message); } finally { setChecking(false); } };
  const continueExisting = (m: any) => { setExistingPatient(m); setPhone(m.phone||""); setIlls(m.existing_illnesses||[]); setForm({ name: m.name, age: m.age?String(m.age):"", gender: m.gender||"" }); setStep("details"); };
  const submit = async () => { if (!existingPatient && !form.name.trim()) { show("Enter patient name"); return; } setSaving(true);
    try { let pid = existingPatient?.id;
      if (!pid) { const pat = await api.hubAddPatient({ name: form.name.trim(), phone, age: parseInt(form.age)||null, gender: form.gender||null, existing_illnesses: ills, clinic_id: clinicId }); pid = pat.patient_id; }
      else if (ills.length) { await api.hubUpdateIllnesses(pid, ills).catch(()=>{}); }
      const finalType = aptType === "Other" && customType.trim() ? customType.trim() : aptType;
      await api.hubBook({ patient_id: pid, clinic_id: clinicId, appointment_type: finalType, chief_complaints: complaints, emergency: isEmergency, phone_number: phone, date: effectiveDate });
      show(`✓ ${existingPatient?.name || form.name} added for ${dateLabelShort(effectiveDate)}`); onAdded();
    } catch (e: any) { show("Error: "+e.message); } finally { setSaving(false); } };

  const targetLabel = defaultDate ? dateLabelShort(defaultDate) : null;
  return <div style={mBg} onClick={onClose}><div className="animate-slide" style={{ ...mBox, width: isDesktop?780:520, padding: isDesktop?36:28 }} onClick={e => e.stopPropagation()}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <h3 style={{ margin: 0, color: INK, fontSize: 22, fontWeight: 700 }}>＋ Walk-in / Appointment{targetLabel ? ` for ${targetLabel}` : ""}</h3>
      <button onClick={onClose} style={iconBtn("#A1A1AA")}>×</button>
    </div>
    {targetLabel && <div style={{ fontSize: 13, color: "#0369a1", marginBottom: 12 }}>Adding to {targetLabel} (from half slot)</div>}

    {step === "phone" && <>
      <label style={lbl}>Search by Name or Mobile Number</label>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input autoFocus value={searchQ} onChange={e => { setSearchQ(e.target.value); if (isPhoneLike(e.target.value)) setPhone(e.target.value); }}
            onFocus={() => { if (liveMatches.length > 0) setShowDropdown(true); }} onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Type name or phone..." style={{ ...inp, flex: 1, fontSize: 16 }}
            onKeyDown={e => { if (e.key==="Enter") { if (liveMatches.length===1) pickLiveMatch(liveMatches[0]); else if (isPhoneLike(searchQ)) { setPhone(searchQ); checkPhone(); } } }} />
          <button onClick={() => { if (isPhoneLike(searchQ)) { setPhone(searchQ.replace(/\s/g,"")); checkPhone(); } else if (searchQ.trim()) { setForm(f=>({...f,name:searchQ.trim()})); setStep("details"); } else show("Type a name or number"); }}
            disabled={checking} style={{ ...solidBtn(A), padding: "0 28px" }}>{checking ? "..." : "Next →"}</button>
        </div>
        {showDropdown && (liveMatches.length > 0 || liveSearching) && (
          <div style={{ position: "absolute", top: "calc(100%+4px)", left: 0, right: 0, background: "#fff", border: `2px solid ${A}`, borderRadius: 18, boxShadow: SHADOW_LG, maxHeight: 300, overflowY: "auto", overscrollBehaviorY: "contain", scrollbarGutter: "stable", zIndex: 30, padding: 8 }}>
            {liveSearching && <div style={{ padding: "12px 16px", fontSize: 14, color: MUTE }}>🔍 Searching...</div>}
            {!liveSearching && liveMatches.length === 0 && <div style={{ padding: "12px 16px", fontSize: 14, color: MUTE }}>No match. Press <b>Next →</b></div>}
            {liveMatches.map((m: any) => <button key={m.id} onMouseDown={e => e.preventDefault()} onClick={() => pickLiveMatch(m)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", border: "none", borderRadius: 12, background: "transparent", cursor: "pointer", fontFamily: "inherit", borderBottom: `1px solid ${SOFT}` }}
              onMouseEnter={e => (e.currentTarget.style.background = `${A}08`)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <b style={{ fontSize: 15 }}>{m.name}</b> {m.age && <span style={{ fontSize: 13, color: MUTE }}>· {m.age}y</span>} <span style={{ fontSize: 13, color: MUTE }}>📱 {m.phone}</span>
            </button>)}
          </div>
        )}
      </div>
    </>}

    {step === "exists" && <>
      <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", padding: 16, borderRadius: 16, marginBottom: 14 }}>
        <b style={{ color: "#92400E", fontSize: 15 }}>⚠ Patient Already Exists</b>
        <div style={{ fontSize: 13, color: "#92400E", marginTop: 4 }}>{matches.length} record(s) found.</div>
      </div>
      {matches.map(m => <button key={m.id} onClick={() => continueExisting(m)} style={{ display: "block", width: "100%", textAlign: "left", padding: 18, marginBottom: 10, border: `1.5px solid ${LINE}`, borderRadius: 18, background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
        <b style={{ fontSize: 16 }}>{m.name}</b> <BookingStagePill stage={m.booking_stage} />
        <div style={{ fontSize: 13, color: MUTE, marginTop: 6 }}>{m.age ? `${m.age}y · ` : ""}{m.total_visits} visit(s)</div>
      </button>)}
      <button onClick={() => { setExistingPatient(null); setStep("details"); }} style={{ ...solidBtn("#52525B"), width: "100%", marginTop: 8, padding: 16, justifyContent: "center" }}>＋ Create New Patient</button>
    </>}

    {step === "details" && <>
      {existingPatient && <div style={{ background: "#ECFDF5", border: `1.5px solid ${A}44`, borderRadius: 16, padding: "12px 18px", marginBottom: 14 }}>
        <b style={{ color: A }}>{existingPatient.name}</b> <span style={{ fontSize: 13, color: MUTE }}>· {existingPatient.total_visits} visit(s)</span>
      </div>}
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: isDesktop ? 28 : 0 }}>
        <div>
          {!existingPatient && <>
            <label style={lbl}>Full Name *</label><input autoFocus value={form.name} onChange={e => setForm({...form,name:e.target.value})} style={inp} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>Age</label><input type="number" value={form.age} onChange={e => setForm({...form,age:e.target.value})} style={inp} /></div>
              <div><label style={lbl}>Gender</label><select value={form.gender} onChange={e => setForm({...form,gender:e.target.value})} style={inp}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></div>
            </div>
          </>}
          <label style={lbl}>Phone</label><input value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d+\-\s]/g,""))} style={inp} inputMode="tel" />
          <label style={lbl}>Appointment Type</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {aptTypes.map((t: any) => <button key={t.name} onClick={() => setAptType(t.name)} style={chip(aptType===t.name,A)}>{t.name}</button>)}
          </div>
          {aptType === "Other" && <input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="Custom type" style={{...inp,marginTop:4}} />}
          <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" checked={isEmergency} onChange={e => setIsEmergency(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#EF4444" }} />
            <span style={{ color: "#B91C1C" }}>🔴 Emergency</span>
          </label>
        </div>
        <div>
          <label style={{ ...lbl, marginTop: isDesktop ? 0 : 14 }}>Chief Complaints</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {complaints.map(c => <Chip key={c} text={c} color="#1E40AF" bg="#DBEAFE" onX={() => setComplaints(complaints.filter(x => x!==c))} />)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
            {commonComplaints.filter((c: any) => !complaints.includes(c.name)).slice(0,8).map((c: any) => <button key={c.id} onClick={() => setComplaints([...complaints,c.name])} style={chipGhost("#3B82F6")}>+ {c.name}</button>)}
          </div>
          <input value={customComplaint} onChange={e => setCustomComplaint(e.target.value)} placeholder="Custom complaint + Enter"
            onKeyDown={e => { if (e.key==="Enter" && customComplaint.trim()) { const v = customComplaint.trim(); api.hubAddComplaint(v).then(() => api.hubComplaints().then(setCommonComplaints)).catch(()=>{}); setComplaints([...complaints,v]); setCustomComplaint(""); } }}
            style={{ ...inp, fontSize: 14 }} />
          <label style={{ ...lbl, marginTop: 10 }}>Pre-existing Conditions</label>
          <MedicalConditionsPicker value={ills} onChange={setIlls} accent={A} />
        </div>
      </div>
      <button onClick={submit} disabled={saving}
        style={{ ...solidBtn(A), width: "100%", padding: 18, fontSize: 17, marginTop: 20, justifyContent: "center", boxShadow: `0 8px 30px ${A}33` }}>
        {saving ? "Saving..." : `✓ Add ${existingPatient?.name || form.name || "Patient"} to Today's Queue`}
      </button>
    </>}
  </div></div>;
}


