/**
 * SpecialistModule — Bundle X (Integrated)
 *
 * Specialist-facing tracking dashboard for assigned work, in-progress cases,
 * closed work awaiting verification, verified work, and payments.
 */
import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle, Clock, DollarSign, ClipboardList, User, AlertTriangle } from "lucide-react";
import * as api from "@/lib/api";
import { TreatmentWorkspace } from "@/components/TreatmentWorkspace";

const TEAL = "#0E7C7B";
const LINE = "#E2E8F0";
const INK = "#1F2937";
const MUTE = "#64748B";
const SOFT = "#F8FAFC";
const GREEN = "#059669";
const AMBER = "#F59E0B";
const PURPLE = "#7C3AED";

const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const dmy = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

type Tab = "assigned" | "progress" | "closed" | "verified" | "payments";

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending:   { bg: "#FEF3C7", fg: "#92400E", label: "PENDING" },
  done:      { bg: "#DBEAFE", fg: "#1E40AF", label: "DONE" },
  closed:    { bg: "#E0E7FF", fg: "#3730A3", label: "DONE" },
  verified:  { bg: "#D1FAE5", fg: "#065F46", label: "VERIFIED" },
};

// ── Referral-loop pipeline: one tracker per case ──
const PIPELINE = [
  { key: "assigned",     label: "Assigned" },
  { key: "confirmed",    label: "Confirmed" },
  { key: "in_treatment", label: "Treatment" },
  { key: "done",         label: "Done" },
  { key: "verified",     label: "Verified" },
  { key: "paid",         label: "Paid" },
];
// Map a case's scattered statuses to a single pipeline index.
function caseStageIndex(item: any): number {
  const ss = item.specialist_session_status || "pending";
  const wf = item.workflow_status || "";
  const settled = item.is_settled || item.earning_settled;
  if (ss === "verified") return settled ? 5 : 4;
  if (["closed", "done"].includes(ss)) return 3;
  if (["in_treatment", "in_progress"].includes(wf)) return 2;
  if (["arrived", "ready"].includes(wf) || item.specialist_confirmation_status === "confirmed") return 1;
  return 0;
}
function CaseTracker({ stage, accent }: { stage: number; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", flexBasis: "100%", marginTop: 12, paddingTop: 12, borderTop: "1px dashed #E2E8F0" }}>
      {PIPELINE.map((s, i) => {
        const done = i < stage, current = i === stage;
        return (
          <React.Fragment key={s.key}>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
              background: done ? accent : current ? accent + "1F" : "#F1F5F9",
              color: done ? "#fff" : current ? accent : "#94A3B8",
              border: current ? `1.5px solid ${accent}` : "1.5px solid transparent",
            }}>{done ? "✓ " : ""}{s.label}</span>
            {i < PIPELINE.length - 1 && <span style={{ color: i < stage ? accent : "#CBD5E1", fontSize: 12, fontWeight: 800 }}>›</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function SpecialistModule({ staff, accent = TEAL, show }: {
  staff: any; accent?: string; show: (m: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("assigned");
  const [work, setWork] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeCase, setActiveCase] = useState<any>(null);
  const [doneItem, setDoneItem] = useState<any>(null);
  const [doneNotes, setDoneNotes] = useState("");

  const specId = staff?.staff_id;
  const clinicId = staff?.clinic_id;

  const loadWork = useCallback(async () => {
    setLoading(true);
    try {
      const all = await api.workshopSpecialistWork(clinicId);
      // Filter to only this specialist's work
      const mine = (Array.isArray(all) ? all : []).filter(
        (r: any) => r.specialist_id === specId
      );
      setWork(mine);
    } catch { setWork([]); }
    finally { setLoading(false); }
  }, [clinicId, specId]);

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const all = await api.specListEarnings({ specialist_id: specId, clinic_id: clinicId });
      setEarnings(Array.isArray(all) ? all : (all?.items || []));
    } catch { setEarnings([]); }
    finally { setLoading(false); }
  }, [specId, clinicId]);

  useEffect(() => {
    if (tab === "payments") loadEarnings();
    else loadWork();
  }, [tab, loadWork, loadEarnings]);

  // Derived lists
  const sessionStatus = (w: any) => w.specialist_session_status || "pending";
  const workflowStatus = (w: any) => w.workflow_status || "";
  const isWaiting = (w: any) => ["arrived", "ready"].includes(workflowStatus(w));
  const isInProgress = (w: any) => ["in_treatment", "in_progress"].includes(workflowStatus(w));
  const isActive = (w: any) => !["closed", "done", "verified"].includes(sessionStatus(w));

  const myAssigned = work.filter(w => isActive(w));
  const myProgress = work.filter(w => isActive(w) && isInProgress(w));
  const myWaiting = work.filter(w => isActive(w) && isWaiting(w));
  const myExpected = work.filter(w => isActive(w) && !isWaiting(w) && !isInProgress(w));
  const myClosed = work.filter(w => ["closed", "done"].includes(sessionStatus(w)));
  const myVerified = work.filter(w => sessionStatus(w) === "verified");
  const assignedCount = myAssigned.length;

  // Scorecard: completed cases + average turnaround (assigned → done), best-effort from available dates.
  const doneCases = [...myClosed, ...myVerified];
  const turnarounds = doneCases.map((c: any) => {
    const a = c.scheduled_date || c.created_at;
    const b = c.verified_at || c.closed_at || c.completed_at || c.updated_at;
    if (!a || !b) return null;
    const d = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
    return d >= 0 && d < 365 ? d : null;
  }).filter((x): x is number => x !== null);
  const avgTurnaround = turnarounds.length ? turnarounds.reduce((s, x) => s + x, 0) / turnarounds.length : null;
  const casesDone = doneCases.length;

  const pendingPayments  = earnings.filter((e: any) => !e.is_settled && e.case_status === "verified");
  const settledPayments  = earnings.filter((e: any) => e.is_settled);
  const totalPending     = pendingPayments.reduce((s: number, e: any) => s + (e.amount - (e.settled_amount || 0)), 0);
  const totalSettled     = settledPayments.reduce((s: number, e: any) => s + (e.settled_amount || 0), 0);

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { id: "assigned",  label: "Assigned",     icon: <ClipboardList size={15} />, count: assignedCount, color: AMBER },
    { id: "progress",  label: "In Progress",  icon: <Clock size={15} />,         count: myProgress.length, color: "#F59E0B" },
    { id: "closed",    label: "Closed / Done", icon: <CheckCircle size={15} />,   count: myClosed.length, color: PURPLE },
    { id: "verified",  label: "Verified",     icon: <CheckCircle size={15} />,   count: myVerified.length,  color: GREEN },
    { id: "payments",  label: "My Payments",  icon: <DollarSign size={15} />,    count: earnings.length,    color: TEAL },
  ];

  const startTreatment = async (item: any) => {
    const appointmentId = item.appointment_id || item.id;
    if (!appointmentId) return;
    setBusyId(appointmentId);
    try {
      await api.hubMarkStatus(appointmentId, "in_treatment");
      show("Treatment started");
      await loadWork();
      setTab("progress");
      setActiveCase({ ...item, workflow_status: "in_treatment" });
    } catch (e: any) {
      show(e?.message || "Could not start treatment");
    } finally {
      setBusyId(null);
    }
  };

  const markDone = (item: any) => {
    const appointmentId = item.appointment_id || item.id;
    if (!appointmentId) return;
    setDoneNotes("Work completed by specialist");
    setDoneItem(item);
  };

  const submitMarkDone = async () => {
    const item = doneItem;
    const appointmentId = item?.appointment_id || item?.id;
    if (!appointmentId) return;
    setDoneItem(null);
    setBusyId(appointmentId);
    try {
      await api.specCloseSession(appointmentId, { notes: doneNotes.trim() });
      show("Marked done — awaiting doctor verification");
      await loadWork();
      setTab("closed");
    } catch (e: any) {
      show(e?.message || "Could not mark done");
    } finally {
      setBusyId(null);
    }
  };

  const renderCard = (item: any) => {
    const st = STATUS_STYLE[sessionStatus(item)] || STATUS_STYLE.pending;
    const appointmentId = item.appointment_id || item.id;
    const workflow = workflowStatus(item);
    const canStart = ["arrived", "ready"].includes(workflow);
    const inProgress = ["in_treatment", "in_progress"].includes(workflow);
    const disabled = busyId === appointmentId;
    return (
      <div key={item.appointment_id} style={{
        background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 14, padding: 14,
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: st.bg, color: st.fg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 800, flexShrink: 0,
        }}><User size={20} /></div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 800, color: INK, fontSize: 15 }}>{item.patient_name}</div>
          <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>
            {dmy(item.scheduled_date)}
            {item.specialization ? ` · ${item.specialization}` : ""}
          </div>
          {item.specialist_notes && (
            <div style={{ fontSize: 12, color: MUTE, marginTop: 4, fontStyle: "italic" }}>
              {item.specialist_notes.slice(0, 100)}
            </div>
          )}
        </div>
        <span style={{
          fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
          background: st.bg, color: st.fg, textTransform: "uppercase",
        }}>{st.label}</span>
        {item.specialist_confirmation_status === "pending_call" && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: AMBER, background: "#FEF3C7",
            padding: "3px 8px", borderRadius: 999,
          }}>Nurse call pending</span>
        )}
        {canStart && (
          <button
            onClick={() => startTreatment(item)}
            disabled={disabled}
            style={{
              border: "none",
              background: AMBER,
              color: "#fff",
              borderRadius: 10,
              padding: "8px 12px",
              fontWeight: 800,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {disabled ? "Starting…" : "Start Treatment"}
          </button>
        )}
        {inProgress && (
          <button
            onClick={() => setActiveCase(item)}
            disabled={disabled}
            style={{
              border: `1.5px solid ${TEAL}`,
              background: "#fff",
              color: TEAL,
              borderRadius: 10,
              padding: "8px 12px",
              fontWeight: 800,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            Open Treatment Panel
          </button>
        )}
        {inProgress && (
          <button
            onClick={() => markDone(item)}
            disabled={disabled}
            style={{
              border: "none",
              background: GREEN,
              color: "#fff",
              borderRadius: 10,
              padding: "8px 12px",
              fontWeight: 800,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {disabled ? "Saving…" : "Mark Done"}
          </button>
        )}
        {!canStart && !inProgress && isActive(item) && (
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            color: MUTE,
            background: SOFT,
            borderRadius: 999,
            padding: "5px 10px",
          }}>
            Waiting for arrival
          </span>
        )}
        <CaseTracker stage={caseStageIndex(item)} accent={accent} />
      </div>
    );
  };

  const renderEmpty = (msg: string) => (
    <div style={{
      padding: 40, textAlign: "center", color: MUTE, background: SOFT,
      borderRadius: 14, border: `1.5px dashed ${LINE}`,
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
      {msg}
    </div>
  );

  return (
    <div>
      {activeCase && (
        <TreatmentWorkspace
          patientId={activeCase.patient_id}
          aptId={activeCase.appointment_id || activeCase.id}
          sessionId={null}
          clinicId={clinicId}
          clinicName={staff?.clinic_name || "Siya Dental Care"}
          staff={staff}
          accent={accent}
          show={show}
          onExit={() => {
            setActiveCase(null);
            loadWork();
          }}
        />
      )}
      {!activeCase && (
      <>
      {/* Header with summary */}
      <div style={{
        background: `linear-gradient(135deg,${accent},${accent}CC)`,
        borderRadius: 18, padding: "16px 22px", color: "#fff", marginBottom: 16,
      }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>🩺 My Practice</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
          {staff?.name}{staff?.specialization ? ` · ${staff.specialization}` : ""}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>ASSIGNED</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{assignedCount}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>IN PROGRESS</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{myProgress.length}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>AWAITING APPROVAL</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{myClosed.length}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>CASES DONE</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{casesDone}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>AVG TURNAROUND</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{avgTurnaround !== null ? `${avgTurnaround.toFixed(1)}d` : "—"}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>EARNINGS OWED</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(totalPending)}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>TOTAL SETTLED</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(totalSettled)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            border: tab === t.id ? `2px solid ${t.color}` : `1.5px solid ${LINE}`,
            background: tab === t.id ? t.color + "14" : "#fff",
            color: tab === t.id ? t.color : MUTE,
            borderRadius: 12, padding: "10px 16px", fontWeight: 800, fontSize: 13.5,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            {t.icon} {t.label}
            {t.count > 0 && (
              <span style={{
                background: tab === t.id ? t.color : LINE,
                color: tab === t.id ? "#fff" : MUTE,
                fontSize: 10, fontWeight: 900, borderRadius: 999, padding: "1px 7px",
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: MUTE }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>

          {/* Tab 1: Assigned */}
          {tab === "assigned" && (
            <>
              {myWaiting.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: AMBER, marginBottom: 8, paddingLeft: 4 }}>🟢 ARRIVED & WAITING</div>
                  {myWaiting.map(item => renderCard(item))}
                </div>
              )}
              {myExpected.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: MUTE, marginBottom: 8, paddingLeft: 4 }}>👀 EXPECTED LATER TODAY</div>
                  {myExpected.map(item => renderCard(item))}
                </div>
              )}
              {assignedCount === 0 && renderEmpty("No patients assigned to you right now.")}
            </>
          )}

          {tab === "progress" && (
            myProgress.length === 0
              ? renderEmpty("No patients are in progress right now.")
              : myProgress.map(item => renderCard(item))
          )}

          {/* Tab 2: Completed (awaiting doctor approval) */}
          {tab === "closed" && (
            <>
              {myClosed.length === 0
                ? renderEmpty("No completed work awaiting doctor verification.")
                : (
                  <>
                    <div style={{
                      background: "#FFF7ED", border: `1.5px solid ${AMBER}`,
                      borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#9A3412",
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
                    }}>
                      <AlertTriangle size={16} />
                      These are awaiting the senior doctor's verification. Once verified, your payable will be created.
                    </div>
                    {myClosed.map(item => renderCard(item))}
                  </>
                )
              }
            </>
          )}

          {/* Tab 3: Verified */}
          {tab === "verified" && (
            myVerified.length === 0
              ? renderEmpty("No verified work yet. Doctor will verify your completed work.")
              : myVerified.map(item => renderCard(item))
          )}

          {/* Tab 4: Payments */}
          {tab === "payments" && (
            <>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{
                  background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 14, padding: 16,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, textTransform: "uppercase", letterSpacing: 0.5 }}>Payment Pending</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: totalPending > 0 ? AMBER : GREEN, marginTop: 6 }}>
                    {fmt(totalPending)}
                  </div>
                  <div style={{ fontSize: 12, color: MUTE, marginTop: 4 }}>{pendingPayments.length} item(s)</div>
                </div>
                <div style={{
                  background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 14, padding: 16,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Settled</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: GREEN, marginTop: 6 }}>
                    {fmt(totalSettled)}
                  </div>
                  <div style={{ fontSize: 12, color: MUTE, marginTop: 4 }}>{settledPayments.length} payment(s)</div>
                </div>
              </div>

              {/* Pending payments */}
              {pendingPayments.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 8 }}>⏳ Pending Settlement</div>
                  {pendingPayments.map((e: any) => (
                    <div key={e.id} style={{
                      background: "#fff", border: `1.5px solid #FECACA`, borderRadius: 14, padding: 14,
                      display: "flex", alignItems: "center", gap: 14, marginBottom: 6, flexWrap: "wrap",
                    }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 800, color: INK, fontSize: 15 }}>{e.patient_name || "Patient"}</div>
                        <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>
                          Verified {dmy(e.verified_at)} · {e.notes || ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: AMBER }}>{fmt(e.amount - (e.settled_amount || 0))}</div>
                        <div style={{ fontSize: 10.5, color: MUTE }}>of {fmt(e.amount)} earned</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Settled payments */}
              {settledPayments.length > 0 && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 8 }}>✅ Settled</div>
                  {settledPayments.map((e: any) => (
                    <div key={e.id} style={{
                      background: "#F0FDF4", border: `1.5px solid ${LINE}`, borderRadius: 14, padding: 14,
                      display: "flex", alignItems: "center", gap: 14, marginBottom: 6, flexWrap: "wrap",
                    }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 800, color: INK, fontSize: 15 }}>{e.patient_name || "Patient"}</div>
                        <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>
                          Settled {dmy(e.settled_at)} · {e.payment_mode || ""}
                          {e.reference ? ` · Ref: ${e.reference}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: GREEN }}>{fmt(e.settled_amount || e.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingPayments.length === 0 && settledPayments.length === 0 && (
                renderEmpty("No earnings recorded yet. Complete work and get it verified by the doctor.")
              )}
            </>
          )}
        </div>
      )}
      </>
      )}

      {doneItem && (
        <div onClick={() => setDoneItem(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", backdropFilter: "blur(8px)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, padding: 26, width: 440, maxWidth: "94vw" }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: INK, marginBottom: 2 }}>Mark work done</div>
            <div style={{ fontSize: 13.5, color: MUTE, marginBottom: 14 }}>
              {doneItem.patient_name || "Patient"} — this will be sent to the doctor for verification.
            </div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: MUTE, marginBottom: 6, textTransform: "uppercase", letterSpacing: .6 }}>Notes</label>
            <textarea autoFocus value={doneNotes} onChange={e => setDoneNotes(e.target.value)}
              placeholder="Describe the work completed…"
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitMarkDone(); }}
              style={{ width: "100%", minHeight: 96, border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "12px 14px", fontSize: 14.5, fontFamily: "inherit", boxSizing: "border-box", outline: "none", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={() => setDoneItem(null)}
                style={{ border: `1.5px solid ${LINE}`, background: "#fff", color: MUTE, borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={submitMarkDone}
                style={{ border: "none", background: accent, color: "#fff", borderRadius: 12, padding: "11px 20px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Mark done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
