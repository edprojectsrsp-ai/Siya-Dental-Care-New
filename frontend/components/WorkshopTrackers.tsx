/**
 * WorkshopTrackers — Bundle X Pass 2
 *
 * 4 tracking views mounted under the "Workshop" sidebar group:
 *   1. Specialist Work Tracker (pending → done → verified)
 *   2. Lab Order Tracker (pending → sent → received → completed)
 *   3. Lab Payables (vendor-wise outstanding)
 *   4. Specialist Payables (specialist-wise outstanding)
 *
 * Doctor uses this to track all outstanding work and payments.
 */
import React, { useEffect, useState } from "react";
import { Eye, Check, DollarSign, Clock, AlertTriangle, Phone, MessageSquare, CheckCircle } from "lucide-react";
import * as api from "@/lib/api";

const TEAL = "#0E7C7B";
const TEAL_DEEP = "#0A5C5B";
const LINE = "#E2E8F0";
const INK = "#1F2937";
const MUTE = "#64748B";
const SOFT = "#F8FAFC";
const GREEN = "#059669";
const RED = "#DC2626";
const AMBER = "#F59E0B";

const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

const statusColors: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FEF3C7", fg: "#92400E" },
  done: { bg: "#DBEAFE", fg: "#1E40AF" },
  closed: { bg: "#E0E7FF", fg: "#3730A3" },
  verified: { bg: "#D1FAE5", fg: "#065F46" },
  sent: { bg: "#FEF3C7", fg: "#92400E" },
  received: { bg: "#DBEAFE", fg: "#1E40AF" },
  fitted: { bg: "#E0E7FF", fg: "#3730A3" },
  completed: { bg: "#D1FAE5", fg: "#065F46" },
};

const Badge = ({ status }: { status: string }) => {
  const c = statusColors[status] || { bg: SOFT, fg: MUTE };
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
      background: c.bg, color: c.fg, textTransform: "uppercase",
    }}>{status}</span>
  );
};

type Tab = "spec_work" | "lab_orders" | "lab_pay" | "spec_pay";

