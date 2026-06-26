"use client";
/**
 * components/LabManagement.tsx — Bundle R
 *
 * Lab module UI with three tabs:
 *   1. Orders     — open/in-progress/received/overdue
 *   2. Vendors    — vendor list with running balance
 *   3. Ledger     — per-vendor running ledger (orders + payments)
 *
 * Each tab is card-based with intuitive status colors.
 * Triggers WhatsApp on order creation, modification, and receipt.
 */

import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { LabClosureModal } from "@/components/MedicineAutocomplete";
import SendToLabModal from "@/components/SendToLabModal";

const A = "#0E7C7B";
const A_DEEP = "#0A5C5B";       // accessible darker accent for text on light
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const BG = "#F8FAFC";
const SEV = {
  pending:    "#3B82F6",
  sent:       "#A855F7",
  received:   "#10B981",
  fitted:     "#0E7C7B",
  completed:  "#065F46",
  rejected:   "#EF4444",
  redo:       "#F59E0B",
  cancelled:  MUTE,
  overdue:    "#EF4444",
};
const SHADE_OPTIONS = ["A1","A2","A3","A3.5","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4"];

export default function LabManagement({ staff, show, accent = A }: any) {
  const [tab, setTab] = useState<"orders" | "vendors" | "ledger">("orders");
  const canSeeLabMoney = ["doctor", "admin"].includes(staff?.role);
  const tabs = [
    { v: "orders", l: "📦 Orders" },
    ...(canSeeLabMoney ? [{ v: "vendors", l: "🏭 Vendors" }, { v: "ledger", l: "📊 Ledger" }] : []),
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap" as const, gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>🦷 Lab Management</h1>
      </div>

      <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden" as const, boxShadow: "0 2px 10px #0f172a08" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${LINE}`, padding: "8px 8px 0" }}>
          {tabs.map(o => (
            <button key={o.v} onClick={() => setTab(o.v as any)} style={{
              padding: "12px 18px", border: "none", background: tab === o.v ? `${A}14` : "transparent",
              borderBottom: tab === o.v ? `2px solid ${A}` : "2px solid transparent",
              color: tab === o.v ? A_DEEP : MUTE, fontWeight: 700, fontSize: 13.5,
              borderRadius: "10px 10px 0 0", marginBottom: -1, cursor: "pointer", fontFamily: "inherit",
            }}>{o.l}</button>
          ))}
        </div>
        <div style={{ padding: 20 }}>
          {tab === "orders" && <OrdersTab staff={staff} show={show} />}
          {tab === "vendors" && canSeeLabMoney && <VendorsTab staff={staff} show={show} />}
          {tab === "ledger" && canSeeLabMoney && <LedgerTab staff={staff} show={show} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────────────────────────────────────
function OrdersTab({ staff, show }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("active");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmReceive, setConfirmReceive] = useState<any>(null);
  const [closing, setClosing] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [completing, setCompleting] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      // DB-aligned lab_orders status values: pending|sent|received|fitted|completed|rejected|redo|cancelled
      const status = filter === "all" ? "" :
                     filter === "active" ? "pending,sent" :
                     filter === "received" ? "received,fitted" : filter;
      const q = status ? `?clinic_id=${staff.clinic_id}&status=${status}` : `?clinic_id=${staff.clinic_id}`;
      const d = await api.apiFetch?.(`/api/lab/orders${q}`);
      setOrders(d?.orders || []);
    } catch (e: any) { show("Error: " + e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter]); // eslint-disable-line

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      active:   orders.filter(o => ["pending", "sent"].includes(o.status)).length,
      dueToday: orders.filter(o => o.expected_date === today && !["received", "fitted", "completed", "cancelled"].includes(o.status)).length,
      overdue:  orders.filter(o => o.expected_date && o.expected_date < today && !["received", "fitted", "completed", "cancelled"].includes(o.status)).length,
      ready:    orders.filter(o => o.status === "received").length,
    };
  }, [orders]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" as const, marginBottom: 14, flexWrap: "wrap" as const, gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, flex: 1, minWidth: 360 }}>
          <Stat label="Active" v={stats.active} c={A_DEEP} />
          <Stat label="Due today" v={stats.dueToday} c="#F59E0B" />
          <Stat label="Overdue" v={stats.overdue} c="#EF4444" />
          <Stat label="Ready" v={stats.ready} c="#10B981" />
        </div>
        <button onClick={() => setCreating(true)} style={btnPrimary}>+ New order</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" as const }}>
        {[
          { v: "active", l: "Active" },
          { v: "received", l: "Ready" },
          { v: "all", l: "All" },
        ].map(o => (
          <button key={o.v} onClick={() => setFilter(o.v)} style={pillBtn(filter === o.v)}>{o.l}</button>
        ))}
      </div>

      {loading && <div style={loadingDiv}>⏳ Loading orders…</div>}

      {orders.map(o => (
        <OrderCard key={o.id} order={o} staff={staff}
          onReceive={() => setConfirmReceive(o)}
          onClose={() => setClosing(o)}
          onEdit={() => setEditing(o)}
          onComplete={() => setCompleting(o)}
          show={show}
          onChange={load} />
      ))}

      {creating && (
        <NewOrderModal staff={staff} onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); load(); show("✓ Order created and lab notified"); }}
          show={show} />
      )}

      {editing && (
        <EditOrderModal staff={staff} order={editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); show("✓ Order updated"); }}
          show={show} />
      )}

      {confirmReceive && (
        <ConfirmReceiveModal
          order={confirmReceive}
          onClose={() => setConfirmReceive(null)}
          onReceived={() => { setConfirmReceive(null); load(); show("✓ Lab work received — patient notified"); }}
          show={show} />
      )}

      {closing && (
        <LabClosureModal
          order={closing}
          onClose={() => setClosing(null)}
          onClosed={() => { setClosing(null); load(); show("✓ Lab order closed"); }}
          show={show}
        />
      )}

      {completing && (
        <SendToLabModal
          patientId={completing.patient_id}
          patientName={completing.patient_name || "Patient"}
          clinicId={staff.clinic_id}
          staffRole="nurse"
          existingOrder={{
            id: completing.id,
            work_type: completing.work_type,
            vendor_id: completing.vendor_id,
            teeth: Array.isArray(completing.teeth) ? completing.teeth : (completing.teeth_involved ? String(completing.teeth_involved).split(",").map(Number) : []),
            shade: completing.shade,
            expected_date: completing.expected_date,
            notes: completing.notes,
            treatment_plan_item_id: completing.treatment_plan_item_id,
            status: completing.status,
          }}
          onClose={() => setCompleting(null)}
          onSaved={() => { setCompleting(null); load(); show("✓ Lab order completed & sent"); }}
        />
      )}
    </div>
  );
}

