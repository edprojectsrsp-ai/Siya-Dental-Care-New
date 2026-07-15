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
import React, { useState, useMemo, useEffect } from "react";

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
  onQuickPrice?: (item: PlanItem, rate: number, discount: number) => Promise<void> | void;
  onJumpToTooth?: (tooth: number) => void;
  onOpenInCanvas?: (item: PlanItem) => void;
  labOrders?: LabOrder[];
  compact?: boolean;
  /** Hides toolbar & extra actions — chair-side simple mode */
  simple?: boolean;
}

// ──────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────
const SHADOW = "0 2px 12px rgba(0,0,0,0.06)";
const SHADOW_HOVER = "0 4px 20px rgba(0,0,0,0.10)";
const INK = "#0F172A";
const MUTE = "#64748B";
const SOFT = "#E2E8F0";
const LINE = "#E2E8F0";
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

// Labeled text button — clearer than an emoji for non-technical users
function TextBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: `${color}10`, border: `1.5px solid ${color}33`, borderRadius: 9,
        color, fontWeight: 800, fontSize: 12, padding: "6px 11px", cursor: "pointer",
        fontFamily: "inherit", transition: "all 0.15s ease",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}20`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}10`; }}
    >
      {label}
    </button>
  );
}

// ──────────────────────────────────────────────────────
// Single Treatment Card
// ──────────────────────────────────────────────────────
function TreatmentCard({
  item, accent, fmt, onEdit, onDelete, onDuplicate, onStatusCycle, onQuickPrice,
  onJumpToTooth, onOpenInCanvas, labOrder, isRecent, expanded, onToggleExpand, simple,
}: {
  item: PlanItem; accent: string; fmt: (n: number) => string;
  onEdit: () => void; onDelete: () => void; onDuplicate: () => void;
  onStatusCycle: () => void; onQuickPrice?: (item: PlanItem, rate: number, discount: number) => Promise<void> | void;
  onJumpToTooth?: (n: number) => void;
  onOpenInCanvas?: () => void;
  labOrder?: LabOrder; isRecent?: boolean; expanded: boolean; onToggleExpand: () => void;
  simple?: boolean;
}) {
  const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.advised;
  const pr = PRIORITY_CONFIG[item.priority || "routine"] || PRIORITY_CONFIG.routine;
  const isCancelled = item.status === "cancelled";
  const teethArr = Array.isArray(item.teeth) ? item.teeth : [];

  const [rate, setRate] = useState(String(item.doctor_rate ?? item.suggested_rate ?? 0));
  const [disc, setDisc] = useState(String(item.discount ?? 0));
  useEffect(() => {
    setRate(String(item.doctor_rate ?? item.suggested_rate ?? 0));
    setDisc(String(item.discount ?? 0));
  }, [item.id, item.doctor_rate, item.suggested_rate, item.discount]);
  const num = (v: string) => Math.max(0, parseFloat(v.replace(/[^0-9.]/g, "")) || 0);
  const previewFinal = Math.max(0, num(rate) - num(disc));

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
        position: "relative",
      }}
      onMouseEnter={e => { if (!isCancelled) (e.currentTarget as HTMLElement).style.boxShadow = SHADOW_HOVER; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = SHADOW; }}
    >
      <button type="button" onClick={onDelete} title="Delete treatment card"
        aria-label={`Delete ${item.treatment_name || "treatment"} card`}
        style={{
          position: "absolute", top: 10, right: 10, zIndex: 3,
          width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
          border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#DC2626",
          borderRadius: 999, fontWeight: 950, fontSize: 17, lineHeight: 1,
          cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(220,38,38,.12)",
          transition: "background .15s, color .15s, box-shadow .15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "#DC2626";
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.boxShadow = "0 8px 18px rgba(220,38,38,.25)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "#FEF2F2";
          e.currentTarget.style.color = "#DC2626";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(220,38,38,.12)";
        }}
      >
        X
      </button>
      {/* ── Receipt-style layout — plain language for non-technical staff ── */}
      <div style={{ padding: "16px 48px 12px 18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
          {teethArr.length > 0 ? (
            <span style={{ background: `${accent}15`, color: accent, border: `2px solid ${accent}44`, borderRadius: 10, padding: "5px 12px", fontWeight: 900, fontSize: 14 }}>
              {teethArr.length === 1 ? `Tooth ${teethArr[0]}` : `Teeth ${teethArr.join(", ")}`}
            </span>
          ) : (
            <span style={{ background: SOFT, color: MUTE, borderRadius: 10, padding: "5px 12px", fontWeight: 800, fontSize: 13 }}>{item.area_label || "General"}</span>
          )}
          <button onClick={onStatusCycle} title="Tap to change status"
            style={{ background: st.bg, color: st.color, border: `2px solid ${st.color}44`, borderRadius: 10, padding: "5px 14px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            {st.label}
          </button>
          <LabBadge labOrder={labOrder} />
          {item.priority && item.priority !== "routine" && (
            <span style={{ fontSize: 12, fontWeight: 700, color: pr.color }}>{pr.label}</span>
          )}
        </div>

        <div style={{ fontWeight: 900, fontSize: 18, color: INK, textDecoration: isCancelled ? "line-through" : "none", marginBottom: 4, lineHeight: 1.3 }}>
          {item.treatment_name}
        </div>
        {item.diagnosis && (
          <div style={{ fontSize: 13, color: MUTE, marginBottom: 10 }}>Diagnosis: {item.diagnosis}</div>
        )}
        {teethArr.length > 0 && onJumpToTooth && (
          <div style={{ marginBottom: 10 }}>
            <ToothChips teeth={teethArr} accent={accent} onJumpToTooth={onJumpToTooth} />
          </div>
        )}
        <StepTimeline steps={item.completed_steps} accent={accent} />

        {/* Inline price — always visible, no hidden tap */}
        {onQuickPrice && (
          <div style={{ marginTop: 12, background: BG, borderRadius: 12, padding: 12, border: `1.5px solid ${SOFT}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>
                <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, marginBottom: 4 }}>RATE (₹)</div>
                <input type="text" inputMode="numeric" value={rate} onChange={e => setRate(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${LINE}`, borderRadius: 8, padding: "10px", fontSize: 16, fontWeight: 800, fontFamily: "inherit" }} />
              </label>
              <label>
                <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, marginBottom: 4 }}>DISCOUNT (₹)</div>
                <input type="text" inputMode="numeric" value={disc} onChange={e => setDisc(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${LINE}`, borderRadius: 8, padding: "10px", fontSize: 16, fontWeight: 800, fontFamily: "inherit" }} />
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: MUTE }}>Patient pays</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: accent }}>{fmt(previewFinal)}</span>
            </div>
            {(num(rate) !== (item.doctor_rate ?? 0) || num(disc) !== (item.discount ?? 0)) && (
              <button onClick={() => onQuickPrice(item, num(rate), num(disc))}
                style={{ width: "100%", marginTop: 10, border: "none", background: accent, color: "#fff", borderRadius: 10, padding: "11px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                Save price
              </button>
            )}
          </div>
        )}

        {!simple && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <TextBtn label="Full edit" color="#3B82F6" onClick={onEdit} />
            {onOpenInCanvas && teethArr.length > 0 && <TextBtn label="Open on chart" color={accent} onClick={onOpenInCanvas} />}
            <TextBtn label="Duplicate" color="#8B5CF6" onClick={onDuplicate} />
            <TextBtn label={expanded ? "Hide details" : "Show details"} color={MUTE} onClick={onToggleExpand} />
          </div>
        )}
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
  const { items, accent, fmt, show, reload, onEdit, onDelete, onDuplicate, onStatusCycle, onQuickPrice, onJumpToTooth, onOpenInCanvas, labOrders = [], compact = false, simple = false } = props;
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
      <div style={{ padding: "28px 20px", textAlign: "center", color: MUTE }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
        <div style={{ fontWeight: 800, fontSize: 15, color: INK, marginBottom: 4 }}>No treatments yet</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>Select a tooth on the chart above and tap a treatment chip — it appears here with price you can edit inline.</div>
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
      onQuickPrice={onQuickPrice}
      onJumpToTooth={onJumpToTooth}
      onOpenInCanvas={onOpenInCanvas ? () => onOpenInCanvas(item) : undefined}
      labOrder={labMap[item.id]}
      isRecent={recentId === item.id}
      expanded={expandedId === item.id}
      onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
      simple={simple}
    />
  );

  return (
    <div>
      {/* ── Toolbar ── */}
      {!simple && <div style={{
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
      </div>}

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
                    <ActionBtn icon="X" title="Delete" color="#EF4444" onClick={() => onDelete(item)} size={26} />
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
