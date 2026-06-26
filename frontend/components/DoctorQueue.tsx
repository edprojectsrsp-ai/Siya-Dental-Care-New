"use client";
// ╔══════════════════════════════════════════════════════════════╗
// ║  DOCTOR QUEUE — "Doctor manages patients, not appointments"   ║
// ║  §1 Expected Today (info) · §2 Waiting (Start Treatment)      ║
// ║  §3 Payment Pending · §4 Payment Collected + counters         ║
// ╚══════════════════════════════════════════════════════════════╝
import { useState, useEffect, useCallback } from "react";
import * as api from "@/lib/api";
import { TypeBadge, PT } from "@/components/AppointmentHub";
import { Clock, User, Play, AlertCircle, CheckCircle, DollarSign, Undo2 } from "lucide-react";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";

function waitLabel(mins: number | null) {
  if (mins == null) return "";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function waitColor(mins: number | null) {
  if (mins == null) return MUTE;
  if (mins >= 45) return "#EF4444";
  if (mins >= 20) return "#F59E0B";
  return "#10B981";
}

export function DoctorQueue({ clinicId, staff, accent = "#0E7C7B", show, onStartTreatment }:
  { clinicId: string; staff: any; accent?: string; show: (m: string) => void;
    onStartTreatment: (p: any, sessionId: string) => void }) {

  const A = accent;
  const [q, setQ] = useState<any>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try { setQ(await api.hubQueue(clinicId)); }
    catch (e: any) { show("Error loading queue: " + e.message); }
  }, [clinicId, show]);
  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [load]);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 30000); return () => clearInterval(iv); }, []); // re-render waiting timers

  const isSpec = staff?.role === "specialist";
  // When specialist is logged in, filter queue to only their assigned patients
  const specFilter = (items: any[]) => {
    if (!isSpec || !staff?.staff_id) return items;
    return items.filter((p: any) => p.specialist_id === staff.staff_id);
  };
  const seg = (() => {
    const raw = q?.segments || {};
    if (!isSpec) return raw;
    return {
      expected: specFilter(raw.expected || []),
      waiting: specFilter(raw.waiting || []),
      in_treatment: specFilter(raw.in_treatment || []),
      payment_pending: specFilter(raw.payment_pending || []),
      collected: specFilter(raw.collected || []),
    };
  })();
  const counts = isSpec ? {
    expected: seg.expected?.length || 0,
    waiting: seg.waiting?.length || 0,
    in_treatment: seg.in_treatment?.length || 0,
    payment_pending: seg.payment_pending?.length || 0,
    collected: seg.collected?.length || 0,
  } : (q?.counts || {});

  // live waiting minutes from arrived_at so the timer ticks between polls
  const liveWait = (p: any) => {
    if (!p.arrived_at) return p.waiting_minutes ?? null;
    return Math.max(0, Math.floor((Date.now() - new Date(p.arrived_at).getTime()) / 60000));
  };

  const startTreatment = async (p: any) => {
    setBusy(p.apt_id);
    try {
      const sess = await api.hubStartSession({ patient_id: p.patient_id, doctor_id: staff?.staff_id, clinic_id: clinicId, appointment_id: p.apt_id });
      await api.hubMarkStatus(p.apt_id, "in_treatment");
      show(`🩺 Treatment started — ${p.patient_name}`);
      load();
      onStartTreatment(p, sess.session_id);
    } catch (e: any) { show("Error: " + e.message); } finally { setBusy(""); }
  };

  const returnToToday = async (p: any) => {
    setBusy(`return:${p.apt_id}`);
    try {
      await api.hubReturnToToday(p.apt_id);
      show(`${p.patient_name} moved back to Today's appointments`);
      load();
    } catch (e: any) {
      show("Error: " + e.message);
    } finally {
      setBusy("");
    }
  };

  // Simple search for non-tech users — filters name + complaints
  const filteredWaiting = (seg.waiting || []).filter((p: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (p.patient_name || "").toLowerCase().includes(q) ||
           (p.chief_complaints || []).join(" ").toLowerCase().includes(q) ||
           (p.appointment_type || "").toLowerCase().includes(q);
  });

  // ── Counters (spec: Waiting / Completed / Pay Pending / Pay Collected / Revenue)
  const COUNTERS = [
    { icon: "⏳", label: "Waiting", v: counts.waiting ?? 0, c: A },
    { icon: "🩺", label: "In Treatment", v: counts.in_treatment ?? 0, c: "#8B5CF6" },
    { icon: "✅", label: "Completed", v: (counts.collected ?? 0) + (counts.payment_pending ?? 0), c: "#10B981" },
    { icon: "💰", label: "Payment Pending", v: counts.payment_pending ?? 0, c: "#F97316" },
    { icon: "₹", label: "Revenue Collected", v: `₹${(q?.revenue || 0).toLocaleString()}`, c: "#0EA5E9" },
  ];

  return (
    <div className="animate-in">
      {isSpec && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 12, background: "#EDE9FE", color: "#5B21B6", fontSize: 13, lineHeight: 1.45 }}>
          <b>Your live clinic queue</b> — patients assigned to you who are here today (waiting / in chair).
          For all assigned cases, completed work, and payments, use <b>My Practice</b> in the sidebar.
        </div>
      )}
      {/* Modern counters matching AppointmentHub style */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
        {COUNTERS.map(c => (
          <div key={c.label} className="hub-card" style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: SHADOW, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c.c},${c.c}55)` }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${c.c}15`, color: c.c, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {c.icon === "⏳" ? <Clock size={16} /> : c.icon === "🩺" ? <User size={16} /> : c.icon === "✅" ? <CheckCircle size={16} /> : c.icon === "💰" ? <DollarSign size={16} /> : "₹"}
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, textTransform: "uppercase" as const, letterSpacing: .4 }}>{c.label}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.c, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* Search for easy filtering — big & obvious for non-tech users */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "12px 16px", boxShadow: SHADOW, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search waiting patients by name, complaint or type…"
            style={{ flex: 1, border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "12px 16px", fontSize: 15, fontWeight: 600, fontFamily: "inherit" }}
          />
          {search && <button onClick={() => setSearch("")} style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: MUTE + "1A", color: MUTE, cursor: "pointer", fontSize: 20, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>×</button>}
        </div>
        <div style={{ fontSize: 11, color: MUTE, marginTop: 6, paddingLeft: 4 }}>Type to instantly filter the list below — great for busy days.</div>
      </div>

      {/* §2 WAITING — modern cards like AppointmentHub */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <b style={{ color: A, fontSize: 15 }}>⏳ Waiting to Start Treatment</b>
        <span style={{ background: A, color: "#fff", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 800 }}>{filteredWaiting.length}</span>
        <span style={{ fontSize: 12, color: MUTE }}>— tap big button to open full workspace + tooth chart</span>
      </div>
      {filteredWaiting.length === 0 && <div style={{ background: "#fff", borderRadius: 16, padding: 24, textAlign: "center" as const, color: MUTE, boxShadow: SHADOW }}>No matching patients waiting. {search ? "Clear search or check other sections." : "Queue is clear ✨"}</div>}
      {filteredWaiting.map((p: any) => {
        const w = liveWait(p);
        return (
          <div key={p.apt_id} className="hub-card" style={{ background: "#fff", borderRadius: 18, padding: "14px 18px", marginBottom: 10, boxShadow: SHADOW, borderLeft: `6px solid ${(PT[p.patient_type] || PT.followup).dot}`, display: "flex", gap: 16, alignItems: "stretch" }}>
            {/* Prominent wait time */}
            <div style={{ minWidth: 82, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: `1px dashed ${LINE}` }}>
              <div style={{ fontWeight: 900, fontSize: 22, color: waitColor(w), fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{waitLabel(w) || "—"}</div>
              <div style={{ fontSize: 10, color: MUTE, fontWeight: 800, letterSpacing: .5, marginTop: 2 }}>WAITING</div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: 17 }}>{p.patient_name}</b>
                <TypeBadge type={p.patient_type} />
                <span style={{ background: SOFT, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700, color: "#475569" }}>{p.appointment_type}</span>
              </div>
              <div style={{ fontSize: 13, color: MUTE, marginTop: 3 }}>
                Arrived {p.arrived_at ? new Date(p.arrived_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"} {p.age ? `· ${p.age}y` : ""}
              </div>
              {p.chief_complaints?.length > 0 && <div style={{ fontSize: 12.5, color: "#9A3412", marginTop: 3, fontWeight: 600 }}>🦷 {p.chief_complaints.map((c: any) => typeof c === "string" ? c : c.text).join(" · ")}</div>}
              {p.existing_illnesses?.length > 0 && <div style={{ fontSize: 11.5, color: "#B91C1C", fontWeight: 700, marginTop: 2 }}>⚠ {p.existing_illnesses.join(" · ")}</div>}
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => returnToToday(p)} disabled={busy === `return:${p.apt_id}`}
                style={{ background: "#fff", color: A, border: `2px solid ${A}33`, padding: "12px 16px", borderRadius: 14, cursor: "pointer", fontWeight: 900, fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                <Undo2 size={16} /> {busy === `return:${p.apt_id}` ? "Moving…" : "Return to Today"}
              </button>
              <button onClick={() => startTreatment(p)} disabled={busy === p.apt_id}
                style={{ background: `linear-gradient(135deg,${A},${A}DD)`, color: "#fff", border: "none", padding: "14px 28px", borderRadius: 14, cursor: "pointer", fontWeight: 900, fontSize: 16, fontFamily: "inherit", boxShadow: `0 6px 18px ${A}55`, transition: "all .12s", display: "flex", alignItems: "center", gap: 8 }}>
                <Play size={18} /> {busy === p.apt_id ? "Opening…" : "Start Treatment"}
              </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* In treatment — cleaner cards */}
      {(seg.in_treatment || []).length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <b style={{ color: "#8B5CF6", fontSize: 15 }}>🩺 Currently In Treatment</b>
            <span style={{ background: "#8B5CF6", color: "#fff", borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 800 }}>{seg.in_treatment.length}</span>
          </div>
          {(seg.in_treatment || []).map((p: any) => (
            <div key={p.apt_id} style={{ background: "#FAF5FF", borderRadius: 14, padding: "12px 16px", marginBottom: 8, border: "1px solid #E9D5FE", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8B5CF6", animation: "pulse 2s infinite" }} />
              <div style={{ flex: 1 }}>
                <b>{p.patient_name}</b> <span style={{ color: MUTE, fontSize: 13 }}>· {p.appointment_type}</span>
              </div>
              <button onClick={() => returnToToday(p)} disabled={busy === `return:${p.apt_id}`} style={{ background: "#fff", color: "#8B5CF6", border: "1.5px solid #C4B5FD", padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <Undo2 size={14} /> {busy === `return:${p.apt_id}` ? "Moving…" : "Return to Today"}
              </button>
              <button onClick={() => onStartTreatment(p, p.session_id)} style={{ background: "#8B5CF6", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13 }}>Open Workspace</button>
            </div>
          ))}
        </div>
      )}

      {/* Payment sections — modern slim cards */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <b style={{ color: "#F97316", fontSize: 15 }}>💰 Completed — Awaiting Payment Collection</b>
          <span style={{ background: "#F97316", color: "#fff", borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 800 }}>{counts.payment_pending || 0}</span>
        </div>
        {(seg.payment_pending || []).length === 0 && <div style={{ color: MUTE, fontSize: 13, padding: "8px 0" }}>All clear — no pending payments.</div>}
        {(seg.payment_pending || []).map((p: any) => (
          <div key={p.apt_id} style={{ background: "#fff", borderRadius: 12, padding: "10px 14px", marginBottom: 6, boxShadow: SHADOW, display: "flex", alignItems: "center", gap: 12 }}>
            <b style={{ flex: 1 }}>{p.patient_name}</b>
            <b style={{ color: "#F97316", fontSize: 16, fontVariantNumeric: "tabular-nums" }}>₹{(p.amount_payable - (p.amount_collected || 0)).toLocaleString()}</b>
            <span style={{ fontSize: 12, color: MUTE }}>with nurse</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <b style={{ color: "#10B981", fontSize: 15 }}>✅ Completed & Paid</b>
          <span style={{ background: "#10B981", color: "#fff", borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 800 }}>{counts.collected || 0}</span>
        </div>
        {(seg.collected || []).length === 0 && <div style={{ color: MUTE, fontSize: 13, padding: "4px 0" }}>No completed patients yet today.</div>}
        {(seg.collected || []).map((p: any) => (
          <div key={p.apt_id} style={{ background: "#fff", borderRadius: 12, padding: "9px 14px", marginBottom: 5, boxShadow: SHADOW, opacity: .9, display: "flex", alignItems: "center", gap: 12 }}>
            <b style={{ flex: 1 }}>{p.patient_name}</b>
            <b style={{ color: "#10B981", fontSize: 15, fontVariantNumeric: "tabular-nums" }}>₹{(p.amount_collected || 0).toLocaleString()}</b>
          </div>
        ))}
      </div>

      {/* Expected Today — clean info strip */}
      {(seg.expected || []).length > 0 && (
        <div style={{ marginTop: 20, background: SOFT, border: `1.5px dashed ${LINE}`, borderRadius: 16, padding: "12px 16px" }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: MUTE, marginBottom: 8 }}>👀 EXPECTED LATER TODAY (not arrived yet)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(seg.expected || []).map((p: any) => (
              <span key={p.apt_id} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: (PT[p.patient_type] || PT.followup).dot }} />
                {p.scheduled_time || "—"} {p.patient_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHead({ icon, label, count, color, hint }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 20, marginBottom: 9 }}>
      <b style={{ color, fontSize: 14.5 }}>{icon} {label}</b>
      <span style={{ background: color, color: "#fff", borderRadius: 999, padding: "1px 9px", fontSize: 11, fontWeight: 800 }}>{count || 0}</span>
      {hint && <span style={{ fontSize: 11.5, color: MUTE }}>· {hint}</span>}
      <div style={{ flex: 1, height: 1.5, background: `linear-gradient(90deg,${color}44,transparent)` }} />
    </div>
  );
}
function MiniEmpty({ text }: { text: string }) {
  return <div style={{ padding: "16px 18px", color: "#94A3B8", background: "#fff", borderRadius: 13, fontSize: 13, border: `1.5px dashed ${LINE}` }}>{text}</div>;
}

export default DoctorQueue;