export default function WorkshopTrackers({ clinicId, staff, accent = TEAL, show, defaultTab, embedded }: {
  clinicId?: string; staff?: any; accent?: string; show: (m: string) => void;
  defaultTab?: Tab; embedded?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab || "spec_work");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (defaultTab) setTab(defaultTab);
  }, [defaultTab]);

  const fetchTab = async (t: Tab) => {
    setLoading(true);
    try {
      let res: any[];
      switch (t) {
        case "spec_work": res = await api.workshopSpecialistWork(clinicId); break;
        case "lab_orders": res = await api.workshopLabOrders(clinicId); break;
        case "lab_pay": res = await api.workshopLabPayables(clinicId); break;
        case "spec_pay": res = await api.workshopSpecialistPayables(clinicId); break;
        default: res = [];
      }
      setData(Array.isArray(res) ? res : []);
    } catch { setData([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTab(tab); }, [tab, clinicId]); // eslint-disable-line

  const verifySpecWork = async (aptId: string) => {
    const amt = prompt("Enter specialist earning amount (₹):", "");
    if (!amt) return;
    try {
      await api.verifySpecialistWork(aptId, { earning_amount: parseFloat(amt) });
      show("Specialist work verified ✅ — payable created");
      fetchTab("spec_work");
    } catch (e: any) { alert(e?.message || e); }
  };

  const TABS: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: "spec_work", label: "Specialist Work", icon: "👨‍⚕️" },
    { id: "lab_orders", label: "Lab Orders", icon: "🧪" },
    { id: "lab_pay", label: "Lab Payables", icon: "💳" },
    { id: "spec_pay", label: "Specialist Payables", icon: "💰" },
  ];

  return (
    <div>
      {!embedded && <h1 style={{ margin: "0 0 16px", fontSize: 28, color: INK }}>🏗️ Workshop Trackers</h1>}

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            border: tab === t.id ? `2px solid ${accent}` : `1.5px solid ${LINE}`,
            background: tab === t.id ? accent + "14" : "#fff",
            color: tab === t.id ? accent : MUTE,
            borderRadius: 12, padding: "10px 16px", fontWeight: 800, fontSize: 13.5,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: MUTE }}>Loading…</div>
      ) : data.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: MUTE, background: SOFT, borderRadius: 14, border: `1.5px dashed ${LINE}` }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
          No items in this tracker yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {/* ── Specialist Work ── */}
          {tab === "spec_work" && data.map((r: any) => (
            <div key={r.appointment_id} style={{
              background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 14, padding: 14,
              display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 800, color: INK, fontSize: 15 }}>{r.patient_name}</div>
                <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>
                  {r.specialist_name}{r.specialization ? ` — ${r.specialization}` : ""}
                  {r.scheduled_date ? ` · ${r.scheduled_date}` : ""}
                </div>
                {r.specialist_notes && <div style={{ fontSize: 12, color: MUTE, marginTop: 4, fontStyle: "italic" }}>{r.specialist_notes?.slice(0, 100)}</div>}
              </div>
              <Badge status={r.specialist_session_status || "pending"} />
              {r.specialist_confirmation_status && r.specialist_confirmation_status !== "confirmed" && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: AMBER, background: "#FEF3C7", padding: "3px 8px", borderRadius: 999 }}>
                  📞 {r.specialist_confirmation_status}
                </span>
              )}
              {(r.specialist_session_status === "closed" || r.specialist_session_status === "done") && staff?.role === "doctor" && (
                <button onClick={() => verifySpecWork(r.appointment_id)} style={{
                  border: `2px solid ${GREEN}`, background: "#fff", color: GREEN,
                  borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 12.5, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <CheckCircle size={14} /> Verify & Create Payable
                </button>
              )}
            </div>
          ))}

          {/* ── Lab Orders ── */}
          {tab === "lab_orders" && data.map((r: any) => (
            <div key={r.id} style={{
              background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 14, padding: 14,
              display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 800, color: INK, fontSize: 15 }}>
                  {r.work_type || "Lab order"} <span style={{ color: MUTE, fontWeight: 600, fontSize: 12 }}>#{r.serial_no}</span>
                </div>
                <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>
                  {r.patient_name} · {r.vendor_name || "No vendor"}
                  {r.sent_date ? ` · Sent ${r.sent_date}` : ""}
                  {r.expected_date ? ` · Due ${r.expected_date}` : ""}
                </div>
              </div>
              <Badge status={r.status || "pending"} />
              <div style={{ textAlign: "right", minWidth: 80 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: INK }}>{fmt(r.cost)}</div>
                {r.paid > 0 && <div style={{ fontSize: 11, color: GREEN }}>Paid {fmt(r.paid)}</div>}
              </div>
            </div>
          ))}

          {/* ── Lab Payables ── */}
          {tab === "lab_pay" && data.map((r: any) => (
            <div key={r.lab_order_id} style={{
              background: "#fff", border: `1.5px solid ${r.outstanding > 0 ? "#FECACA" : LINE}`,
              borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 800, color: INK, fontSize: 15 }}>{r.vendor_name}</div>
                <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>
                  {r.work_type} · {r.patient_name} · #{r.serial_no}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: MUTE }}>Cost: {fmt(r.order_cost)} · Paid: {fmt(r.paid_amount)}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: r.outstanding > 0 ? RED : GREEN }}>
                  {r.outstanding > 0 ? `Due ${fmt(r.outstanding)}` : "Settled ✅"}
                </div>
              </div>
            </div>
          ))}

          {/* ── Specialist Payables ── */}
          {tab === "spec_pay" && data.map((r: any) => (
            <div key={r.earning_id} style={{
              background: "#fff", border: `1.5px solid ${r.outstanding > 0 ? "#FECACA" : LINE}`,
              borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 800, color: INK, fontSize: 15 }}>{r.specialist_name}</div>
                <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>
                  {r.patient_name} · {r.case_status || "pending"}
                  {r.earned_at ? ` · ${r.earned_at.slice(0, 10)}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: MUTE }}>Earned: {fmt(r.earning_amount)} · Settled: {fmt(r.settled_amount || 0)}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: r.outstanding > 0 ? RED : GREEN }}>
                  {r.outstanding > 0 ? `Due ${fmt(r.outstanding)}` : "Settled ✅"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
