/**
 * components/TreatmentPlanCards.tsx — Bundle T.1
 *
 * Redesigned treatment plan card system for the Doctor Treatment Workspace.
 * Replaces the flat card list with richer cards showing:
 *   • Multi-sitting segmented progress bar
 *   • Per-item payment status (paid / partial / pending)
 *   • Lab dependency badge (waiting / in-progress / delivered)
 *   • Completed step timeline
 *   • Priority / urgency indicator
 *   • Group-by-diagnosis accordion view
 *   • Inline tooth chip buttons
 *
 * Uses inline styles only (no Tailwind). Brand teal #0E7C7B.
 *
 * Props: items, accent, fmt, show, reload, onEdit, onJumpToTooth, labOrders
 */
"use client";
import React, { useState, useMemo } from "react";

// ──────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────
interface PlanItem {
  id: string;
  treatment_name: string;
  teeth?: number[];
  area_label?: string;
  diagnosis?: string;
  examination_summary?: string;
  status: "advised" | "in_progress" | "completed" | "cancelled";
  suggested_rate: number;
  doctor_rate: number;
  discount: number;
  final_amount: number;
  completed_steps?: string[];
  sittings?: Sitting[];
  priority?: "routine" | "urgent" | "emergency";
  lab_order_id?: string;
  notes?: string;
  created_at?: string;
}

interface Sitting {
  id: string;
  sitting_number: number;
  status: "scheduled" | "completed" | "cancelled";
  amount_paid: number;
  scheduled_date?: string;
  completed_date?: string;
  notes?: string;
}

interface LabOrder {
  id: string;
  treatment_plan_item_id?: string;
  status: "ordered" | "in_progress" | "trial_ready" | "delivered" | "cancelled";
  vendor_name?: string;
  due_date?: string;
}

interface TreatmentPlanCardsProps {
  items: PlanItem[];
  accent: string;
  fmt: (n: number) => string;
  show: (msg: string) => void;
  reload: () => void;
  onEdit: (item: PlanItem) => void;
  onDelete: (item: PlanItem) => Promise<void>;
  onDuplicate: (item: PlanItem) => Promise<void>;
  onStatusCycle: (item: PlanItem) => Promise<void>;
  onJumpToTooth?: (tooth: number) => void;
  labOrders?: LabOrder[];
  compact?: boolean;
}

// ──────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────
const SHADOW = "0 2px 12px rgba(0,0,0,0.06)";
const SHADOW_HOVER = "0 4px 20px rgba(0,0,0,0.10)";
const INK = "#0F172A";
const MUTE = "#64748B";
const SOFT = "#E2E8F0";
const BG = "#F8FAFC";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  advised:     { color: "#6366F1", bg: "#EEF2FF", label: "Planned",      icon: "📋" },
  in_progress: { color: "#F59E0B", bg: "#FFFBEB", label: "In Progress",  icon: "⏳" },
  completed:   { color: "#10B981", bg: "#ECFDF5", label: "Completed",    icon: "✓" },
  cancelled:   { color: "#EF4444", bg: "#FEF2F2", label: "Cancelled",    icon: "✕" },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string; dot: string }> = {
  routine:   { color: "#10B981", label: "Routine",   dot: "🟢" },
  urgent:    { color: "#F59E0B", label: "Urgent",    dot: "🟡" },
  emergency: { color: "#EF4444", label: "Emergency", dot: "🔴" },
};

const LAB_STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  ordered:     { color: "#6366F1", bg: "#EEF2FF", label: "Lab Ordered",     icon: "📦" },
  in_progress: { color: "#F59E0B", bg: "#FFFBEB", label: "Lab In Progress", icon: "⚙️" },
  trial_ready: { color: "#8B5CF6", bg: "#F5F3FF", label: "Trial Ready",     icon: "👁️" },
  delivered:   { color: "#10B981", bg: "#ECFDF5", label: "Lab Delivered",   icon: "✅" },
  cancelled:   { color: "#EF4444", bg: "#FEF2F2", label: "Lab Cancelled",  icon: "✕" },
};

