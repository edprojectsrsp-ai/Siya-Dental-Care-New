"use client";
// ╔══════════════════════════════════════════════════════════════════╗
// ║  CASE MANAGER — admin status rescue.                              ║
// ║  Lists every appointment regardless of status and lets an admin   ║
// ║  force any status (bypassing the normal transition rules), so     ║
// ║  patients stuck in a state that hides them from the queue or       ║
// ║  blocks scheduling can be recovered.                              ║
// ╚══════════════════════════════════════════════════════════════════╝
import { useState, useEffect, useCallback, useMemo } from "react";
import * as api from "@/lib/api";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  scheduled:       { label: "Scheduled",    bg: "#F4F4F5", fg: "#52525B" },
  pending:         { label: "Pending",      bg: "#FEF3C7", fg: "#92400E" },
  confirmed:       { label: "Confirmed",    bg: "#D1FAE5", fg: "#065F46" },
  arrived:         { label: "In Queue",     bg: "#D1FAE5", fg: "#065F46" },
  in_treatment:    { label: "In Treatment", bg: "#EDE9FE", fg: "#5B21B6" },
  payment_pending: { label: "Payment Due",  bg: "#FFEDD5", fg: "#9A3412" },
  completed:       { label: "Completed",    bg: "#D1FAE5", fg: "#065F46" },
  cancelled:       { label: "Cancelled",    bg: "#FEE2E2", fg: "#991B1B" },
  rescheduled:     { label: "Rescheduled",  bg: "#E9D5FF", fg: "#6B21A8" },
};
const ALL_STATUSES = Object.keys(STATUS_META);
// Statuses that have no forward path in the normal workflow → patient can get stuck.
const STUCK = new Set(["in_treatment", "payment_pending", "completed", "cancelled"]);

