import React, { useState } from "react";
import { CheckCircle, AlertCircle, Clock, Check, User, Activity, AlertTriangle } from "lucide-react";
import * as api from "@/lib/api";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const A = "#0E7C7B";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";
const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const dmy = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

function SectionTitle({ icon, children }: any) {
  return (
    <div style={{ fontWeight: 800, fontSize: 16, color: INK, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      {icon} {children}
    </div>
  );
}

const card: any = { background: "#fff", borderRadius: 20, padding: 22, boxShadow: SHADOW, marginBottom: 16 };
const btnGhost = (c: string): any => ({ border: `1.5px solid ${c}44`, background: c + "0D", color: c, borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13.5, transition: "background .12s" });
const btnSolid = (c: string): any => ({ border: "none", background: c, color: "#fff", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13.5, transition: "transform .08s, box-shadow .12s", boxShadow: `0 4px 12px ${c}44` });

function StatusBadge({ type, status }: { type: "call" | "session" | "lab", status: string }) {
  if (type === "call") {
    if (status === "confirmed") return <span style={{ background: "#D1FAE5", color: "#065F46", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>✓ Call Confirmed</span>;
    if (status === "declined") return <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>✕ Declined</span>;
    return <span style={{ background: "#F1F5F9", color: "#475569", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>⏳ Pending Call</span>;
  }
  if (type === "session") {
    if (status === "closed") return <span style={{ background: "#EDE9FE", color: "#5B21B6", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>✅ Work Done</span>;
    if (status === "in_session") return <span style={{ background: "#FEF3C7", color: "#92400E", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>🩺 In Session</span>;
    return <span style={{ background: "#F1F5F9", color: "#475569", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>Waiting</span>;
  }
  if (type === "lab") {
    if (status === "approved") return <span style={{ background: "#D1FAE5", color: "#065F46", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>✓ Approved (Due)</span>;
    if (status === "received") return <span style={{ background: "#DBEAFE", color: "#1E40AF", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>📦 Received</span>;
    if (status === "sent") return <span style={{ background: "#FEF3C7", color: "#92400E", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>🚚 Sent to Lab</span>;
    return <span style={{ background: "#F1F5F9", color: "#475569", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>⏳ Pending</span>;
  }
  return null;
}

export function DoctorCoordinationTab({ W, show, reload, staff, onCompleteLabOrder }: any) {
  const [busy, setBusy] = useState("");
  const [payModal, setPayModal] = useState<{ aptId: string; name: string } | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [approveModal, setApproveModal] = useState<{ id: string; cost: number } | null>(null);
  const specialistCases = W?.specialist_cases || [];
  const labOrders = W?.lab_orders || [];

  const verifySpecialist = async () => {
    if (!payModal) return;
    const amt = Number(payAmt);
    if (!payAmt || isNaN(amt) || amt < 0) { show("Enter a valid amount"); return; }
    const aptId = payModal.aptId;
    setBusy(`spec:${aptId}`);
    setPayModal(null);
    try {
      await api.verifySpecialistWork(aptId, { earning_amount: amt, notes: "Verified by doctor" });
      show("Specialist work verified ✅");
      reload();
    } catch (e: any) { show("Error: " + (e.message || e)); }
    finally { setBusy(""); setPayAmt(""); }
  };

  const receiveLab = async (id: string) => {
    setBusy(`lab:${id}`);
    try { await api.labReceiveOrder(id); show("Lab marked received ✅"); reload(); }
    catch (e: any) { show("Error: " + (e.message || e)); }
    finally { setBusy(""); }
  };

  const approveLab = async () => {
    if (!approveModal) return;
    const id = approveModal.id;
    setApproveModal(null);
    setBusy(`lab:${id}`);
    try { await api.labApproveOrder(id); show("Lab order approved and due ✅"); reload(); }
    catch (e: any) { show("Error: " + (e.message || e)); }
    finally { setBusy(""); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
      
      {/* ───────────────────────────────────────────────────────── */}
      {/* 1. SPECIALIST TRACKING                                    */}
      {/* ───────────────────────────────────────────────────────── */}
      <div style={card}>
        <SectionTitle icon={<User size={18} color="#7C3AED" />}>Specialist Tracking</SectionTitle>
        
        {specialistCases.length === 0 ? (
          <div style={{ fontSize: 13, color: MUTE, textAlign: "center", padding: 20, background: SOFT, borderRadius: 12 }}>
            No specialist assigned to this patient.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {specialistCases.map((item: any) => {
              const sessionStatus = item.specialist_session_status || "pending";
              const isClosed = sessionStatus === "closed" || sessionStatus === "done";
              const isVerified = sessionStatus === "verified";
              return (
                <div key={item.appointment_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, border: `1.5px solid ${LINE}`, borderRadius: 14, background: isClosed ? SOFT : "#fff" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 4 }}>Dr. {item.specialist_name} <span style={{ color: MUTE, fontWeight: 500 }}>on {dmy(item.scheduled_date || item.specialist_assigned_at)}</span></div>
                    <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 8 }}>{item.specialist_notes || "No notes"}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <StatusBadge type="call" status={item.specialist_confirmation_status} />
                      <StatusBadge type="session" status={sessionStatus} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {isVerified && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, textTransform: "uppercase" }}>Status</div>
                        <div style={{ fontWeight: 900, color: "#059669", fontSize: 16 }}>Verified</div>
                      </div>
                    )}
                    {!isVerified && isClosed && (
                      <button onClick={() => { setPayAmt(""); setPayModal({ aptId: item.appointment_id, name: item.specialist_name || "specialist" }); }} disabled={busy === `spec:${item.appointment_id}`} style={btnSolid("#7C3AED")}>
                        {busy === `spec:${item.appointment_id}` ? "..." : "Approve Work & Set Payable"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 2. LAB ORDER APPROVAL & TRACKING                          */}
      {/* ───────────────────────────────────────────────────────── */}
      <div style={card}>
        <SectionTitle icon={<Activity size={18} color="#F59E0B" />}>Lab Orders & Approval</SectionTitle>
        
        {labOrders.length === 0 ? (
          <div style={{ fontSize: 13, color: MUTE, textAlign: "center", padding: 20, background: SOFT, borderRadius: 12 }}>
            No lab orders for this patient.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {labOrders.map((item: any) => {
              const needsApprove = item.status === "received";
              const isApproved = item.status === "approved";
              const needsReceive = item.status === "sent";
              const needsNurseComplete = item.status === "pending";
              const canComplete = needsNurseComplete && (staff?.role === "nurse" || staff?.role === "receptionist" || staff?.role === "admin");
              
              return (
                <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, border: `1.5px solid ${needsApprove ? "#FDE68A" : LINE}`, borderRadius: 14, background: needsApprove ? "#FFFBEB" : "#fff" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 4 }}>
                      {item.work_type} <span style={{ color: MUTE, fontWeight: 500 }}>— {item.vendor_name || "No vendor"}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 8 }}>
                      {item.teeth?.length ? `Teeth: ${item.teeth.join(", ")}` : "No teeth specified"} 
                      {item.shade ? ` · Shade: ${item.shade}` : ""}
                    </div>
                    <StatusBadge type="lab" status={item.status} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {(isApproved || item.cost > 0) && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, textTransform: "uppercase" }}>Vendor Cost</div>
                        <div style={{ fontWeight: 900, color: isApproved ? "#D97706" : INK, fontSize: 16 }}>{fmt(item.cost)}</div>
                      </div>
                    )}
                    {canComplete && onCompleteLabOrder && (
                      <button onClick={() => onCompleteLabOrder(item)} style={btnSolid("#0E7C7B")}>
                        Complete & Send to Lab
                      </button>
                    )}
                    {needsReceive && (
                      <button onClick={() => receiveLab(item.id)} disabled={busy === `lab:${item.id}`} style={btnGhost("#D97706")}>
                        {busy === `lab:${item.id}` ? "..." : "Nurse: Mark Received"}
                      </button>
                    )}
                    {needsApprove && (
                      <button onClick={() => setApproveModal({ id: item.id, cost: item.cost })} disabled={busy === `lab:${item.id}`} style={btnSolid("#D97706")}>
                        {busy === `lab:${item.id}` ? "..." : "Approve & Mark Payable"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Specialist payout modal — replaces native prompt() */}
      {payModal && (
        <div onClick={() => setPayModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 22, width: 360, maxWidth: "100%", boxShadow: "0 20px 60px rgba(15,23,42,.3)" }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: INK, marginBottom: 4 }}>Approve specialist work</div>
            <div style={{ fontSize: 13, color: MUTE, marginBottom: 16 }}>Amount payable to Dr. {payModal.name} for this case</div>
            <label style={{ fontSize: 11, fontWeight: 800, color: MUTE, textTransform: "uppercase" as const }}>Payout amount (₹)</label>
            <input autoFocus type="text" inputMode="numeric" value={payAmt}
              onChange={e => setPayAmt(e.target.value.replace(/[^0-9.]/g, ""))}
              onKeyDown={e => { if (e.key === "Enter") verifySpecialist(); }}
              placeholder="e.g. 2000"
              style={{ width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "12px 14px", fontSize: 16, fontWeight: 700, boxSizing: "border-box", outline: "none", fontFamily: "inherit", marginTop: 6 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setPayModal(null)} style={{ ...btnGhost(MUTE), flex: 1, textAlign: "center" as const }}>Cancel</button>
              <button onClick={verifySpecialist} style={{ ...btnSolid("#7C3AED"), flex: 2 }}>Verify & set payable ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* Lab approval confirm — replaces native confirm() */}
      {approveModal && (
        <div onClick={() => setApproveModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 22, width: 360, maxWidth: "100%", boxShadow: "0 20px 60px rgba(15,23,42,.3)" }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: INK, marginBottom: 8 }}>Approve lab receipt?</div>
            <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.5, marginBottom: 18 }}>
              This marks <b>{fmt(approveModal.cost)}</b> as payable to the vendor. This is recorded in the vendor's dues.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setApproveModal(null)} style={{ ...btnGhost(MUTE), flex: 1, textAlign: "center" as const }}>Cancel</button>
              <button onClick={approveLab} style={{ ...btnSolid("#D97706"), flex: 2 }}>Approve & mark payable ✓</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
