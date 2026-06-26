"use client";
/**
 * components/TreatmentKanban.tsx — Bundle S
 *
 * Trello-style 3+ column board for treatment plans.
 * Columns are configurable per-clinic (kanban_columns table).
 * Default: Proposed / Planned / In Progress / Completed.
 *
 * HTML5 native drag-drop (no extra deps).
 * Click card → opens treatment plan in workspace.
 */

import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import DefaultAvatar from "./DefaultAvatar";

const A = "#0E7C7B";
const A_DEEP = "#0A5C5B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const BG = "#F8FAFC";

export default function TreatmentKanban({ staff, show, accent = A, onOpenPlan }: any) {
  const [columns, setColumns] = useState<any[]>([]);
  const [plans, setPlans] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [filterDoctor, setFilterDoctor] = useState<string>("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [draggingPlan, setDraggingPlan] = useState<any | null>(null);

  const load = async () => {
    if (!staff?.clinic_id) return;
    setLoading(true);
    try {
      const [colData, planData, staffData] = await Promise.all([
        api.apiFetch?.(`/api/kanban/columns?clinic_id=${staff.clinic_id}`),
        api.apiFetch?.(`/api/kanban/plans?clinic_id=${staff.clinic_id}${filterDoctor ? `&doctor_id=${filterDoctor}` : ""}`),
        api.getStaffList(staff.clinic_id).catch(() => []),
      ]);
      setColumns(colData?.columns || []);
      setPlans(planData?.by_status || {});
      const allStaff = Array.isArray(staffData) ? staffData : staffData?.staff || [];
      setDoctors(allStaff.filter((s: any) => s.role === "doctor" && s.is_active !== false));
    } catch (e: any) { show("Error: " + e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filterDoctor, staff?.clinic_id]); // eslint-disable-line

  const onDragStart = (e: React.DragEvent, plan: any) => {
    setDraggingPlan(plan);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = async (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    if (!draggingPlan) return;
    const plan = draggingPlan;
    setDraggingPlan(null);
    if (plan.status === columnStatus) return;

    // Optimistic UI update
    const oldStatus = plan.status;
    const newPlans = { ...plans };
    newPlans[oldStatus] = (newPlans[oldStatus] || []).filter(p => p.id !== plan.id);
    newPlans[columnStatus] = [{ ...plan, status: columnStatus }, ...(newPlans[columnStatus] || [])];
    setPlans(newPlans);

    try {
      await api.apiFetch?.(`/api/kanban/move`, {
        method: "POST",
        body: JSON.stringify({ plan_id: plan.id, new_status: columnStatus, new_position: 0 }),
      });
      show(`✓ Moved to ${columns.find(c => c.plan_status === columnStatus)?.label || columnStatus}`);
    } catch (e: any) {
      show("Error: " + e.message);
      load();  // rollback by reloading
    }
  };

  // Search filter
  const searched = useMemo(() => {
    if (!search.trim()) return plans;
    const q = search.toLowerCase();
    const result: Record<string, any[]> = {};
    Object.entries(plans).forEach(([status, arr]) => {
      result[status] = arr.filter(p =>
        (p.patient_name || "").toLowerCase().includes(q) ||
        (p.title || "").toLowerCase().includes(q)
      );
    });
    return result;
  }, [plans, search]);

  // Stats
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    Object.entries(searched).forEach(([k, v]) => { t[k] = v.length; });
    return t;
  }, [searched]);
  const totalAmount = useMemo(() => {
    let bill = 0, paid = 0;
    Object.values(searched).flat().forEach((p: any) => {
      bill += p.amount_total || 0;
      paid += p.amount_paid || 0;
    });
    return { bill, paid, outstanding: bill - paid };
  }, [searched]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" as const, marginBottom: 14, flexWrap: "wrap" as const, gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>🗂 Treatment Kanban</h1>
        <button onClick={load} style={btnGhost}>↻ Refresh</button>
      </div>

      {/* Top bar */}
      <div style={{
        display: "flex", gap: 10, alignItems: "center" as const, flexWrap: "wrap" as const,
        marginBottom: 14, padding: 12, background: "#fff", borderRadius: 14, border: `1px solid ${LINE}`,
      }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔎 Search patient or treatment…"
          style={{ ...input, flex: 1, minWidth: 200, padding: "8px 12px" }} />
        <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)} style={input}>
          <option value="">All doctors</option>
          {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
        </select>
      </div>

      {/* Stats summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        <Stat label="Total plans" value={Object.values(totals).reduce((a, b) => a + b, 0)} color={A_DEEP} />
        <Stat label="Total billed" value={`₹${totalAmount.bill.toLocaleString()}`} color="#3B82F6" />
        <Stat label="Outstanding" value={`₹${totalAmount.outstanding.toLocaleString()}`}
          color={totalAmount.outstanding > 0 ? "#EF4444" : "#10B981"} />
      </div>

      {loading && <div style={loadingDiv}>⏳ Loading kanban…</div>}

      {!loading && columns.length === 0 && (
        <div style={loadingDiv}>No columns configured. Add columns in Settings → Kanban.</div>
      )}

      {/* Kanban board */}
      {!loading && columns.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))`,
          gap: 12, overflowX: "auto" as const, paddingBottom: 8,
        }}>
          {columns.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              plans={searched[col.plan_status] || []}
              draggingPlan={draggingPlan}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onOpenPlan={onOpenPlan}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Column
// ─────────────────────────────────────────────────────────────────────────
function KanbanColumn({ column, plans, draggingPlan, onDragStart, onDragOver, onDrop, onOpenPlan }: any) {
  const [isDragOver, setIsDragOver] = useState(false);
  const totalAmount = plans.reduce((sum: number, p: any) => sum + (p.amount_total || 0), 0);

  return (
    <div
      onDragOver={(e) => { onDragOver(e); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); onDrop(e, column.plan_status); }}
      style={{
        background: isDragOver ? `${column.color}11` : BG,
        borderRadius: 14, padding: 10,
        border: isDragOver ? `2px dashed ${column.color}` : `1px solid ${LINE}`,
        transition: "all 0.15s",
        minHeight: 400,
      }}
    >
      {/* Column header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center" as const,
        padding: "4px 6px 10px", borderBottom: `2px solid ${column.color}`, marginBottom: 8,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>{column.label}</div>
          <div style={{ fontSize: 10, color: MUTE, marginTop: 1 }}>₹{totalAmount.toLocaleString()}</div>
        </div>
        <span style={{
          background: `${column.color}1A`, color: column.color,
          padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800,
        }}>{plans.length}</span>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
        {plans.map((p: any) => (
          <PlanCard key={p.id} plan={p}
            onDragStart={(e: any) => onDragStart(e, p)}
            onClick={() => onOpenPlan?.(p)}
            color={column.color} />
        ))}
        {plans.length === 0 && (
          <div style={{
            padding: 20, textAlign: "center" as const, color: MUTE, fontSize: 12,
            fontStyle: "italic" as const,
          }}>Empty</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Plan card (draggable)
// ─────────────────────────────────────────────────────────────────────────
function PlanCard({ plan, onDragStart, onClick, color }: any) {
  const pct = plan.sittings_count > 0 ? (plan.sittings_done / plan.sittings_count) * 100 : 0;
  const paidPct = plan.amount_total > 0 ? (plan.amount_paid / plan.amount_total) * 100 : 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        background: "#fff", borderRadius: 10, padding: 11,
        border: `1px solid ${LINE}`, borderLeft: `3px solid ${color}`,
        cursor: "grab", boxShadow: "0 1px 3px #0f172a08",
      }}
      onMouseOver={(e) => { e.currentTarget.style.boxShadow = `0 4px 10px ${color}33`; }}
      onMouseOut={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px #0f172a08"; }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" as const, marginBottom: 7 }}>
        <DefaultAvatar name={plan.patient_name} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: INK,
            overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const }}>
            {plan.patient_name}
          </div>
          <div style={{ fontSize: 10, color: MUTE,
            overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const }}>
            {plan.doctor_name && `Dr. ${plan.doctor_name}`}
          </div>
        </div>
      </div>

      {plan.title && (
        <div style={{
          fontSize: 12, color: INK, marginBottom: 7, lineHeight: 1.3,
          overflow: "hidden" as const, display: "-webkit-box" as const,
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
        }}>{plan.title}</div>
      )}

      {/* Progress bar — sittings */}
      {plan.sittings_count > 0 && (
        <div style={{ marginBottom: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: MUTE, marginBottom: 2 }}>
            <span>Sittings: {plan.sittings_done}/{plan.sittings_count}</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div style={{ height: 4, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" as const }}>
            <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {/* Money */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: MUTE }}>
          ₹{plan.amount_total?.toLocaleString() || 0}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: paidPct === 100 ? "#10B981" : paidPct > 0 ? "#F59E0B" : "#EF4444",
        }}>
          {paidPct === 100 ? "✓ Paid" : paidPct > 0 ? `${Math.round(paidPct)}% paid` : "Unpaid"}
        </span>
      </div>

      {plan.last_touch && (
        <div style={{ fontSize: 9, color: MUTE, marginTop: 4 }}>
          Last: {new Date(plan.last_touch).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: any) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 12, border: `1px solid ${LINE}` }}>
      <div style={{ fontSize: 10, color: MUTE, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 3 }}>{value}</div>
    </div>
  );
}

const input: any = {
  padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${LINE}`,
  fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff",
  boxSizing: "border-box" as const,
};
const btnGhost: any = {
  background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, padding: "8px 14px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const loadingDiv: any = {
  padding: 40, textAlign: "center" as const, color: MUTE, fontSize: 14,
  background: "#fff", borderRadius: 14,
};
