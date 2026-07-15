"use client";
import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { FocusToothHero } from "@/components/clinical/FocusToothHero";
import { GroupedToothBanner } from "@/components/clinical/GroupedToothBanner";
import { describeToothSelection } from "@/components/clinical/toothSelectionGroup";
import { buildToothSummaryCards, ToothClinicalSummaryInline, type ToothSummaryCard } from "@/components/clinical/ToothSummaryGrid";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

type GroupMode = "tooth" | "treatment";

const STATUS_LIGHT: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  advised: { label: "Planned", color: "#6366F1", bg: "#EEF2FF", icon: "📋" },
  in_progress: { label: "In Progress", color: "#D97706", bg: "#FFFBEB", icon: "⏳" },
  completed: { label: "Done", color: "#059669", bg: "#ECFDF5", icon: "✓" },
};

const STATUS_DARK: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  advised: { label: "Planned", color: "#38BDF8", bg: "#0C4A6E", icon: "📋" },
  in_progress: { label: "In Progress", color: "#FBBF24", bg: "#78350F", icon: "⏳" },
  completed: { label: "Done", color: "#34D399", bg: "#064E3B", icon: "✓" },
};

function groupKeyTooth(item: any): string {
  const teeth: number[] = item.teeth || [];
  if (teeth.length === 0 || item.area_label === "Full Mouth") {
    return item.area_label ? `area:${item.area_label}` : "general";
  }
  if (teeth.length === 1) return `tooth:${teeth[0]}`;
  const sorted = [...teeth].sort((a, b) => a - b).join("-");
  return `set:${sorted}`;
}

function groupLabelTooth(key: string, sampleItem?: any): { title: string; subtitle?: string; icon: string; teeth: number[] } {
  if (key === "general") return { title: "General / Non tooth-based", subtitle: "Scaling, consultation, etc.", icon: "📋", teeth: [] };
  if (key.startsWith("area:")) return { title: key.slice(5), subtitle: "Area or arch treatment", icon: "🌐", teeth: [] };
  if (key.startsWith("tooth:")) {
    const n = parseInt(key.slice(6), 10);
    const d = describeToothSelection([n]);
    return { title: d.label, subtitle: d.subtitle, icon: d.icon, teeth: [n] };
  }
  if (key.startsWith("set:")) {
    const teeth = key.slice(4).split("-").map(Number).filter(Boolean);
    const d = describeToothSelection(teeth);
    return { title: d.label, subtitle: d.subtitle, icon: d.icon, teeth };
  }
  return { title: "Treatments", subtitle: "", icon: "🦷", teeth: sampleItem?.teeth || [] };
}

function groupKeyTreatment(item: any): string {
  return (item.treatment_name || "Other").trim().toLowerCase();
}

function groupLabelTreatment(name: string): { title: string; subtitle?: string; icon: string } {
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  return { title, subtitle: "Grouped by procedure", icon: "🔧" };
}

function sortGroupKeys(keys: string[], mode: GroupMode): string[] {
  if (mode === "treatment") return keys.sort((a, b) => a.localeCompare(b));
  const order = (k: string) => {
    if (k === "general") return 9999;
    if (k.startsWith("area:")) return 9998;
    if (k.startsWith("set:")) return 5000 + parseInt(k.slice(4).split("-")[0] || "0", 10);
    return parseInt(k.slice(6), 10) || 0;
  };
  return keys.sort((a, b) => order(a) - order(b));
}