// ──────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────

/** Segmented sitting progress bar */
function SittingProgress({ sittings, accent }: { sittings: Sitting[]; accent: string }) {
  if (!sittings || sittings.length === 0) return null;
  const total = sittings.length;
  const done = sittings.filter(s => s.status === "completed").length;
  const pct = Math.round((done / total) * 100);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTE, marginBottom: 3 }}>
        <span>Sittings: {done}/{total}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ display: "flex", gap: 2, height: 6, borderRadius: 4, overflow: "hidden", background: "#F1F5F9" }}>
        {sittings.map((s, i) => (
          <div
            key={s.id || i}
            style={{
              flex: 1,
              background: s.status === "completed" ? accent
                : s.status === "cancelled" ? "#FCA5A5"
                : i === done ? `${accent}55` : "#E2E8F0",
              borderRadius: i === 0 ? "4px 0 0 4px" : i === total - 1 ? "0 4px 4px 0" : 0,
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Payment status pill */
function PaymentBadge({ sittings, finalAmount, accent, fmt }: { sittings?: Sitting[]; finalAmount: number; accent: string; fmt: (n: number) => string }) {
  const totalPaid = (sittings || []).reduce((s, sit) => s + (sit.amount_paid || 0), 0);
  const remaining = Math.max(0, finalAmount - totalPaid);
  const paidPct = finalAmount > 0 ? Math.round((totalPaid / finalAmount) * 100) : 0;

  let color = "#EF4444";
  let bg = "#FEF2F2";
  let label = "Unpaid";

  if (paidPct >= 100) { color = "#10B981"; bg = "#ECFDF5"; label = "Paid in Full"; }
  else if (paidPct > 0) { color = "#F59E0B"; bg = "#FFFBEB"; label = `${paidPct}% Paid`; }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, borderRadius: 999, padding: "2px 8px" }}>
        {label}
      </span>
      {remaining > 0 && (
        <span style={{ fontSize: 10, color: MUTE }}>
          {fmt(remaining)} remaining
        </span>
      )}
    </div>
  );
}

/** Lab dependency badge */
function LabBadge({ labOrder }: { labOrder?: LabOrder }) {
  if (!labOrder) return null;
  const cfg = LAB_STATUS_CONFIG[labOrder.status] || LAB_STATUS_CONFIG.ordered;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg,
      borderRadius: 999, padding: "2px 8px",
    }}>
      {cfg.icon} {cfg.label}
      {labOrder.vendor_name && <span style={{ fontWeight: 400, opacity: 0.7 }}> · {labOrder.vendor_name}</span>}
    </span>
  );
}

/** Completed step timeline dots */
function StepTimeline({ steps, accent }: { steps?: string[]; accent: string }) {
  if (!steps || steps.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
      {steps.map((step, i) => (
        <span key={i} style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          fontSize: 10, color: "#059669", background: "#ECFDF5",
          borderRadius: 6, padding: "1px 7px", fontWeight: 600,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
          {step}
        </span>
      ))}
    </div>
  );
}

