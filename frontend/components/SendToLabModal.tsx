/**
 * SendToLabModal — Bundle X Pass 1
 *
 * Opened from the doctor's Treatment Workspace via the "Send to Lab" button.
 * Pre-fills patient + (optionally) a treatment_plan_item, surfaces vendor list
 * sorted by preferred-first, and uses DropdownWithInlineAdd for work_type so
 * doctors can type any custom work type → auto-added to lab_work_types catalog.
 *
 * On submit: POSTs to /api/lab/orders. Backend fires WhatsApp to vendor
 * via notify_lab_order_placed() and (Pass 2) generates a QR code for tracking.
 */
import React, { useEffect, useMemo, useState } from "react";
import { X, Send } from "lucide-react";
import * as api from "@/lib/api";
import DropdownWithInlineAdd from "./DropdownWithInlineAdd";
const SHADE_OPTIONS = ["A1","A2","A3","A3.5","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4"];

const TEAL = "#0E7C7B";
const TEAL_DEEP = "#0A5C5B";
const LINE = "#E2E8F0";
const INK = "#1F2937";
const MUTE = "#64748B";
const SOFT = "#F8FAFC";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: `1.5px solid ${LINE}`, fontSize: 14, fontFamily: "inherit",
  background: "#fff", color: INK, outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 800, color: MUTE,
  letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 4,
};

type PlanItem = {
  id: string;
  procedure_name: string;
  tooth_number?: string;
  teeth?: Array<string | number>;
  requires_lab?: boolean;
  requires_specialist?: boolean;
  lab_status?: string;
  lab_order_id?: string;
};

type ExistingOrder = {
  id: string;
  work_type?: string;
  vendor_id?: string;
  teeth?: number[];
  shade?: string;
  expected_date?: string;
  notes?: string;
  treatment_plan_item_id?: string;
  status?: string;
};

type Props = {
  patientId: string;
  patientName: string;
  clinicId: string;
  appointmentId?: string;
  planItems?: PlanItem[];
  defaultTeeth?: string[];
  staffRole?: string;
  existingOrder?: ExistingOrder | null;
  onClose: () => void;
  onSaved?: (orderId: string) => void;
};