/** Treatment plan cards — grouped tooth-wise or treatment-wise */
export function TreatmentPlanStrip({
  W,
  items,
  accent,
  onQuickPrice,
  onStatusCycle,
  onDelete,
  onEdit,
  onSelectTooth,
  selectedTeeth = [],
  highlightId,
  variant = "light",
  layout = "grid",
  groupMode: controlledGroupMode,
  onGroupModeChange,
  onAddForTooth,
  onAddPlanItem,
  catalog = [],
  onJumpToTreatment,
  billingNudgeIds = [],
  hidePrices = false,
  emptyHint = "Add treatments from the Treatment tab — select a tooth and tap a procedure.",
}: {
  W?: any;
  items: any[];
  accent: string;
  catalog?: { id: string; name: string; rate?: number; is_tooth_based?: boolean }[];
  onAddPlanItem?: (params: {
    treatment: string; teeth: number[]; rate: number; discount: number; procedureId?: string | null;
  }) => Promise<void>;
  onQuickPrice: (item: any, rate: number, discount: number, notes?: string, opts?: { price_confirmed?: boolean }) => void;
  onStatusCycle: (item: any) => void;
  onDelete: (item: any) => void;
  onEdit?: (item: any) => void;
  onSelectTooth?: (n: number) => void;
  selectedTeeth?: number[];
  highlightId?: string | null;
  variant?: "light" | "dark";
  layout?: "grid" | "horizontal";
  groupMode?: GroupMode;
  onGroupModeChange?: (m: GroupMode) => void;
  onAddForTooth?: (tooth: number) => void;
  onJumpToTreatment?: () => void;
  billingNudgeIds?: string[];
  /** Specialist mode — clinical only, no money anywhere */
  hidePrices?: boolean;
  emptyHint?: string;
}) {
  const [localGroupMode, setLocalGroupMode] = useState<GroupMode>("tooth");
  const groupMode = controlledGroupMode ?? localGroupMode;
  const setGroupMode = onGroupModeChange ?? setLocalGroupMode;

  const active = items.filter((i: any) => i.status !== "cancelled");
  const light = variant === "light";
  const total = active.reduce((s, i) => s + (i.final_amount ?? 0), 0);

  const clinicalByTooth = useMemo(() => {
    const map = new Map<number, ToothSummaryCard>();
    if (!W) return map;
    buildToothSummaryCards(W, active).forEach(c => map.set(c.tooth, c));
    return map;
  }, [W, active]);

  // Lab order per plan item — tracking lives ON the treatment card itself
  const labByItem = useMemo(() => {
    const m = new Map<string, any>();
    (W?.lab_orders || []).forEach((lo: any) => {
      if (lo.treatment_plan_item_id) m.set(lo.treatment_plan_item_id, lo);
    });
    return m;
  }, [W?.lab_orders]);

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const item of active) {
      const key = groupMode === "tooth" ? groupKeyTooth(item) : groupKeyTreatment(item);
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }

    if (groupMode === "tooth" && W) {
      Array.from(clinicalByTooth.keys()).forEach(tooth => {
        const key = `tooth:${tooth}`;
        if (!map.has(key)) map.set(key, []);
      });
    }

    const keys = sortGroupKeys(Array.from(map.keys()), groupMode);
    return keys.map(key => {
      const groupItems = map.get(key) || [];
      const subtotal = groupItems.reduce((s, i) => s + (i.final_amount ?? 0), 0);
      const label = groupMode === "tooth"
        ? groupLabelTooth(key, groupItems[0])
        : { ...groupLabelTreatment(groupItems[0]?.treatment_name || key), teeth: groupItems[0]?.teeth || [] };
      const primaryTooth = groupMode === "tooth" && label.teeth?.length === 1
        ? label.teeth[0] : groupItems[0]?.teeth?.[0];
      const groupTeeth = label.teeth?.length ? label.teeth : (groupItems[0]?.teeth || []);
      const clinicalCards = groupMode === "tooth"
        ? groupTeeth.map(t => clinicalByTooth.get(t)).filter(Boolean) as ToothSummaryCard[]
        : [];
      const clinicalOnly = groupMode === "tooth" && groupItems.length === 0 && clinicalCards.length > 0;
      return { key, label, items: groupItems, subtotal, primaryTooth, groupTeeth, clinicalCards, clinicalOnly };
    });
  }, [active, groupMode, W, clinicalByTooth]);

  const hasClinicalOnly = groupMode === "tooth" && groups.some(g => g.clinicalOnly);

  if (active.length === 0 && !hasClinicalOnly) {
    return (
      <div style={{
        background: light ? "#fff" : "linear-gradient(135deg, #0A1628 0%, #12253F 100%)",
        borderRadius: 20, padding: "36px 28px", textAlign: "center",
        color: light ? MUTE : "#7DA2C9",
        border: light ? `2px dashed ${LINE}` : "1px solid #1E3A5F",
        boxShadow: light ? "0 2px 16px rgba(15,23,42,.05)" : "none",
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
        <div style={{ fontWeight: 900, color: light ? INK : "#E6EEF8", fontSize: 16 }}>No treatments on plan yet</div>
        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.55, maxWidth: 380, margin: "8px auto 0" }}>{emptyHint}</div>
        {onJumpToTreatment && (
          <button type="button" onClick={onJumpToTreatment}
            style={{ marginTop: 16, border: "none", background: accent, color: "#fff", borderRadius: 12, padding: "12px 20px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            + Add treatment on chart
          </button>
        )}
      </div>
    );
  }

  const segBtn = (on: boolean): CSSProperties => ({
    border: on ? `2px solid ${accent}` : `1.5px solid ${LINE}`,
    background: on ? `${accent}12` : "#fff",
    color: on ? accent : MUTE,
    borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 12.5,
    cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 17, color: INK, display: "flex", alignItems: "center", gap: 8 }}>
            {groupMode === "tooth" ? "🦷 Tooth-wise plan" : "Treatment items"}
            <span style={{ background: accent, color: "#fff", borderRadius: 999, padding: "3px 10px", fontSize: 12 }}>{active.length}</span>
          </div>
          <div style={{ fontSize: 13, color: MUTE, marginTop: 3 }}>
            {hidePrices
              ? "Your assigned clinical work — mark done and add work notes"
              : groupMode === "tooth"
                ? "Clinical summary inline · edit rate, discount & status on each card"
                : "Edit rate, discount & status directly on each card"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, background: SOFT, borderRadius: 12, padding: 4 }}>
            <button type="button" onClick={() => setGroupMode("tooth")} style={segBtn(groupMode === "tooth")}>🦷 By tooth</button>
            <button type="button" onClick={() => setGroupMode("treatment")} style={segBtn(groupMode === "treatment")}>🔧 By treatment</button>
          </div>
          {!hidePrices && (
          <div style={{
            fontSize: 15, fontWeight: 900, color: accent,
            background: `${accent}10`, borderRadius: 12, padding: "8px 14px", border: `1.5px solid ${accent}33`,
          }}>
            Total {fmt(total)}
          </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {groups.map(group => (
          <section key={group.key}>
            <div style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
              marginBottom: 12, padding: "10px 14px",
              background: group.primaryTooth && selectedTeeth.includes(group.primaryTooth)
                ? `linear-gradient(135deg, ${accent}14, #fff)`
                : `linear-gradient(135deg, ${accent}0A, #fff)`,
              borderRadius: 14,
              border: group.primaryTooth && selectedTeeth.includes(group.primaryTooth)
                ? `2px solid ${accent}55` : `1.5px solid ${accent}22`,
              cursor: group.primaryTooth && onSelectTooth ? "pointer" : undefined,
            }}
              onClick={group.primaryTooth && onSelectTooth ? () => onSelectTooth(group.primaryTooth!) : undefined}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
                {groupMode === "tooth" && group.groupTeeth.length === 1 && group.primaryTooth ? (
                  <FocusToothHero tooth={group.primaryTooth} accent={accent} layout="mini" onClick={() => onSelectTooth?.(group.primaryTooth!)} />
                ) : groupMode === "tooth" && group.groupTeeth.length > 1 ? (
                  <span style={{ fontSize: 26 }}>{group.label.icon}</span>
                ) : (
                  <span style={{ fontSize: 22 }}>{group.label.icon}</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 15, color: INK }}>{group.label.title}</div>
                  {group.label.subtitle && <div style={{ fontSize: 12, color: MUTE, marginTop: 1 }}>{group.label.subtitle}</div>}
                  {groupMode === "tooth" && group.clinicalCards.length > 0 && (
                    <ToothClinicalSummaryInline cards={group.clinicalCards} accent={accent} />
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {group.primaryTooth && groupMode === "tooth" && onAddForTooth && (
                  <button type="button" onClick={e => { e.stopPropagation(); onAddForTooth(group.primaryTooth!); }}
                    style={{ border: `2px solid ${accent}`, background: "#fff", color: accent, borderRadius: 10, padding: "6px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    + Add
                  </button>
                )}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                  </div>
                  {!hidePrices && <div style={{ fontSize: 16, fontWeight: 900, color: accent }}>{fmt(group.subtotal)}</div>}
                </div>
              </div>
            </div>

            {!group.clinicalOnly && (layout === "grid" ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 14,
              }}>
                {group.items.map(item => (
                  <PlanCard key={item.id} item={item} accent={accent} highlight={highlightId === item.id}
                    light={light} groupMode={groupMode} onQuickPrice={onQuickPrice} onStatusCycle={onStatusCycle}
                    onDelete={onDelete} onEdit={onEdit} onSelectTooth={onSelectTooth} layout={layout} hidePrices={hidePrices}
                    labOrder={labByItem.get(item.id)} needsBillingAttention={billingNudgeIds.includes(item.id)} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory" }}>
                {group.items.map(item => (
                  <PlanCard key={item.id} item={item} accent={accent} highlight={highlightId === item.id}
                    light={light} groupMode={groupMode} onQuickPrice={onQuickPrice} onStatusCycle={onStatusCycle}
                    onDelete={onDelete} onEdit={onEdit} onSelectTooth={onSelectTooth} layout={layout} hidePrices={hidePrices}
                    labOrder={labByItem.get(item.id)} needsBillingAttention={billingNudgeIds.includes(item.id)} />
                ))}
              </div>
            ))}

            {!hidePrices && groupMode === "tooth" && group.groupTeeth.length > 0 && onAddPlanItem && catalog.length > 0 && (
              <ToothGroupInlineAdd
                teeth={group.groupTeeth}
                catalog={catalog}
                accent={accent}
                existingNames={new Set(group.items.map((i: any) => (i.treatment_name || "").toLowerCase()))}
                suggested={group.clinicalCards.flatMap(c => c.tx.map(t => t.name)).filter(Boolean)}
                clinicalOnly={group.clinicalOnly}
                onAdd={onAddPlanItem}
              />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  item, accent, highlight, light, groupMode, onQuickPrice, onStatusCycle, onDelete, onEdit, onSelectTooth, layout, labOrder, needsBillingAttention, hidePrices,
}: {
  item: any; accent: string; highlight?: boolean; light: boolean; groupMode: GroupMode;
  onQuickPrice: (item: any, rate: number, discount: number, notes?: string, opts?: { price_confirmed?: boolean }) => void;
  onStatusCycle: (item: any) => void;
  onDelete: (item: any) => void;
  onEdit?: (item: any) => void;
  onSelectTooth?: (n: number) => void;
  layout: "grid" | "horizontal";
  labOrder?: any;
  needsBillingAttention?: boolean;
  /** Specialist mode — clinical view only: no rates, no discounts, no confirm */
  hidePrices?: boolean;
}) {
  const STATUS = light ? STATUS_LIGHT : STATUS_DARK;
  const st = STATUS[item.status] || STATUS.advised;
  const teeth: number[] = item.teeth || [];
  const [rate, setRate] = useState(String(item.doctor_rate ?? item.suggested_rate ?? 0));
  const [disc, setDisc] = useState(String(item.discount ?? 0));
  const [notes, setNotes] = useState(item.notes || "");
  const [hover, setHover] = useState(false);

  useEffect(() => {
    setRate(String(item.doctor_rate ?? item.suggested_rate ?? 0));
    setDisc(String(item.discount ?? 0));
    setNotes(item.notes || "");
  }, [item.id, item.doctor_rate, item.suggested_rate, item.discount, item.notes]);

  const num = (v: string) => Math.max(0, parseFloat(v.replace(/[^0-9.]/g, "")) || 0);
  const pays = Math.max(0, num(rate) - num(disc));
  const savedPays = Math.max(0, (item.doctor_rate ?? item.suggested_rate ?? 0) - (item.discount ?? 0));
  const dirty = num(rate) !== (item.doctor_rate ?? 0) || num(disc) !== (item.discount ?? 0) || notes !== (item.notes || "");
  const confirmed = !!item.price_confirmed && savedPays > 0 && !dirty;
  const canConfirm = pays > 0 && (!item.price_confirmed || dirty);
  // Specialist view is clinical-only: neutral card, confirmation is the owner's concern
  const billingColor = hidePrices ? LINE : confirmed ? "#10B981" : "#EF4444";
  const billingBg = hidePrices ? SOFT : confirmed ? "#F0FDF4" : "#FFF1F2";

  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box", border: `1.5px solid ${LINE}`,
    borderRadius: 10, padding: "9px 11px", fontSize: 14, fontWeight: 700,
    background: "#fff", color: INK, fontFamily: "inherit", outline: "none",
  };

  const showToothChip = groupMode === "treatment" || teeth.length > 1 || !teeth.length;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: layout === "horizontal" ? "0 0 300px" : undefined,
        scrollSnapAlign: layout === "horizontal" ? "start" : undefined,
        background: needsBillingAttention
          ? `linear-gradient(180deg, ${billingBg}, #fff 42%)`
          : "#fff",
        borderRadius: 20,
        overflow: "hidden",
        border: highlight
          ? `2px solid ${accent}`
          : needsBillingAttention
            ? `3px solid ${billingColor}`
            : `1.5px solid ${hover ? billingColor : billingColor + "66"}`,
        boxShadow: highlight
          ? `0 12px 36px ${accent}30`
          : needsBillingAttention
            ? `0 0 0 4px ${billingColor}22, 0 12px 34px ${billingColor}2E`
            : hover ? "0 8px 28px rgba(15,23,42,.12)" : "0 2px 14px rgba(15,23,42,.07)",
        color: INK,
        fontFamily: "inherit",
        position: "relative",
        transition: "box-shadow .18s, border-color .18s, transform .18s",
        transform: needsBillingAttention ? "scale(1.015)" : hover ? "translateY(-2px)" : "none",
        animation: needsBillingAttention ? "billing-attention-pulse 1s ease-in-out infinite" : "none",
      }}
    >
      <style>{`
        @keyframes billing-attention-pulse {
          0%, 100% { box-shadow: 0 0 0 4px ${billingColor}22, 0 12px 34px ${billingColor}2E; }
          50% { box-shadow: 0 0 0 8px ${billingColor}44, 0 16px 42px ${billingColor}40; }
        }
      `}</style>
      {/* Billing confirmation accent bar */}
      <div style={{ height: 5, background: `linear-gradient(90deg, ${billingColor}, ${billingColor}66)` }} />
      {!hidePrices && (
        <button type="button" onClick={() => onDelete(item)} title="Delete treatment card"
          aria-label={`Delete ${item.treatment_name || "treatment"} card`}
          style={{
            position: "absolute", top: 10, right: 10, zIndex: 3,
            width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid #FECACA", background: hover ? "#DC2626" : "#FEF2F2",
            color: hover ? "#fff" : "#DC2626", borderRadius: 999,
            fontWeight: 950, fontSize: 17, lineHeight: 1, cursor: "pointer",
            fontFamily: "inherit", boxShadow: hover ? "0 8px 18px rgba(220,38,38,.25)" : "0 2px 8px rgba(220,38,38,.12)",
            transition: "background .15s, color .15s, box-shadow .15s, transform .15s",
          }}>
          X
        </button>
      )}

      <div style={{ padding: hidePrices ? "14px 16px 14px" : "14px 48px 14px 16px" }}>
        {teeth.length === 1 ? (
          <div style={{ marginBottom: 12 }}>
            <FocusToothHero tooth={teeth[0]} accent={accent} layout="inline" onClick={() => onSelectTooth?.(teeth[0])} />
          </div>
        ) : teeth.length > 1 ? (
          <div style={{ marginBottom: 12 }}>
            <GroupedToothBanner teeth={teeth} accent={accent} onFocusTooth={onSelectTooth} />
          </div>
        ) : item.area_label ? (
          <div style={{ marginBottom: 12, padding: "10px 12px", background: SOFT, borderRadius: 12, border: `1.5px solid ${LINE}` }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: INK }}>{item.area_label}</div>
            <div style={{ fontSize: 12, color: MUTE }}>Non tooth-based / arch treatment</div>
          </div>
        ) : null}

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.35, color: INK }}>
              {item.treatment_name}
            </div>
            {showToothChip && teeth.length === 0 && (
              <span style={{ display: "inline-block", fontSize: 11.5, fontWeight: 700, color: MUTE, background: SOFT, borderRadius: 8, padding: "3px 9px", marginTop: 6 }}>
                {item.area_label || "General"}
              </span>
            )}
            {showToothChip && teeth.length > 1 && (
              <div style={{ fontSize: 12, color: MUTE, marginTop: 4, fontWeight: 600 }}>Teeth {teeth.join(", ")}</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
            <button type="button" onClick={() => onStatusCycle(item)} title="Tap to change status"
              style={{
                border: "none", background: st.bg, color: st.color,
                borderRadius: 10, padding: "6px 11px", fontWeight: 800, fontSize: 11.5,
                cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                boxShadow: `0 0 0 1.5px ${st.color}33`,
              }}>
              <span>{st.icon}</span> {st.label}
            </button>
            {/* Green/red confirmation toggle — instant read on whether the rate is locked */}
            {!hidePrices && (
            <button type="button"
              onClick={() => {
                if (confirmed) onQuickPrice(item, num(rate), num(disc), notes, { price_confirmed: false });
                else if (pays > 0) onQuickPrice(item, num(rate), num(disc), notes, { price_confirmed: true });
              }}
              title={confirmed ? "Confirmed — tap to unconfirm" : pays > 0 ? "Not confirmed — tap to confirm rate" : "Set a rate first"}
              style={{
                border: "none", borderRadius: 999, padding: "5px 11px", fontWeight: 800, fontSize: 11,
                cursor: confirmed || pays > 0 ? "pointer" : "default", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 5,
                background: confirmed ? "#D1FAE5" : "#FEE2E2",
                color: confirmed ? "#065F46" : "#991B1B",
                boxShadow: confirmed ? "0 0 0 1.5px #10B98144" : "0 0 0 1.5px #EF444433",
              }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: confirmed ? "#10B981" : "#EF4444", display: "inline-block" }} />
              {confirmed ? "Confirmed" : "Not confirmed"}
            </button>
            )}
          </div>
        </div>

        {item.diagnosis && (
          <div style={{
            fontSize: 12, color: "#9A3412", background: "#FFF7ED", borderRadius: 10,
            padding: "7px 11px", marginBottom: 12, border: "1px solid #FFEDD5", lineHeight: 1.4,
          }}>
            <span style={{ fontWeight: 800 }}>Dx:</span> {item.diagnosis}
          </div>
        )}

        {/* Lab tracking ON the card — where the work stands, right where it's planned */}
        {labOrder && (() => {
          const LAB: Record<string, { label: string; color: string; bg: string }> = {
            pending:  { label: "Lab: preparing to send", color: "#475569", bg: "#F1F5F9" },
            sent:     { label: "Lab: work at lab",       color: "#92400E", bg: "#FEF3C7" },
            received: { label: "Lab: received — approve", color: "#1E40AF", bg: "#DBEAFE" },
            approved: { label: "Lab: done ✓",            color: "#065F46", bg: "#D1FAE5" },
          };
          const cfg = LAB[labOrder.status] || LAB.pending;
          const due = labOrder.expected_date
            ? new Date(labOrder.expected_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
            : null;
          const overdue = labOrder.status === "sent" && labOrder.expected_date && new Date(labOrder.expected_date) < new Date();
          return (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
              fontSize: 11.5, fontWeight: 800, color: overdue ? "#991B1B" : cfg.color,
              background: overdue ? "#FEE2E2" : cfg.bg, borderRadius: 10,
              padding: "7px 11px", marginBottom: 12, lineHeight: 1.4,
            }}>
              🧪 {overdue ? "Lab: OVERDUE — chase vendor" : cfg.label}
              {labOrder.vendor_name && <span style={{ fontWeight: 600, opacity: .85 }}>· {labOrder.vendor_name}</span>}
              {due && <span style={{ fontWeight: 600, opacity: .85 }}>· due {due}</span>}
            </div>
          );
        })()}

        {/* Pricing block — specialists see work notes only, never money */}
        {hidePrices ? (
          <div style={{
            background: `linear-gradient(160deg, ${SOFT}, #fff)`,
            borderRadius: 14, padding: 14, border: `1px solid ${LINE}`, marginBottom: 12,
          }}>
            <label style={{ display: "block" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Work notes</div>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was done, materials, findings…"
                style={{ ...inputStyle, fontWeight: 500, fontSize: 13 }} />
            </label>
          </div>
        ) : (
        <div style={{
          background: `linear-gradient(160deg, ${SOFT}, #fff)`,
          borderRadius: 14, padding: 14, border: `1px solid ${LINE}`, marginBottom: 12,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Rate</div>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: MUTE }}>₹</span>
                <input type="text" inputMode="numeric" value={rate} onChange={e => setRate(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 24 }} />
              </div>
            </label>
            <label>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Discount</div>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: MUTE }}>₹</span>
                <input type="text" inputMode="numeric" value={disc} onChange={e => setDisc(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 24 }} />
              </div>
            </label>
          </div>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 12, padding: "10px 12px", background: "#fff", borderRadius: 12,
            border: `1.5px solid ${accent}22`,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: MUTE }}>Patient pays</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: accent, fontVariantNumeric: "tabular-nums" }}>{fmt(pays)}</span>
          </div>

          <label style={{ display: "block", marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>Notes</div>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Shade, material, sitting plan…"
              style={{ ...inputStyle, fontWeight: 500, fontSize: 13 }} />
          </label>
        </div>
        )}

        {/* Actions — specialist: mark work done + save notes; owner: confirm/edit/delete */}
        {hidePrices ? (
        <div style={{ display: "flex", gap: 7 }}>
          <button type="button"
            onClick={() => { if (item.status !== "completed") onStatusCycle(item); }}
            disabled={item.status === "completed"}
            style={{
              flex: 2,
              background: item.status === "completed" ? "#ECFDF5" : "linear-gradient(135deg,#059669,#10B981)",
              color: item.status === "completed" ? "#059669" : "#fff",
              border: item.status === "completed" ? "1.5px solid #A7F3D0" : "none",
              borderRadius: 11, padding: "10px", fontWeight: 800, fontSize: 13,
              cursor: item.status === "completed" ? "default" : "pointer", fontFamily: "inherit",
              boxShadow: item.status === "completed" ? "none" : "0 4px 14px #05966944",
            }}>
            {item.status === "completed" ? "✓ Work done" : "✓ Mark my work done"}
          </button>
          <button type="button"
            disabled={!dirty}
            onClick={() => onQuickPrice(item, item.doctor_rate ?? 0, item.discount ?? 0, notes)}
            style={{
              flex: 1, background: dirty ? "#fff" : SOFT, color: dirty ? accent : MUTE,
              border: dirty ? `2px solid ${accent}` : `1.5px solid ${LINE}`,
              borderRadius: 11, padding: "10px", fontWeight: 800, fontSize: 12.5,
              cursor: dirty ? "pointer" : "default", fontFamily: "inherit",
            }}>
            Save notes
          </button>
        </div>
        ) : (
        <div style={{ display: "flex", gap: 7 }}>
          <button type="button"
            disabled={pays === 0 || (confirmed && !dirty)}
            onClick={() => onQuickPrice(item, num(rate), num(disc), notes, { price_confirmed: true })}
            title={pays === 0 ? "Enter a rate above zero to confirm" : confirmed ? "Price confirmed" : "Confirm rate — required before billing"}
            style={{
              flex: 1,
              background: confirmed
                ? "#ECFDF5"
                : canConfirm
                  ? `linear-gradient(135deg, ${accent}, ${accent}DD)`
                  : SOFT,
              color: confirmed ? "#059669" : canConfirm ? "#fff" : MUTE,
              borderRadius: 11, padding: "10px", fontWeight: 800, fontSize: 13,
              cursor: canConfirm || confirmed ? "pointer" : "default",
              fontFamily: "inherit",
              boxShadow: canConfirm ? `0 4px 14px ${accent}44` : "none",
              border: confirmed ? "1.5px solid #A7F3D0" : canConfirm ? "none" : `1.5px solid ${LINE}`,
              opacity: pays === 0 && !confirmed ? 0.75 : 1,
            }}>
            {confirmed ? "✓ Confirmed" : pays === 0 ? "Confirm — set rate" : "Confirm ✓"}
          </button>
          {onEdit && (
            <button type="button" onClick={() => onEdit(item)} title="Change type or teeth"
              style={{
                border: `1.5px solid ${LINE}`, background: "#fff", color: MUTE,
                borderRadius: 11, padding: "10px 12px", fontWeight: 800, fontSize: 12,
                cursor: "pointer", fontFamily: "inherit",
              }}>
              ✏️
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

const chipGhost = (c: string): CSSProperties => ({
  background: c + "0D", color: c, border: `1.5px solid ${c}44`,
  padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
});

function ToothGroupInlineAdd({
  teeth, catalog, accent, existingNames, suggested, clinicalOnly, onAdd,
}: {
  teeth: number[];
  catalog: { id: string; name: string; rate?: number; is_tooth_based?: boolean }[];
  accent: string;
  existingNames: Set<string>;
  suggested: string[];
  clinicalOnly?: boolean;
  onAdd: (params: { treatment: string; teeth: number[]; rate: number; discount: number; procedureId?: string | null }) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<{ name: string; procedureId?: string | null; rate: number; discount: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const pickTreatment = (name: string) => {
    const proc = catalog.find(c => c.name.toLowerCase() === name.toLowerCase());
    const unitRate = proc?.rate || 0;
    setDraft({
      name: proc?.name || name,
      procedureId: proc?.id || null,
      rate: unitRate * teeth.length,
      discount: 0,
    });
    setSearch("");
  };

  const chips = useMemo(() => {
    const names: string[] = [];
    suggested.forEach(n => { if (n && !names.includes(n)) names.push(n); });
    catalog.filter(c => c.is_tooth_based !== false).slice(0, 10).forEach(c => {
      if (!names.includes(c.name)) names.push(c.name);
    });
    return names.filter(n => !existingNames.has(n.toLowerCase())).slice(0, 12);
  }, [catalog, suggested, existingNames]);

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter(c => c.name.toLowerCase().includes(q)).slice(0, 10);
  }, [catalog, search]);

  const num = (v: number) => Math.max(0, v);
  const pays = draft ? Math.max(0, num(draft.rate) - num(draft.discount)) : 0;

  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box", border: `1.5px solid ${LINE}`,
    borderRadius: 10, padding: "9px 11px", fontSize: 14, fontWeight: 700,
    background: "#fff", color: INK, fontFamily: "inherit", outline: "none",
  };

  return (
    <div style={{
      marginTop: 12, padding: 14, borderRadius: 14,
      border: `2px dashed ${clinicalOnly ? accent + "55" : LINE}`,
      background: clinicalOnly ? `${accent}06` : SOFT,
    }}>
      <div style={{ fontWeight: 900, fontSize: 13, color: INK, marginBottom: 8 }}>
        {clinicalOnly ? "Clinical notes recorded — add treatment here" : "+ Add treatment here"}
      </div>

      {!draft ? (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search procedure…"
            style={{ ...inputStyle, marginBottom: 8, fontWeight: 500, fontSize: 13 }} />
          {(search ? searchHits : chips).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(search ? searchHits : chips.map(n => catalog.find(c => c.name === n) || { id: n, name: n })).map(c => (
                <button key={c.id || c.name} type="button" onClick={() => pickTreatment(c.name)}
                  style={chipGhost(accent)}>+ {c.name}</button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{
          background: "#fff", borderRadius: 16, padding: 14,
          border: `1.5px solid ${accent}33`, boxShadow: "0 2px 12px rgba(15,23,42,.06)",
        }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: INK, marginBottom: 4 }}>{draft.name}</div>
          <div style={{ fontSize: 12, color: MUTE, marginBottom: 12 }}>
            Tooth{teeth.length !== 1 ? "s" : ""} {teeth.join(", ")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <label>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, marginBottom: 4, textTransform: "uppercase" }}>Rate</div>
              <input type="text" inputMode="numeric" value={draft.rate}
                onChange={e => setDraft({ ...draft, rate: Math.max(0, parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0) })}
                style={inputStyle} />
            </label>
            <label>
              <div style={{ fontSize: 10, fontWeight: 800, color: MUTE, marginBottom: 4, textTransform: "uppercase" }}>Discount</div>
              <input type="text" inputMode="numeric" value={draft.discount}
                onChange={e => setDraft({ ...draft, discount: Math.max(0, parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0) })}
                style={inputStyle} />
            </label>
          </div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", background: `${accent}08`, borderRadius: 10, marginBottom: 12,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: MUTE }}>Patient pays</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: accent }}>{fmt(pays)}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setDraft(null)} disabled={busy}
              style={{ flex: 1, border: `1.5px solid ${LINE}`, background: "#fff", color: MUTE, borderRadius: 11, padding: "10px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button type="button" disabled={busy || pays === 0}
              onClick={async () => {
                if (!draft || pays === 0) return;
                setBusy(true);
                try {
                  await onAdd({
                    treatment: draft.name, teeth, rate: draft.rate, discount: draft.discount,
                    procedureId: draft.procedureId,
                  });
                  setDraft(null);
                } finally { setBusy(false); }
              }}
              style={{
                flex: 2, border: "none",
                background: pays > 0 ? accent : SOFT,
                color: pays > 0 ? "#fff" : MUTE,
                borderRadius: 11, padding: "10px", fontWeight: 800, fontSize: 13,
                cursor: pays > 0 && !busy ? "pointer" : "default",
                fontFamily: "inherit", opacity: busy ? 0.7 : 1,
              }}>
              {busy ? "Adding…" : pays === 0 ? "Confirm — set rate" : "Confirm & add ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