function OrderCard({ order, staff, onReceive, onClose, onEdit, onComplete, show, onChange }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = order.expected_date && order.expected_date < today && !["received", "fitted", "completed", "cancelled"].includes(order.status);
  const isLocked = ["completed", "cancelled"].includes(order.status);

  const labWa = () => {
    let to = String(order.vendor_whatsapp || order.vendor_phone || "").replace(/[^0-9]/g, "");
    if (to && to.length === 10) to = "91" + to;
    return to;
  };
  const sendToLab = () => {
    const to = labWa();
    if (!to) { show?.("No WhatsApp/phone on file for this lab"); return; }
    const teeth = Array.isArray(order.teeth) ? order.teeth.join(",") : (order.teeth || order.teeth_involved || "");
    const msg = `Lab order #${order.serial_no || ""}\nPatient: ${order.patient_name}\nWork: ${order.work_type}` +
      (teeth ? `\nTeeth: ${teeth}` : "") + (order.shade ? `\nShade: ${order.shade}` : "") +
      (order.expected_date ? `\nExpected by: ${order.expected_date}` : "") +
      (order.cost > 0 ? `\nAgreed cost: ₹${order.cost}` : "") +
      (order.notes ? `\nNotes: ${order.notes}` : "");
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(msg)}`, "_blank");
  };
  const balance = Number(order.cost || 0) - Number(order.amount_paid || 0);
  const canSeeLabMoney = ["doctor", "admin"].includes(staff?.role);
  const approveReceipt = async () => {
    try {
      await api.apiFetch?.(`/api/lab/orders/${order.id}/approve`, { method: "POST" });
      show?.("Lab work approved and marked payable");
      onChange?.();
    } catch (e: any) { show?.("Approval failed: " + e.message); }
  };
  const payLab = async () => {
    if (balance <= 0) { show?.("Nothing outstanding for this order"); return; }
    if (!confirm(`Record payment of ₹${balance} to ${order.vendor_name || "the lab"} and send a confirmation?`)) return;
    try {
      await api.apiFetch?.(`/api/lab/orders/${order.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount: balance, payment_mode: "upi", notes: "Paid on lab receipt" }),
      });
      show?.("✓ Payment recorded");
      const to = labWa();
      if (to) {
        const msg = `Payment confirmed ✅\nLab order #${order.serial_no || ""} — ${order.work_type} for ${order.patient_name}\nAmount paid: ₹${balance}. Thank you.`;
        window.open(`https://wa.me/${to}?text=${encodeURIComponent(msg)}`, "_blank");
      }
      onChange?.();
    } catch (e: any) { show?.("Error: " + e.message); }
  };
  const statusKey = isOverdue ? "overdue" : order.status;
  const color = (SEV as any)[statusKey] || MUTE;

  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10,
      border: `1px solid ${isOverdue ? "#FCA5A5" : LINE}`,
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center" as const,
    }}>
      <div style={{
        width: 6, height: 60, borderRadius: 4, background: color,
      }} />
      <div>
        <div style={{ display: "flex", alignItems: "center" as const, gap: 8, marginBottom: 4 }}>
          <b style={{ fontSize: 15, color: INK }}>{order.work_type}</b>
          <span style={pill(color)}>{statusKey.replace("_", " ")}</span>
          {isOverdue && (
            <span style={pill("#EF4444")}>
              {Math.ceil((Date.now() - new Date(order.expected_date).getTime()) / 86400000)}d overdue
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: MUTE }}>
          For <b style={{ color: INK }}>{order.patient_name}</b> · Lab: {order.vendor_name || "—"}
          {(order.teeth || order.teeth_involved) && ` · Teeth ${Array.isArray(order.teeth) ? order.teeth.join(",") : (order.teeth || order.teeth_involved)}`}
          {order.shade && ` · Shade ${order.shade}`}
        </div>
        <div style={{ fontSize: 12, color: MUTE, marginTop: 3 }}>
          Due: <b style={{ color: isOverdue ? "#EF4444" : INK }}>{order.expected_date || "TBD"}</b>
          {canSeeLabMoney && order.cost > 0 && ` · Owed ₹${Number(order.cost).toLocaleString()}`}
          {canSeeLabMoney && Number(order.amount_paid || 0) > 0 && ` · Paid ₹${Number(order.amount_paid).toLocaleString()}`}
          {canSeeLabMoney && order.cost > 0 && balance > 0 && <b style={{ color: "#EF4444" }}> · Balance ₹{balance.toLocaleString()}</b>}
          {canSeeLabMoney && order.cost > 0 && balance <= 0 && <b style={{ color: "#10B981" }}> · Paid in full ✓</b>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
        {order.status === "pending" && ["nurse", "receptionist", "admin"].includes(staff?.role) && onComplete && (
          <button onClick={onComplete} style={btnSmall("#0E7C7B")}>Complete & Send to Lab</button>
        )}
        {["pending", "sent"].includes(order.status) && (
          <button onClick={onReceive} style={btnSmall("#10B981")}>✓ Mark received</button>
        )}
        {canSeeLabMoney && order.status === "received" && (
          <button onClick={approveReceipt} style={btnSmall("#059669")}>Approve & mark payable</button>
        )}
        {order.status === "fitted" && ["doctor", "admin", "nurse"].includes(staff?.role) && (
          <button onClick={onClose} style={btnSmall("#0E7C7B")}>✓ Close (fit done)</button>
        )}
        {!isLocked && (
          <button onClick={onEdit} style={btnSmall("#6366F1")}>✎ Edit</button>
        )}
        {["pending", "sent"].includes(order.status) && (
          <button onClick={sendToLab} style={btnSmall("#059669")}>WA → Lab</button>
        )}
        {canSeeLabMoney && ["received", "fitted", "completed"].includes(order.status) && order.cost > 0 && balance > 0 && (
          <button onClick={payLab} style={btnSmall("#F59E0B")}>💰 Pay lab ₹{balance.toLocaleString()}</button>
        )}
        {order.status === "completed" && (
          <span style={{ fontSize: 11, color: "#065F46", fontWeight: 700, padding: "4px 10px",
            background: "#10B98115", borderRadius: 8, textAlign: "center" as const }}>
            ✓ Completed
          </span>
        )}
      </div>
    </div>
  );
}

