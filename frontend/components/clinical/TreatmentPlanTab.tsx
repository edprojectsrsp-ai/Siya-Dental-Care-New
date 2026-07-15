"use client";
import { useState } from "react";
import { TreatmentPlanStrip } from "@/components/clinical/TreatmentPlanStrip";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";
const card = { background: "#fff", borderRadius: 20, padding: 22, boxShadow: SHADOW };

/** Dedicated Plan tab — tooth-wise summary, then white inline-edit treatment cards */
export function TreatmentPlanTab({
  W,
  accent,
  items,
  selectedTeeth,
  highlightId,
  onSelectTooth,
  onQuickPrice,
  onStatusCycle,
  onDelete,
  onEdit,
  onJumpToTreatment,
  onAddForTooth,
  catalog = [],
  onAddPlanItem,
  billingBlockers = [],
  billingReady = true,
  billingNudgeIds = [],
  hidePrices = false,
}: {
  W: any;
  accent: string;
  items: any[];
  catalog?: { id: string; name: string; rate?: number; is_tooth_based?: boolean }[];
  onAddPlanItem?: (params: {
    treatment: string; teeth: number[]; rate: number; discount: number; procedureId?: string | null;
  }) => Promise<void>;
  billingBlockers?: { treatment_name: string; reason: string }[];
  billingReady?: boolean;
  billingNudgeIds?: string[];
  /** Specialist mode — clinical only: no rates, no add, no confirm gate */
  hidePrices?: boolean;
  selectedTeeth: number[];
  highlightId?: string | null;
  onSelectTooth: (n: number) => void;
  onQuickPrice: (item: any, rate: number, discount: number, notes?: string, opts?: { price_confirmed?: boolean }) => void;
  onStatusCycle: (item: any) => void;
  onDelete: (item: any) => void;
  onEdit: (item: any) => void;
  onJumpToTreatment?: () => void;
  onAddForTooth?: (tooth: number) => void;
}) {
  const [groupMode, setGroupMode] = useState<"tooth" | "treatment">("tooth");
  const activeItems = items.filter((i: any) => i.status !== "cancelled");
  // Specialist cases + lab orders not linked to any plan item — shown as a
  // tracking strip here so the Plan tab is the one place to watch progress.
  const specialistCases = (W?.specialist_cases || []).filter((s: any) => s.session_status !== "verified");
  const unlinkedLabs = (W?.lab_orders || []).filter((lo: any) => !lo.treatment_plan_item_id && lo.status !== "approved");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {(specialistCases.length > 0 || unlinkedLabs.length > 0) && (
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
          background: "#fff", borderRadius: 16, padding: "12px 16px",
          border: `1.5px solid ${LINE}`, boxShadow: SHADOW,
        }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: INK }}>🤝 Tracking</span>
          {specialistCases.map((s: any) => (
            <span key={s.id || s.appointment_id} style={{ background: "#F5F3FF", color: "#5B21B6", borderRadius: 999, padding: "6px 12px", fontSize: 11.5, fontWeight: 800 }}>
              👨‍⚕️ {s.specialist_name || "Specialist"} · {s.session_status === "closed" ? "work done — verify in Overview" : s.session_status === "in_session" ? "in session" : "awaiting visit"}
            </span>
          ))}
          {unlinkedLabs.map((lo: any) => (
            <span key={lo.id} style={{ background: lo.status === "received" ? "#DBEAFE" : "#FEF3C7", color: lo.status === "received" ? "#1E40AF" : "#92400E", borderRadius: 999, padding: "6px 12px", fontSize: 11.5, fontWeight: 800 }}>
              🧪 {lo.work_type || "Lab work"}{lo.vendor_name ? ` · ${lo.vendor_name}` : ""} · {lo.status === "received" ? "received — approve in Overview" : lo.status === "sent" ? "at lab" : "to send"}
            </span>
          ))}
        </div>
      )}
      {!hidePrices && !billingReady && billingBlockers.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg,#FEF3C7,#FFFBEB)", border: "2px solid #FCD34D",
          borderRadius: 16, padding: "14px 18px",
        }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "#92400E", marginBottom: 6 }}>
            Confirm every treatment before Payments / Close Visit
          </div>
          <div style={{ fontSize: 13, color: "#78350F", lineHeight: 1.5 }}>
            Each item needs a <b>non-zero rate</b> and <b>Confirm ✓</b> on its card below.
          </div>
        </div>
      )}
      {!hidePrices && (
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        background: "#fff", borderRadius: 16, padding: "12px 16px",
        border: `1.5px solid ${LINE}`, boxShadow: SHADOW,
      }}>
        <button type="button" onClick={() => onJumpToTreatment?.()}
          style={{ border: "none", background: accent, color: "#fff", borderRadius: 11, padding: "10px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          + Add treatment on chart
        </button>
        {selectedTeeth.length > 0 && (
          <button type="button" onClick={() => onAddForTooth?.(selectedTeeth[0])}
            style={{ border: `2px solid ${accent}`, background: "#fff", color: accent, borderRadius: 11, padding: "10px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            + Add for tooth {selectedTeeth[0]}
          </button>
        )}
        <span style={{ fontSize: 12.5, color: MUTE, fontWeight: 600 }}>
          Add &amp; confirm treatments inline under each tooth group
        </span>
      </div>
      )}

      <div style={{ ...card, padding: "20px 22px 22px" }}>
        <TreatmentPlanStrip
          W={W}
          items={items}
          accent={accent}
          variant="light"
          layout="grid"
          groupMode={groupMode}
          onGroupModeChange={setGroupMode}
          selectedTeeth={selectedTeeth}
          highlightId={highlightId}
          billingNudgeIds={billingNudgeIds}
          hidePrices={hidePrices}
          onSelectTooth={onSelectTooth}
          onQuickPrice={onQuickPrice}
          onStatusCycle={onStatusCycle}
          onDelete={onDelete}
          onEdit={onEdit}
          onAddForTooth={onAddForTooth}
          onAddPlanItem={onAddPlanItem}
          catalog={catalog}
          onJumpToTreatment={onJumpToTreatment}
          emptyHint="Pick a tooth group below and add a treatment right there — set rate and tap Confirm."
        />
      </div>

      {activeItems.length > 0 && (
        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap",
          background: `linear-gradient(135deg, ${accent}08, #fff)`,
          borderRadius: 16, padding: "14px 18px", border: `1.5px solid ${accent}22`,
        }}>
          <SummaryPill label="Treatments" value={String(activeItems.length)} color={INK} />
          {!hidePrices && (
          <SummaryPill
            label="Plan value"
            value={`₹${activeItems.reduce((s, i) => s + (i.final_amount || 0), 0).toLocaleString("en-IN")}`}
            color={accent}
          />
          )}
          <SummaryPill
            label="In progress"
            value={String(activeItems.filter((i: any) => i.status === "in_progress").length)}
            color="#D97706"
          />
          <SummaryPill
            label="Completed"
            value={String(activeItems.filter((i: any) => i.status === "completed").length)}
            color="#059669"
          />
        </div>
      )}
    </div>
  );
}

function SummaryPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "10px 16px", border: `1px solid ${LINE}`, minWidth: 100 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}