/** Tooth chip buttons */
function ToothChips({ teeth, accent, onJumpToTooth }: { teeth: number[]; accent: string; onJumpToTooth?: (n: number) => void }) {
  if (!teeth || teeth.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      {teeth.map(n => (
        <button
          key={n}
          onClick={() => onJumpToTooth?.(n)}
          style={{
            fontSize: 11, fontWeight: 800,
            background: `${accent}12`, color: accent,
            border: `1.5px solid ${accent}33`,
            borderRadius: 8, padding: "2px 8px",
            cursor: onJumpToTooth ? "pointer" : "default",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = `${accent}25`; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = `${accent}12`; }}
        >
          #{n}
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Action button
// ──────────────────────────────────────────────────────
function ActionBtn({ icon, title, color, onClick, size = 32 }: { icon: string; title: string; color: string; onClick: () => void; size?: number }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center",
        background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 10,
        cursor: "pointer", fontSize: 13, transition: "all 0.15s ease",
      }}
      onMouseEnter={e => { (e.target as HTMLElement).style.background = `${color}22`; (e.target as HTMLElement).style.borderColor = `${color}55`; }}
      onMouseLeave={e => { (e.target as HTMLElement).style.background = `${color}10`; (e.target as HTMLElement).style.borderColor = `${color}30`; }}
    >
      {icon}
    </button>
  );
}

// ──────────────────────────────────────────────────────
// Single Treatment Card
// ──────────────────────────────────────────────────────
function TreatmentCard({
  item, accent, fmt, onEdit, onDelete, onDuplicate, onStatusCycle,
  onJumpToTooth, labOrder, isRecent, expanded, onToggleExpand,
}: {
  item: PlanItem; accent: string; fmt: (n: number) => string;
  onEdit: () => void; onDelete: () => void; onDuplicate: () => void;
  onStatusCycle: () => void; onJumpToTooth?: (n: number) => void;
  labOrder?: LabOrder; isRecent?: boolean; expanded: boolean; onToggleExpand: () => void;
}) {
  const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.advised;
  const pr = PRIORITY_CONFIG[item.priority || "routine"] || PRIORITY_CONFIG.routine;
  const isCancelled = item.status === "cancelled";
  const teethArr = Array.isArray(item.teeth) ? item.teeth : [];

  return (
    <div
      style={{
        background: isRecent ? `${accent}06` : "#fff",
        borderRadius: 16,
        boxShadow: SHADOW,
        borderLeft: `4px solid ${st.color}`,
        opacity: isCancelled ? 0.55 : 1,
        transition: "all 0.2s ease",
        overflow: "hidden",
      }}
      onMouseEnter={e => { if (!isCancelled) (e.currentTarget as HTMLElement).style.boxShadow = SHADOW_HOVER; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = SHADOW; }}
    >
      {/* ── Header row ── */}
      <div style={{ padding: "14px 16px 10px", display: "flex", gap: 12, alignItems: "flex-start" }}>

        {/* Left: teeth + diagnosis */}
        <div style={{ minWidth: 80, display: "flex", flexDirection: "column", gap: 4 }}>
          <ToothChips teeth={teethArr} accent={accent} onJumpToTooth={onJumpToTooth} />
          {teethArr.length === 0 && <div style={{ fontWeight: 700, fontSize: 12, color: MUTE }}>{item.area_label || "General"}</div>}
          {item.diagnosis && (
            <div style={{ fontSize: 10, color: MUTE, lineHeight: 1.3 }}>{item.diagnosis}</div>
          )}
        </div>

        {/* Center: treatment name + status + priority */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontWeight: 800, fontSize: 15,
              textDecoration: isCancelled ? "line-through" : "none",
              color: INK,
            }}>
              {item.treatment_name}
            </span>
            {item.priority && item.priority !== "routine" && (
              <span style={{ fontSize: 10, fontWeight: 700, color: pr.color }}>{pr.dot}</span>
            )}
          </div>

          {/* Status pill — clickable to cycle */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <button
              onClick={onStatusCycle}
              style={{
                background: st.bg, color: st.color,
                border: `1px solid ${st.color}33`, borderRadius: 999,
                padding: "2px 10px", fontSize: 11, fontWeight: 800,
                cursor: "pointer", transition: "all 0.15s ease",
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = st.color; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = `${st.color}33`; }}
            >
              {st.icon} {st.label}
            </button>
            <LabBadge labOrder={labOrder} />
          </div>

          <StepTimeline steps={item.completed_steps} accent={accent} />
        </div>

        {/* Right: financial + actions */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, minWidth: 130 }}>
          {/* Cost breakdown */}
          <div style={{ textAlign: "right" as const }}>
            {item.suggested_rate !== item.doctor_rate && (
              <div style={{ fontSize: 10, color: MUTE, textDecoration: "line-through" }}>₹{item.suggested_rate.toLocaleString()}</div>
            )}
            <div style={{ fontWeight: 900, color: accent, fontSize: 16 }}>{fmt(item.final_amount)}</div>
            {item.discount > 0 && (
              <div style={{ fontSize: 10, color: "#DC2626", fontWeight: 600 }}>−{fmt(item.discount)} discount</div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 4 }}>
            <ActionBtn icon="✏️" title="Edit" color="#3B82F6" onClick={onEdit} />
            <ActionBtn icon="⧉" title="Duplicate" color="#8B5CF6" onClick={onDuplicate} />
            <ActionBtn icon="🗑" title="Delete" color="#EF4444" onClick={onDelete} />
            <ActionBtn icon={expanded ? "▲" : "▼"} title="Details" color={MUTE} onClick={onToggleExpand} />
          </div>
        </div>
      </div>

      {/* ── Sitting progress bar ── */}
      {item.sittings && item.sittings.length > 0 && (
        <div style={{ padding: "0 16px 8px" }}>
          <SittingProgress sittings={item.sittings} accent={accent} />
        </div>
      )}

      {/* ── Payment badge row ── */}
      <div style={{ padding: "0 16px 10px" }}>
        <PaymentBadge sittings={item.sittings} finalAmount={item.final_amount} accent={accent} fmt={fmt} />
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${SOFT}`, padding: "12px 16px", background: BG }}>
          {/* Sitting timeline */}
          {item.sittings && item.sittings.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginBottom: 6 }}>Sitting Timeline</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {item.sittings.map((s, i) => {
                  const sColor = s.status === "completed" ? "#10B981" : s.status === "cancelled" ? "#EF4444" : MUTE;
                  const dateStr = s.completed_date
                    ? new Date(s.completed_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                    : s.scheduled_date
                      ? new Date(s.scheduled_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                      : "TBD";
                  return (
                    <div key={s.id || i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {/* Timeline dot + line */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: s.status === "completed" ? "#10B981" : "#E2E8F0",
                          border: `2px solid ${sColor}`,
                        }} />
                        {i < item.sittings!.length - 1 && (
                          <div style={{ width: 2, height: 16, background: SOFT }} />
                        )}
                      </div>
                      <div style={{ flex: 1, fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: sColor }}>Sitting {s.sitting_number}</span>
                        <span style={{ color: MUTE }}> · {dateStr}</span>
                        {s.amount_paid > 0 && <span style={{ color: "#10B981", fontWeight: 600 }}> · ₹{s.amount_paid.toLocaleString()}</span>}
                        {s.notes && <div style={{ fontSize: 10, color: MUTE, marginTop: 1 }}>{s.notes}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div style={{ fontSize: 12, color: MUTE, lineHeight: 1.4, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: INK }}>Notes: </span>{item.notes}
            </div>
          )}

          {/* Examination summary */}
          {item.examination_summary && (
            <div style={{ fontSize: 12, color: MUTE, lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700, color: INK }}>Exam: </span>{item.examination_summary}
            </div>
          )}

          {/* Lab order details */}
          {labOrder && (
            <div style={{ marginTop: 8, padding: "8px 10px", background: "#fff", borderRadius: 10, border: `1px dashed ${SOFT}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: INK }}>Lab Order Details</div>
              <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>
                Vendor: {labOrder.vendor_name || "—"} · Due: {labOrder.due_date ? new Date(labOrder.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
              </div>
            </div>
          )}

          {/* Created date */}
          {item.created_at && (
            <div style={{ fontSize: 10, color: MUTE, marginTop: 6 }}>
              Added {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Summary bar
// ──────────────────────────────────────────────────────
function PlanSummaryBar({ items, accent, fmt }: { items: PlanItem[]; accent: string; fmt: (n: number) => string }) {
  const total = items.reduce((s, i) => s + i.final_amount, 0);
  const totalPaid = items.reduce((s, i) => s + (i.sittings || []).reduce((ss, sit) => ss + (sit.amount_paid || 0), 0), 0);
  const remaining = Math.max(0, total - totalPaid);
  const planned = items.filter(i => i.status === "advised").length;
  const inProg = items.filter(i => i.status === "in_progress").length;
  const done = items.filter(i => i.status === "completed").length;
  const cancelled = items.filter(i => i.status === "cancelled").length;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
      gap: 10, padding: "14px 16px",
      background: "linear-gradient(135deg, #F8FAFC, #fff)",
      borderRadius: 14, border: `1px solid ${SOFT}`,
    }}>
      <div>
        <div style={{ fontSize: 10, color: MUTE, fontWeight: 600 }}>PLAN TOTAL</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: accent }}>{fmt(total)}</div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: MUTE, fontWeight: 600 }}>COLLECTED</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#10B981" }}>{fmt(totalPaid)}</div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: MUTE, fontWeight: 600 }}>REMAINING</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: remaining > 0 ? "#EF4444" : "#10B981" }}>{fmt(remaining)}</div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: MUTE, fontWeight: 600 }}>STATUS</div>
        <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
          {planned > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#6366F1", background: "#EEF2FF", borderRadius: 999, padding: "1px 6px" }}>{planned} planned</span>}
          {inProg > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#F59E0B", background: "#FFFBEB", borderRadius: 999, padding: "1px 6px" }}>{inProg} active</span>}
          {done > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#10B981", background: "#ECFDF5", borderRadius: 999, padding: "1px 6px" }}>{done} done</span>}
          {cancelled > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#EF4444", background: "#FEF2F2", borderRadius: 999, padding: "1px 6px" }}>{cancelled} x</span>}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// View mode toggles
// ──────────────────────────────────────────────────────
type ViewMode = "list" | "grouped" | "compact";

// ──────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────
export default function TreatmentPlanCards(props: TreatmentPlanCardsProps) {
  const { items, accent, fmt, show, reload, onEdit, onDelete, onDuplicate, onStatusCycle, onJumpToTooth, labOrders = [], compact = false } = props;
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recentId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "status" | "amount">("default");
  const [hideCompleted, setHideCompleted] = useState(false);

  // Map lab orders to items
  const labMap = useMemo(() => {
    const m: Record<string, LabOrder> = {};
    labOrders.forEach(lo => { if (lo.treatment_plan_item_id) m[lo.treatment_plan_item_id] = lo; });
    return m;
  }, [labOrders]);

  // Sort + filter
  const visibleItems = useMemo(() => {
    let filtered = hideCompleted ? items.filter(i => i.status !== "completed" && i.status !== "cancelled") : items;
    if (sortBy === "status") {
      const order: Record<string, number> = { in_progress: 0, advised: 1, completed: 2, cancelled: 3 };
      filtered = [...filtered].sort((a, b) => (order[a.status] ?? 1) - (order[b.status] ?? 1));
    } else if (sortBy === "amount") {
      filtered = [...filtered].sort((a, b) => b.final_amount - a.final_amount);
    }
    return filtered;
  }, [items, sortBy, hideCompleted]);

  // Group by diagnosis for grouped view
  const grouped = useMemo(() => {
    const groups: Record<string, PlanItem[]> = {};
    visibleItems.forEach(item => {
      const key = item.diagnosis || "General";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [visibleItems]);

  if (items.length === 0) {
    return (
      <div style={{ padding: "20px 18px", color: MUTE, fontSize: 13.5 }}>
        No treatments yet — pick one above. Tooth chart, prescriptions and financials all update automatically from here.
      </div>
    );
  }

  const toggleBtn = (mode: ViewMode, label: string) => (
    <button
      onClick={() => setViewMode(mode)}
      style={{
        border: "none", borderRadius: 8,
        padding: "5px 10px", fontSize: 11, fontWeight: 700,
        background: viewMode === mode ? accent : "#F1F5F9",
        color: viewMode === mode ? "#fff" : MUTE,
        cursor: "pointer", transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );

  const renderCard = (item: PlanItem) => (
    <TreatmentCard
      key={item.id}
      item={item}
      accent={accent}
      fmt={fmt}
      onEdit={() => onEdit(item)}
      onDelete={async () => onDelete(item)}
      onDuplicate={async () => onDuplicate(item)}
      onStatusCycle={async () => onStatusCycle(item)}
      onJumpToTooth={onJumpToTooth}
      labOrder={labMap[item.id]}
      isRecent={recentId === item.id}
      expanded={expandedId === item.id}
      onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
    />
  );

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 16px", flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {toggleBtn("list", "📋 List")}
          {toggleBtn("grouped", "🏷 By Diagnosis")}
          {toggleBtn("compact", "▤ Compact")}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{ fontSize: 11, border: `1px solid ${SOFT}`, borderRadius: 8, padding: "4px 8px", background: "#fff", color: MUTE, cursor: "pointer" }}
          >
            <option value="default">Default order</option>
            <option value="status">By status</option>
            <option value="amount">By amount</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: MUTE, cursor: "pointer" }}>
            <input type="checkbox" checked={hideCompleted} onChange={e => setHideCompleted(e.target.checked)} />
            Hide done
          </label>
        </div>
      </div>

      {/* ── Summary bar ── */}
      <div style={{ padding: "0 16px 10px" }}>
        <PlanSummaryBar items={items} accent={accent} fmt={fmt} />
      </div>

      {/* ── Cards ── */}
      <div style={{ padding: "0 16px 14px" }}>
        {viewMode === "grouped" ? (
          // Grouped by diagnosis
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(grouped).map(([diagnosis, groupItems]) => (
              <div key={diagnosis}>
                <div style={{
                  fontSize: 12, fontWeight: 800, color: accent,
                  padding: "6px 12px", background: `${accent}08`,
                  borderRadius: "10px 10px 0 0", borderBottom: `2px solid ${accent}22`,
                }}>
                  🏷 {diagnosis} ({groupItems.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
                  {groupItems.map(renderCard)}
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === "compact" ? (
          // Compact table-like view
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {visibleItems.map(item => {
              const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.advised;
              const teethArr = Array.isArray(item.teeth) ? item.teeth : [];
              return (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 90px 80px 80px",
                    gap: 8, alignItems: "center",
                    padding: "8px 12px", borderRadius: 10,
                    background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    borderLeft: `3px solid ${st.color}`,
                    opacity: item.status === "cancelled" ? 0.5 : 1,
                    fontSize: 12,
                  }}
                >
                  <div style={{ color: MUTE, fontSize: 11 }}>
                    {teethArr.length > 0 ? teethArr.map(n => `#${n}`).join(",") : item.area_label || "Gen."}
                  </div>
                  <div style={{ fontWeight: 700, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {item.treatment_name}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: st.color }}>{st.label}</div>
                  <div style={{ fontWeight: 800, color: accent, textAlign: "right" as const }}>{fmt(item.final_amount)}</div>
                  <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
                    <ActionBtn icon="✏️" title="Edit" color="#3B82F6" onClick={() => onEdit(item)} size={26} />
                    <ActionBtn icon="🗑" title="Delete" color="#EF4444" onClick={() => onDelete(item)} size={26} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Default list view
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleItems.map(renderCard)}
          </div>
        )}
      </div>

      {/* ── Plan total (outside cards) ── */}
      <div style={{ padding: "0 16px 14px", textAlign: "right" as const }}>
        <span style={{ fontWeight: 900, color: accent, fontSize: 16 }}>
          PLAN TOTAL: {fmt(items.reduce((s, i) => s + i.final_amount, 0))}
        </span>
        {items.filter(i => i.status !== "cancelled").length !== items.length && (
          <span style={{ fontSize: 11, color: MUTE, marginLeft: 8 }}>
            (Active: {fmt(items.filter(i => i.status !== "cancelled").reduce((s, i) => s + i.final_amount, 0))})
          </span>
        )}
      </div>
    </div>
  );
}

export { TreatmentCard, PlanSummaryBar, SittingProgress, PaymentBadge, LabBadge, StepTimeline, ToothChips };