const StatusPill = ({ s }: { s: string }) => {
  const m = STATUS_META[s] || { label: s, bg: "#F1F5F9", fg: "#475569" };
  return <span style={{ background: m.bg, color: m.fg, borderRadius: 999, padding: "3px 12px", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>{m.label}</span>;
};

const fmtDate = (d?: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
const fmtWhen = (s?: string | null) => { if (!s) return "—"; try { return new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };

export default function CaseManager({ staff, accent = "#6366F1", show }: { staff: any; accent?: string; show: (m: string) => void }) {
  const A = accent;
  const clinicId = staff?.clinic_id;
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("stuck");
  const [search, setSearch] = useState("");
  const [editApt, setEditApt] = useState<any>(null);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const d = await api.hubAdminAllAppointments(clinicId);
      setRows(Array.isArray(d?.appointments) ? d.appointments : []);
    } catch (e: any) { show("Error loading appointments: " + (e?.message || e)); setRows([]); }
    finally { setLoading(false); }
  }, [clinicId, show]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, stuck: 0 };
    for (const r of rows) {
      const s = r.workflow_status || "scheduled";
      c[s] = (c[s] || 0) + 1;
      if (STUCK.has(s)) c.stuck++;
    }
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    let list = rows;
    if (filter === "stuck") list = list.filter(r => STUCK.has(r.workflow_status));
    else if (filter !== "all") list = list.filter(r => r.workflow_status === filter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r => (r.patient_name || "").toLowerCase().includes(q) || (r.phone || "").includes(q));
    return list;
  }, [rows, filter, search]);

  const applyOverride = async (apt: any, newStatus: string, reason: string, clearSchedule: boolean) => {
    try {
      await api.hubAdminForceStatus(apt.id, newStatus, reason, clearSchedule);
      show(`✓ ${apt.patient_name} → ${STATUS_META[newStatus]?.label || newStatus}`);
      setEditApt(null);
      load();
    } catch (e: any) { show("Error: " + (e?.message || e)); }
  };

  const makeSchedulable = (apt: any) => {
    if (!confirm(`Reset ${apt.patient_name} to "Pending" and clear the date so it can be rescheduled?`)) return;
    applyOverride(apt, "pending", "Reset to schedulable by admin", true);
  };

  const chip = (id: string, label: string, n?: number, warn = false) => (
    <button key={id} onClick={() => setFilter(id)}
      style={{
        border: filter === id ? `2px solid ${warn ? "#EF4444" : A}` : `1.5px solid ${LINE}`,
        background: filter === id ? (warn ? "#FEF2F2" : A + "12") : "#fff",
        color: filter === id ? (warn ? "#B91C1C" : A) : "#475569",
        borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      }}>
      {label}{typeof n === "number" ? ` (${n})` : ""}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, color: INK }}>🛟 Case Manager</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: MUTE, maxWidth: 640 }}>
            Admin rescue for appointments stuck in a status that hides them from the queue or blocks scheduling.
            Force any status here — this bypasses the normal workflow rules, so use with care.
          </p>
        </div>
        <button onClick={load} style={{ border: `1.5px solid ${LINE}`, background: "#fff", borderRadius: 12, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: INK }}>↻ Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0 14px" }}>
        {chip("stuck", "⚠ Stuck", counts.stuck, true)}
        {chip("all", "All", counts.all)}
        {ALL_STATUSES.filter(s => counts[s]).map(s => chip(s, STATUS_META[s].label, counts[s]))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name or phone…"
        style={{ width: "100%", maxWidth: 360, border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "11px 14px", fontSize: 14, marginBottom: 16, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />

      {loading ? (
        <div style={{ padding: 50, textAlign: "center", color: MUTE }}>Loading appointments…</div>
      ) : visible.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 18, padding: 50, textAlign: "center", color: MUTE, boxShadow: SHADOW }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 800, color: INK, fontSize: 16 }}>{filter === "stuck" ? "No stuck appointments" : "No appointments match"}</div>
          <div style={{ fontSize: 13.5, marginTop: 4 }}>{filter === "stuck" ? "Everything is in a healthy, movable state." : "Try a different filter or search."}</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 18, boxShadow: SHADOW, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: SOFT }}>
              {["Patient", "Phone", "Status", "Scheduled", "Reason", "Last Updated", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 12, color: MUTE, fontWeight: 800, borderBottom: `1.5px solid ${LINE}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {visible.map(r => {
                const stuck = STUCK.has(r.workflow_status);
                const sched = r.scheduled_date || r.confirmed_date || r.requested_date;
                const time = r.scheduled_time || r.confirmed_time || r.requested_time;
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${SOFT}`, background: stuck ? "#FFFBEB" : "#fff" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 700, fontSize: 14.5, color: INK }}>{r.patient_name}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13.5, color: MUTE }}>{r.phone || "—"}</td>
                    <td style={{ padding: "12px 14px" }}><StatusPill s={r.workflow_status} /></td>
                    <td style={{ padding: "12px 14px", fontSize: 13.5, color: INK, whiteSpace: "nowrap" }}>{fmtDate(sched)}{time ? ` · ${String(time).slice(0, 5)}` : ""}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: MUTE, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason || r.appointment_type || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12.5, color: MUTE, whiteSpace: "nowrap" }}>{fmtWhen(r.updated_at || r.created_at)}</td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {stuck && (
                          <button onClick={() => makeSchedulable(r)} title="Reset to Pending + clear date so it can be rescheduled"
                            style={{ background: "#10B981", color: "#fff", border: "none", borderRadius: 9, padding: "7px 11px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                            ♻ Make schedulable
                          </button>
                        )}
                        <button onClick={() => setEditApt(r)}
                          style={{ background: A + "14", color: A, border: "none", borderRadius: 9, padding: "7px 11px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          Change status
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editApt && <OverrideModal apt={editApt} accent={A} onClose={() => setEditApt(null)} onApply={applyOverride} />}
    </div>
  );
}

function OverrideModal({ apt, accent, onClose, onApply }: { apt: any; accent: string; onClose: () => void; onApply: (apt: any, status: string, reason: string, clear: boolean) => void }) {
  const [status, setStatus] = useState<string>(apt.workflow_status || "pending");
  const [reason, setReason] = useState("");
  const [clear, setClear] = useState(false);
  const changed = status !== apt.workflow_status;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", backdropFilter: "blur(8px)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 26, width: 460, maxWidth: "94vw" }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: INK }}>Change status — {apt.patient_name}</div>
        <div style={{ fontSize: 13, color: MUTE, margin: "4px 0 16px" }}>
          Current: <StatusPill s={apt.workflow_status} />. This override bypasses the normal workflow rules.
        </div>

        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: MUTE, marginBottom: 6, textTransform: "uppercase", letterSpacing: .6 }}>New status</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              style={{ border: status === s ? `2px solid ${accent}` : `1.5px solid ${LINE}`, background: status === s ? accent + "12" : "#fff", color: status === s ? accent : "#475569", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {STATUS_META[s].label}
            </button>
          ))}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: INK, marginBottom: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={clear} onChange={e => setClear(e.target.checked)} style={{ width: 16, height: 16 }} />
          Clear date/time (send to unscheduled pool so it can be rescheduled)
        </label>

        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: MUTE, marginBottom: 6, textTransform: "uppercase", letterSpacing: .6 }}>Reason (optional)</label>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why are you overriding this?"
          style={{ width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "11px 14px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: 20 }} />

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ border: `1.5px solid ${LINE}`, background: "#fff", color: MUTE, borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => onApply(apt, status, reason, clear)} disabled={!changed && !clear}
            style={{ border: "none", background: accent, color: "#fff", borderRadius: 12, padding: "11px 20px", fontWeight: 800, fontSize: 14, cursor: (!changed && !clear) ? "not-allowed" : "pointer", opacity: (!changed && !clear) ? .5 : 1, fontFamily: "inherit" }}>
            Apply override
          </button>
        </div>
      </div>
    </div>
  );
}