function NewOrderModal({ staff, onClose, onCreated, show }: any) {
  const canSeeLabMoney = ["doctor", "admin"].includes(staff?.role);
  const [patients, setPatients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [workTypes, setWorkTypes] = useState<any[]>([]);
  const [patientId, setPatientId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [workType, setWorkType] = useState("");
  const [teeth, setTeeth] = useState("");
  const [shade, setShade] = useState("");
  const [customShade, setCustomShade] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, v, w] = await Promise.all([
          api.apiFetch?.(`/api/patients-db/list?clinic_id=${staff.clinic_id}&limit=200`),
          api.apiFetch?.(`/api/lab/vendors?clinic_id=${staff.clinic_id}`),
          api.apiFetch?.(`/api/lab/work-types`),
        ]);
        // Endpoints vary: patients → {patients:[]}, vendors/work-types → bare arrays
        setPatients(Array.isArray(p) ? p : (p?.patients || []));
        setVendors(Array.isArray(v) ? v : (v?.vendors || []));
        setWorkTypes(Array.isArray(w) ? w : (w?.work_types || []));
      } catch (e: any) { show("Could not load form data: " + (e?.message || e)); }
    })();
  }, []); // eslint-disable-line

  const submit = async () => {
    const finalShade = shade === "__custom__" ? customShade.trim().toUpperCase() : shade || "";
    if (!patientId || !vendorId || !workType) {
      show("Patient, vendor, and work type are required");
      return;
    }
    if (!canSeeLabMoney && !teeth.trim()) {
      show("Tooth number is required");
      return;
    }
    if (!canSeeLabMoney && !finalShade) {
      show("Shade is required");
      return;
    }
    if (!canSeeLabMoney && !expectedDate) {
      show("Expected date is required");
      return;
    }
    setSaving(true);
    try {
      const teethArr = teeth ? teeth.split(",").map(t => parseInt(t.trim(), 10)).filter(t => !Number.isNaN(t)) : [];
      const r = await api.apiFetch?.(`/api/lab/orders`, {
        method: "POST",
        body: JSON.stringify({
          clinic_id: staff.clinic_id, patient_id: patientId, vendor_id: vendorId,
          work_type: workType, teeth: teethArr, shade: finalShade || null,
          expected_date: expectedDate || null,
          cost: canSeeLabMoney && cost ? parseFloat(cost) : 0,
          notes,
        }),
      });
      onCreated();
    } catch (e: any) { show("Error: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={modalBg}>
      <div onClick={e => e.stopPropagation()} style={modalCard}>
        <h2 style={{ margin: "0 0 4px" }}>New lab order</h2>
        <p style={{ marginTop: 0, fontSize: 13, color: MUTE }}>Lab will be auto-notified via WhatsApp.</p>

        <Field label="Patient *">
          <select value={patientId} onChange={e => setPatientId(e.target.value)} style={input}>
            <option value="">— Select —</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
          </select>
        </Field>

        <Field label="Lab vendor *">
          <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={input}>
            <option value="">— Select —</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>

        <Field label="Work type *">
          <select value={workType} onChange={e => setWorkType(e.target.value)} style={input}>
            <option value="">— Select —</option>
            {workTypes.length > 0
              ? workTypes.map((w, i) => <option key={i} value={w.name || w}>{w.name || w}</option>)
              : ["PFM Crown", "Zirconia Crown", "Complete Denture", "Partial Denture", "Implant Crown", "Veneer", "Inlay/Onlay", "Bridge"].map(t =>
                  <option key={t} value={t}>{t}</option>
                )}
          </select>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Teeth (FDI)"><input value={teeth} onChange={e => setTeeth(e.target.value)} placeholder="e.g. 16, 26" style={input} /></Field>
          <Field label="Shade">
            <select value={shade} onChange={e => setShade(e.target.value)} style={input}>
              <option value="">— Select shade —</option>
              {SHADE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__custom__">Other…</option>
            </select>
            {shade === "__custom__" && <input value={customShade} onChange={e => setCustomShade(e.target.value)} placeholder="Enter custom shade" style={{ ...input, marginTop: 8 }} />}
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Expected by"><input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} style={input} /></Field>
          {canSeeLabMoney && <Field label="Cost (₹)"><input type="number" value={cost} onChange={e => setCost(e.target.value)} style={input} /></Field>}
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...input, minHeight: 60, fontFamily: "inherit" }} />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end" as const, gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={saving} style={btnPrimary}>
            {saving ? "Saving…" : "Create + Notify lab"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EDIT ORDER — nurse changes lab/vendor, expected (= patient scheduled) date, cost
// ─────────────────────────────────────────────────────────────────────────
function EditOrderModal({ staff, order, onClose, onSaved, show }: any) {
  const [vendors, setVendors] = useState<any[]>([]);
  const canSeeLabMoney = ["doctor", "admin"].includes(staff?.role);
  const [vendorId, setVendorId] = useState(order.vendor_id || "");
  const [workType, setWorkType] = useState(order.work_type || "");
  const [teeth, setTeeth] = useState<number[]>(Array.isArray(order.teeth) ? order.teeth.map((t: any) => Number(t)).filter((t: number) => !Number.isNaN(t)) : []);
  const linkedTeeth = Array.isArray(order.linked_treatment_teeth) ? order.linked_treatment_teeth.map((t: any) => Number(t)).filter((t: number) => !Number.isNaN(t)) : [];
  const selectableTeeth = linkedTeeth.length > 0 ? linkedTeeth : teeth;
  const [shade, setShade] = useState(order.shade && SHADE_OPTIONS.includes(String(order.shade).toUpperCase()) ? String(order.shade).toUpperCase() : (order.shade ? "__custom__" : ""));
  const [customShade, setCustomShade] = useState(order.shade && !SHADE_OPTIONS.includes(String(order.shade).toUpperCase()) ? String(order.shade).toUpperCase() : "");
  const [expectedDate, setExpectedDate] = useState(order.expected_date || "");
  const [cost, setCost] = useState(order.cost ? String(order.cost) : "");
  const [notes, setNotes] = useState(order.notes || "");
  const [saving, setSaving] = useState(false);

  const toggleTooth = (n: number) => {
    if (selectableTeeth.length > 0 && !selectableTeeth.includes(n)) return;
    setTeeth(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b));
  };

  useEffect(() => {
    (async () => {
      try {
        const v = await api.apiFetch?.(`/api/lab/vendors?clinic_id=${staff.clinic_id}`);
        setVendors(Array.isArray(v) ? v : (v?.vendors || []));
      } catch { setVendors([]); }
    })();
  }, []); // eslint-disable-line

  const save = async () => {
    const finalShade = shade === "__custom__" ? customShade.trim().toUpperCase() : shade || "";
    if (!canSeeLabMoney) {
      if (!vendorId) { show("Vendor is required"); return; }
      if (!workType.trim()) { show("Work type is required"); return; }
      if (teeth.length === 0) { show("Tooth number is required"); return; }
      if (!finalShade) { show("Shade is required"); return; }
      if (!expectedDate) { show("Expected date is required"); return; }
    }
    setSaving(true);
    try {
      await api.apiFetch?.(`/api/lab/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          vendor_id: vendorId || null,
          work_type: workType || null,
          teeth,
          shade: finalShade || null,
          expected_date: expectedDate || null,
          ...(canSeeLabMoney ? { cost: cost ? parseFloat(cost) : 0 } : {}),
          notes: notes || null,
        }),
      });
      onSaved();
    } catch (e: any) { show("Error: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={modalBg}>
      <div onClick={e => e.stopPropagation()} style={modalCard}>
        <h2 style={{ margin: "0 0 4px" }}>Edit lab order</h2>
        <p style={{ marginTop: 0, fontSize: 13, color: MUTE }}>
          For <b style={{ color: INK }}>{order.patient_name}</b> · #{order.serial_no}
        </p>

        <Field label="Lab vendor">
          <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={input}>
            <option value="">— Select —</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>

        <Field label="Work type"><input value={workType} onChange={e => setWorkType(e.target.value)} style={input} /></Field>

        <Field label={`Tooth number${!canSeeLabMoney ? " *" : ""}`}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            {selectableTeeth.map((n: number) => (
              <button key={n} type="button" onClick={() => toggleTooth(n)} style={{
                border: teeth.includes(n) ? `2px solid ${A}` : `1.5px solid ${LINE}`,
                background: teeth.includes(n) ? A : "#fff",
                color: teeth.includes(n) ? "#fff" : INK,
                borderRadius: 999, padding: "8px 12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>#{n}</button>
            ))}
            {selectableTeeth.length === 0 && <div style={{ fontSize: 12, color: MUTE }}>No linked treatment teeth found for this order.</div>}
          </div>
          {linkedTeeth.length > 0 && <div style={{ fontSize: 11, color: MUTE, marginTop: 6 }}>Only treatment-selected teeth are allowed here.</div>}
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Expected by (patient's scheduled date)">
            <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} style={input} />
          </Field>
          <Field label={`Shade${!canSeeLabMoney ? " *" : ""}`}>
            <select value={shade} onChange={e => setShade(e.target.value)} style={input}>
              <option value="">— Select shade —</option>
              {SHADE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__custom__">Other…</option>
            </select>
            {shade === "__custom__" && <input value={customShade} onChange={e => setCustomShade(e.target.value)} style={{ ...input, marginTop: 8 }} placeholder="Enter custom shade" />}
          </Field>
        </div>

        {canSeeLabMoney && <Field label="Cost (₹ payable to lab)"><input type="number" value={cost} onChange={e => setCost(e.target.value)} style={input} /></Field>}
        <Field label="Notes"><textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...input, minHeight: 60, fontFamily: "inherit" }} /></Field>

        <div style={{ display: "flex", justifyContent: "flex-end" as const, gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmReceiveModal({ order, onClose, onReceived, show }: any) {
  const [actualReceived, setActualReceived] = useState(new Date().toISOString().slice(0, 10));
  const [qualityNotes, setQualityNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.apiFetch?.(`/api/lab/orders/${order.id}/receive`, {
        method: "POST",
        body: JSON.stringify({ actual_received_date: actualReceived, quality_notes: qualityNotes }),
      });
      // Patient notification fires via existing triggerLabReceived
      try { await api.triggerLabReceived?.(order.id); } catch {}
      onReceived();
    } catch (e: any) { show("Error: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={modalBg}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalCard, maxWidth: 460 }}>
        <h2 style={{ margin: "0 0 4px" }}>Confirm receipt</h2>
        <div style={{ fontSize: 13, color: MUTE, marginBottom: 12 }}>
          {order.work_type} for {order.patient_name} from {order.vendor_name}
        </div>
        <Field label="Date received"><input type="date" value={actualReceived} onChange={e => setActualReceived(e.target.value)} style={input} /></Field>
        <Field label="Quality notes (optional)">
          <textarea value={qualityNotes} onChange={e => setQualityNotes(e.target.value)} style={{ ...input, minHeight: 60, fontFamily: "inherit" }}
            placeholder="Shade match, fit, etc." />
        </Field>
        <div style={{ padding: 10, background: BG, borderRadius: 8, fontSize: 12, color: MUTE, marginBottom: 12 }}>
          On confirmation, patient {order.patient_name} will receive a WhatsApp asking to book a fitting appointment.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" as const, gap: 8 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...btnPrimary, background: "#10B981" }}>
            {saving ? "Saving…" : "✓ Confirm + Notify patient"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VENDORS TAB
// ─────────────────────────────────────────────────────────────────────────
function VendorsTab({ staff, show }: any) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.apiFetch?.(`/api/lab/vendors?clinic_id=${staff.clinic_id}`);
      setVendors(d?.vendors || []);
    } catch (e: any) { show("Error: " + e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end" as const, marginBottom: 12 }}>
        <button onClick={() => setCreating(true)} style={btnPrimary}>+ Add vendor</button>
      </div>
      {loading && <div style={loadingDiv}>⏳ Loading…</div>}
      {vendors.map(v => (
        <div key={v.id} style={{
          background: "#fff", borderRadius: 14, padding: 14, marginBottom: 8,
          border: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between",
          alignItems: "center" as const, gap: 12,
        }}>
          <div>
            <b style={{ fontSize: 15 }}>{v.name}</b>
            <div style={{ fontSize: 12, color: MUTE, marginTop: 3 }}>
              📞 {v.phone || "—"}
              {v.whatsapp_number && v.whatsapp_number !== v.phone && ` · 💬 ${v.whatsapp_number}`}
              {v.address && ` · ${v.address}`}
            </div>
            {v.specialties && <div style={{ fontSize: 11, color: A_DEEP, marginTop: 3 }}>{v.specialties}</div>}
          </div>
          <button onClick={() => setEditing(v)} style={btnGhost}>Edit</button>
        </div>
      ))}

      {(creating || editing) && (
        <VendorModal vendor={editing} staff={staff}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); show("✓ Vendor saved"); }}
          show={show} />
      )}
    </div>
  );
}

function VendorModal({ vendor, staff, onClose, onSaved, show }: any) {
  const [name, setName] = useState(vendor?.name || "");
  const [phone, setPhone] = useState(vendor?.phone || "");
  const [wa, setWa] = useState(vendor?.whatsapp_number || "");
  const [email, setEmail] = useState(vendor?.email || "");
  const [address, setAddress] = useState(vendor?.address || "");
  const [specialties, setSpecialties] = useState(vendor?.specialties || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { show("Name required"); return; }
    setSaving(true);
    try {
      const body = JSON.stringify({
        clinic_id: staff.clinic_id, name, phone, whatsapp_number: wa,
        email, address, specialties,
      });
      if (vendor?.id) {
        await api.apiFetch?.(`/api/lab/vendors/${vendor.id}`, { method: "PATCH", body });
      } else {
        await api.apiFetch?.(`/api/lab/vendors`, { method: "POST", body });
      }
      onSaved();
    } catch (e: any) { show("Error: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={modalBg}>
      <div onClick={e => e.stopPropagation()} style={modalCard}>
        <h2 style={{ margin: "0 0 12px" }}>{vendor ? "Edit vendor" : "New vendor"}</h2>
        <Field label="Lab name *"><input value={name} onChange={e => setName(e.target.value)} style={input} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} style={input} /></Field>
          <Field label="WhatsApp (if different)"><input value={wa} onChange={e => setWa(e.target.value)} style={input} /></Field>
        </div>
        <Field label="Email"><input value={email} onChange={e => setEmail(e.target.value)} style={input} /></Field>
        <Field label="Address"><input value={address} onChange={e => setAddress(e.target.value)} style={input} /></Field>
        <Field label="Specialties / strengths">
          <input value={specialties} onChange={e => setSpecialties(e.target.value)}
            placeholder="e.g. Crowns & bridges, Implants" style={input} />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end" as const, gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LEDGER TAB
// ─────────────────────────────────────────────────────────────────────────
function LedgerTab({ staff, show }: any) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [ledger, setLedger] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const d = await api.apiFetch?.(`/api/lab/vendors?clinic_id=${staff.clinic_id}`);
      setVendors(Array.isArray(d) ? d : (d?.vendors || []));
    })();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!selectedVendor) { setLedger(null); return; }
    (async () => {
      try {
        const d = await api.apiFetch?.(`/api/lab/orders?clinic_id=${staff.clinic_id}&vendor_id=${selectedVendor}`);
        const orders = Array.isArray(d) ? d : (d?.orders || []);

        // Each order = billed (cost owed to lab) + amount_paid (sum recorded against it)
        let totalBilled = 0, totalPaid = 0;
        const rows: any[] = [];
        orders.forEach((o: any) => {
          const cost = Number(o.cost || 0);
          const paid = Number(o.amount_paid || 0);
          if (cost > 0) {
            totalBilled += cost;
            rows.push({ date: o.created_at, desc: `Order: ${o.work_type} — ${o.patient_name}`, amount: cost });
          }
          if (paid > 0) {
            totalPaid += paid;
            rows.push({ date: o.received_date || o.created_at, desc: `Payment — ${o.patient_name} (${o.work_type})`, amount: -paid });
          }
        });
        rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let run = 0;
        rows.forEach(r => { run += r.amount; r.balance = run; });
        setLedger({ rows, totalBilled, totalPaid, balance: totalBilled - totalPaid });
      } catch (e: any) { show("Error: " + e.message); }
    })();
  }, [selectedVendor]); // eslint-disable-line

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)} style={input}>
          <option value="">— Pick a vendor —</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      {!selectedVendor && (
        <div style={loadingDiv}>Pick a vendor to view its running ledger</div>
      )}

      {ledger && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
            <Stat label="Total billed" v={`₹${ledger.totalBilled.toLocaleString()}`} c={INK} />
            <Stat label="Total paid" v={`₹${ledger.totalPaid.toLocaleString()}`} c="#10B981" />
            <Stat label="Balance owed"
              v={`₹${Math.abs(ledger.balance).toLocaleString()}`}
              c={ledger.balance > 0 ? "#EF4444" : "#10B981"} />
          </div>
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${LINE}`, overflow: "hidden" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
              <thead>
                <tr style={{ background: BG, textAlign: "left" as const }}>
                  <th style={th}>Date</th><th style={th}>Type</th><th style={th}>Description</th>
                  <th style={{ ...th, textAlign: "right" as const }}>Amount</th>
                  <th style={{ ...th, textAlign: "right" as const }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.map((r: any, i: number) => (
                  <tr key={i} style={{ borderTop: `1px solid ${LINE}` }}>
                    <td style={td}>{r.date ? new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</td>
                    <td style={td}>
                      <span style={pill(r.type === "order" ? "#3B82F6" : "#10B981")}>{r.type}</span>
                    </td>
                    <td style={td}>{r.desc}</td>
                    <td style={{ ...td, textAlign: "right" as const, color: r.amount > 0 ? INK : "#10B981", fontWeight: 700 }}>
                      {r.amount > 0 ? "+" : ""}₹{Math.abs(r.amount).toLocaleString()}
                    </td>
                    <td style={{ ...td, textAlign: "right" as const, fontWeight: 700 }}>₹{r.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ledger.rows.length === 0 && <div style={{ padding: 20, textAlign: "center" as const, color: MUTE }}>No transactions yet</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────────────
function Stat({ label, v, c }: any) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 12, border: `1px solid ${LINE}` }}>
      <div style={{ fontSize: 10, color: MUTE, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: c, marginTop: 3 }}>{v}</div>
    </div>
  );
}
function Field({ label, children }: any) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

const input: any = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${LINE}`, fontSize: 14, outline: "none",
  boxSizing: "border-box" as const, fontFamily: "inherit", background: "#fff",
};
const btnPrimary: any = {
  background: A, color: "#fff", border: "none", padding: "10px 16px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const btnGhost: any = {
  background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, padding: "8px 14px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const btnSmall = (color: string): any => ({
  background: color, color: "#fff", border: "none", padding: "5px 10px",
  borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
});
const pill = (color: string): any => ({
  background: `${color}1A`, color, padding: "2px 8px", borderRadius: 999,
  fontSize: 10, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: 0.4,
});
const pillBtn = (active: boolean): any => ({
  border: active ? `2px solid ${A}` : `1.5px solid ${LINE}`,
  background: active ? `${A}14` : "#fff",
  color: active ? A_DEEP : MUTE, padding: "6px 13px", borderRadius: 999,
  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});
const loadingDiv: any = {
  padding: 30, textAlign: "center" as const, color: MUTE, fontSize: 14,
  background: "#fff", borderRadius: 12,
};
const modalBg: any = {
  position: "fixed", inset: 0, background: "#0f172aa0", zIndex: 200,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};
const modalCard: any = {
  background: "#fff", borderRadius: 16, padding: 22,
  maxWidth: 520, width: "100%", maxHeight: "90vh", overflow: "auto",
};
const th: any = { padding: "10px 14px", fontSize: 12, fontWeight: 700, color: MUTE };
const td: any = { padding: "10px 14px", fontSize: 13, color: INK };