export default function SendToLabModal({
  patientId, patientName, clinicId, appointmentId,
  planItems = [], defaultTeeth = [], staffRole, existingOrder,
  onClose, onSaved,
}: Props) {
  const isCompleteMode = !!existingOrder?.id;
  const isDoctorQuickAssign = !isCompleteMode && staffRole === "doctor";
  const isNurseRole = staffRole === "nurse" || staffRole === "receptionist" || staffRole === "admin" || isCompleteMode;
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState<string>(existingOrder?.vendor_id || "");
  const [workType, setWorkType] = useState<string>(existingOrder?.work_type || "");
  const [selectedItemId, setSelectedItemId] = useState<string>(existingOrder?.treatment_plan_item_id || "");
  const [teeth, setTeeth] = useState<string[]>(
    (existingOrder?.teeth || []).map(String).length ? (existingOrder!.teeth || []).map(String) : defaultTeeth
  );
  const [shade, setShade] = useState(existingOrder?.shade || "");
  const [customShade, setCustomShade] = useState("");
  const [expectedDate, setExpectedDate] = useState(existingOrder?.expected_date?.slice(0, 10) || "");
  const [sentToday, setSentToday] = useState(true);
  const [notes, setNotes] = useState(existingOrder?.notes || "");
  const [saving, setSaving] = useState(false);

  const asToothStrings = (list?: Array<string | number>, single?: string) =>
    Array.from(new Set((Array.isArray(list) ? list : []).map(String).concat(single ? [String(single)] : []).filter(Boolean)));

  useEffect(() => {
    if (expectedDate) return;
    const d = new Date(); d.setDate(d.getDate() + 7);
    setExpectedDate(d.toISOString().slice(0, 10));
  }, [expectedDate]);

  // Load vendors
  useEffect(() => {
    api.labVendorsList(clinicId).then((vs) => {
      const list = Array.isArray(vs) ? vs : [];
      // Preferred first
      list.sort((a: any, b: any) => Number(!!b.is_preferred) - Number(!!a.is_preferred));
      setVendors(list);
      if (!vendorId && list[0]) setVendorId(list[0].id);
    }).catch(() => setVendors([]));
  }, [clinicId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a plan item is picked, auto-fill teeth + (loose) suggest work type
  useEffect(() => {
    if (!selectedItemId) return;
    const item = planItems.find(p => p.id === selectedItemId);
    if (!item) return;
    const itemTeeth = asToothStrings(item.teeth, item.tooth_number);
    if (itemTeeth.length > 0) setTeeth(itemTeeth);
    if (!workType && item.procedure_name) {
      // Smart default: crown → "PFM Crown", bridge → "Bridge (3-unit PFM)", etc.
      const n = item.procedure_name.toLowerCase();
      if (n.includes("zirconia") && n.includes("crown")) setWorkType("Zirconia Crown");
      else if (n.includes("crown")) setWorkType("PFM Crown");
      else if (n.includes("bridge")) setWorkType("Bridge (3-unit PFM)");
      else if (n.includes("veneer")) setWorkType("Veneer (porcelain)");
      else if (n.includes("rpd") || n.includes("partial")) setWorkType("RPD (acrylic)");
      else if (n.includes("cpd") || n.includes("complete")) setWorkType("CPD");
      else if (n.includes("inlay") || n.includes("onlay")) setWorkType("Inlay/Onlay");
      else if (n.includes("night") || n.includes("guard") || n.includes("splint")) setWorkType("Night guard");
    }
  }, [selectedItemId, planItems]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Lab-eligible plan items only
  const labItems = useMemo(
    () => planItems.filter(p => p.requires_lab !== false && !p.lab_order_id),
    [planItems]
  );

  const eligibleTeeth = useMemo(() => {
    if (selectedItemId) {
      const selectedItem = labItems.find(p => p.id === selectedItemId);
      return asToothStrings(selectedItem?.teeth, selectedItem?.tooth_number);
    }
    return Array.from(new Set(labItems.flatMap(p => asToothStrings(p.teeth, p.tooth_number))));
  }, [labItems, selectedItemId]);

  const toggleTooth = (t: string) => {
    if (eligibleTeeth.length > 0 && !eligibleTeeth.includes(t)) return;
    setTeeth(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  // Render a basic tooth chart strip (universal 11-48 FDI)
  const upperRight = ["18","17","16","15","14","13","12","11"];
  const upperLeft  = ["21","22","23","24","25","26","27","28"];
  const lowerLeft  = ["31","32","33","34","35","36","37","38"];
  const lowerRight = ["48","47","46","45","44","43","42","41"];

  const ToothCell = ({ t }: { t: string }) => {
    const sel = teeth.includes(t);
    const inPlan = eligibleTeeth.includes(t);
    const disabled = eligibleTeeth.length > 0 && !inPlan;
    return (
      <button onClick={() => toggleTooth(t)} disabled={disabled} style={{
        width: 30, height: 38, borderRadius: 6,
        border: `1.5px solid ${sel ? TEAL : (inPlan ? "#F59E0B" : LINE)}`,
        background: sel ? TEAL : (inPlan ? "#FEF3C7" : "#fff"),
        color: sel ? "#fff" : (inPlan ? "#92400E" : INK),
        fontSize: 11, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", padding: 0,
        opacity: disabled ? 0.35 : 1,
      }}>{t}</button>
    );
  };

  const submit = async () => {
    if (!workType.trim()) { alert("Select or enter work type"); return; }
    if (teeth.length === 0) { alert("Select at least one tooth"); return; }
    const finalShade = shade === "__custom__" ? customShade.trim().toUpperCase() : (shade || null);
    const nurseFieldsComplete = !!(vendorId && finalShade && expectedDate);
    if (isNurseRole && !nurseFieldsComplete) {
      alert("Nurse must fill vendor, shade, and expected date before sending to lab.");
      return;
    }
    setSaving(true);
    try {
      const readyToSend = nurseFieldsComplete && sentToday;
      const payload: any = {
        clinic_id: clinicId,
        patient_id: patientId,
        appointment_id: appointmentId || null,
        treatment_plan_item_id: selectedItemId || null,
        vendor_id: vendorId || null,
        work_type: workType.trim() || null,
        teeth: teeth.map(t => parseInt(t, 10)).filter(n => !Number.isNaN(n)),
        shade: finalShade,
        sent_date: readyToSend ? new Date().toISOString().slice(0, 10) : null,
        expected_date: expectedDate || null,
        cost: 0,
        notes: notes || null,
      };
      let orderId: string;
      if (isCompleteMode && existingOrder?.id) {
        await api.labUpdateOrder(existingOrder.id, {
          vendor_id: vendorId || null,
          work_type: workType.trim() || null,
          teeth: payload.teeth,
          shade: finalShade,
          expected_date: expectedDate || null,
          sent_date: readyToSend ? new Date().toISOString().slice(0, 10) : null,
          notes: notes || null,
        });
        orderId = existingOrder.id;
      } else {
        const res = await api.labOrderCreate(payload);
        orderId = res.id || res.order?.id;
      }
      try { await api.bumpLabWorkType(workType.trim(), clinicId); } catch {}
      onSaved?.(orderId);
      onClose();
    } catch (e: any) {
      alert(`Could not create lab order: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 18, width: "min(680px, 100%)",
        maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(15,23,42,0.3)",
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
          padding: "16px 22px", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderRadius: "18px 18px 0 0",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{isCompleteMode ? "🧪 Complete Lab Order" : "🧪 Send to Lab"}</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              Patient: <b>{patientName}</b>
              {isCompleteMode && <span> · Nurse fills vendor, shade & date → sends to lab</span>}
              {isDoctorQuickAssign && <span> · Doctor assigns work — nurse completes vendor/shade before lab order goes out</span>}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)", color: "#fff",
            border: "none", borderRadius: 8, padding: 6, cursor: "pointer",
          }}><X size={18} /></button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>
          {/* Vendor */}
          <div>
            <div style={labelStyle}>Vendor {isDoctorQuickAssign ? "(nurse fills)" : "*"}</div>
            <select style={inputStyle} value={vendorId} onChange={e => setVendorId(e.target.value)}>
              {vendors.length === 0 && <option value="">No vendors — add in Settings → Labs</option>}
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.is_preferred ? "⭐ " : ""}{v.name}{v.contact_person ? ` — ${v.contact_person}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Plan item picker — auto-fills teeth */}
          {labItems.length > 0 && (
            <div>
              <div style={labelStyle}>Linked Treatment Item (optional — auto-fills teeth)</div>
              <select style={inputStyle} value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}>
                <option value="">— None / freeform —</option>
                {labItems.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.procedure_name} · tooth {(it.teeth || []).join(", ") || it.tooth_number || "?"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Work type with inline-add */}
          <div>
            <div style={labelStyle}>Work Type</div>
            <DropdownWithInlineAdd
              value={workType}
              onChange={setWorkType}
              fetchSuggestions={async (q) => api.listLabWorkTypes({ clinic_id: clinicId, q })}
              addNew={async (name) => {
                const r = await api.createLabWorkType({ name, clinic_id: clinicId });
                return r.name || name;
              }}
              placeholder="e.g. PFM Crown, Zirconia Bridge…"
              labelKey="name"
              valueKey="name"
              secondaryKey="category"
            />
          </div>

          {/* Tooth picker */}
          <div>
            <div style={labelStyle}>Teeth {teeth.length > 0 && <span style={{ color: TEAL, marginLeft: 6 }}>({teeth.length} selected)</span>}</div>
            <div style={{ background: SOFT, padding: 12, borderRadius: 12, border: `1.5px solid ${LINE}` }}>
              <div style={{ display: "flex", gap: 2, justifyContent: "center", marginBottom: 4 }}>
                {upperRight.map(t => <ToothCell key={t} t={t} />)}
                <div style={{ width: 8 }} />
                {upperLeft.map(t => <ToothCell key={t} t={t} />)}
              </div>
              <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                {lowerRight.map(t => <ToothCell key={t} t={t} />)}
                <div style={{ width: 8 }} />
                {lowerLeft.map(t => <ToothCell key={t} t={t} />)}
              </div>
              <div style={{ fontSize: 10.5, color: MUTE, marginTop: 8, textAlign: "center" }}>
                Yellow = referenced by treatment plan · Teal = selected for this lab order
              </div>
            </div>
          </div>

          {/* Shade + dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={labelStyle}>Shade {isDoctorQuickAssign ? "(nurse fills)" : "*"}</div>
              <select style={inputStyle} value={shade} onChange={e => setShade(e.target.value)}>
                <option value="">{isDoctorQuickAssign ? "— Nurse will select —" : "— Select shade —"}</option>
                {SHADE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__custom__">Other…</option>
              </select>
              {shade === "__custom__" && (
                <input style={{ ...inputStyle, marginTop: 8 }} placeholder="Enter custom shade" value={customShade} onChange={e => setCustomShade(e.target.value)} />
              )}
            </div>
            <div>
              <div style={labelStyle}>Expected by {isDoctorQuickAssign ? "(nurse fills)" : "*"}</div>
              <input style={inputStyle} type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
            </div>
          </div>

          {!isDoctorQuickAssign && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: INK, fontWeight: 600 }}>
            <input type="checkbox" checked={sentToday} onChange={e => setSentToday(e.target.checked)} />
            Mark as sent today (vendor + shade + date required; otherwise stays pending for nurse)
          </label>
          )}

          <div>
            <div style={labelStyle}>Notes for the lab</div>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
              placeholder="e.g. Special impression notes, occlusion concerns…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 22px", borderTop: `1.5px solid ${LINE}`,
          display: "flex", gap: 10, justifyContent: "flex-end",
          background: SOFT, borderRadius: "0 0 18px 18px",
        }}>
          <button onClick={onClose} style={{
            border: `1.5px solid ${LINE}`, background: "#fff", color: MUTE,
            borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{
            border: "none", background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
            color: "#fff", borderRadius: 12, padding: "11px 22px", fontWeight: 800, fontSize: 13.5,
            cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6,
            boxShadow: `0 4px 12px ${TEAL}44`, opacity: 1,
          }}>
            <Send size={15} /> {saving ? "Saving…" : isCompleteMode ? "Complete & Send to Lab" : isDoctorQuickAssign ? "Assign Lab Work" : "Send to Lab"}
          </button>
        </div>
      </div>
    </div>
  );
}
