/**
 * SettingsLabsTab — Bundle X Pass 1
 *
 * Lab Vendor CRUD UI. Mounts inside SettingsHub under the new "Labs" tab.
 * Backend endpoints already exist at /api/lab/vendors (GET/POST/PATCH/DELETE).
 * This was the BLOCKER — without this UI, the doctor cannot create vendors,
 * cannot test lab order creation, cannot test the status constraint.
 *
 * Roles: doctor + admin can edit; receptionist read-only.
 */
import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Phone, MessageSquare, MapPin, Star } from "lucide-react";
import * as api from "@/lib/api";

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

type Vendor = {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  whatsapp_number?: string;
  email?: string;
  address?: string;
  gst?: string;
  specialities?: string[];
  rating?: number;
  is_preferred?: boolean;
  is_active?: boolean;
  notes?: string;
  clinic_id?: string;
};

const EMPTY_VENDOR: Partial<Vendor> = {
  name: "", contact_person: "", phone: "", whatsapp_number: "",
  email: "", address: "", gst: "", notes: "",
  is_preferred: false, specialities: [],
};

export default function SettingsLabsTab({ clinicId }: { clinicId?: string }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Vendor> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.labVendorsList(clinicId);
      setVendors(Array.isArray(data) ? data : []);
    } catch (e) {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [clinicId]);

  const startEdit = (v: Vendor) => { setEditing({ ...v, specialities: v.specialities || [] }); setShowAddForm(false); };
  const startAdd = () => { setEditing({ ...EMPTY_VENDOR, clinic_id: clinicId }); setShowAddForm(true); };
  const cancel = () => { setEditing(null); setShowAddForm(false); };

  const save = async () => {
    if (!editing?.name?.trim()) { alert("Vendor name is required"); return; }
    setSaving(true);
    try {
      const payload = { ...editing, clinic_id: editing.clinic_id || clinicId };
      if (showAddForm) {
        await api.labVendorCreate(payload);
      } else if (editing.id) {
        await api.labVendorUpdate(editing.id, payload);
      }
      await load();
      cancel();
    } catch (e: any) {
      alert(`Save failed: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (v: Vendor) => {
    if (!confirm(`Delete vendor "${v.name}"? This deactivates it (soft delete).`)) return;
    try { await api.labVendorDelete(v.id); await load(); }
    catch (e: any) { alert(`Delete failed: ${e?.message || e}`); }
  };

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: INK }}>Lab Vendors</div>
          <div style={{ fontSize: 13, color: MUTE, marginTop: 2 }}>
            Manage your dental lab partners. Used by Lab Management and "Send to Lab" workflows.
          </div>
        </div>
        {!editing && (
          <button
            onClick={startAdd}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
              color: "#fff", border: "none", borderRadius: 12,
              padding: "11px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: `0 4px 12px ${TEAL}44`,
            }}
          >
            <Plus size={16} /> Add Vendor
          </button>
        )}
      </div>

      {/* Form (add or edit) */}
      {editing && (
        <div style={{ background: SOFT, borderRadius: 14, padding: 18, marginBottom: 18, border: `1.5px solid ${LINE}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: TEAL_DEEP, marginBottom: 12 }}>
            {showAddForm ? "New Lab Vendor" : `Edit: ${editing.name}`}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input style={inputStyle} placeholder="Vendor name *" value={editing.name || ""}
              onChange={e => setEditing({ ...editing, name: e.target.value })} />
            <input style={inputStyle} placeholder="Contact person" value={editing.contact_person || ""}
              onChange={e => setEditing({ ...editing, contact_person: e.target.value })} />
            <input style={inputStyle} placeholder="Phone (+91…)" value={editing.phone || ""}
              onChange={e => setEditing({ ...editing, phone: e.target.value })} />
            <input style={inputStyle} placeholder="WhatsApp number (if different)" value={editing.whatsapp_number || ""}
              onChange={e => setEditing({ ...editing, whatsapp_number: e.target.value })} />
            <input style={inputStyle} placeholder="Email" value={editing.email || ""}
              onChange={e => setEditing({ ...editing, email: e.target.value })} />
            <input style={inputStyle} placeholder="GST number" value={editing.gst || ""}
              onChange={e => setEditing({ ...editing, gst: e.target.value })} />
            <input style={{ ...inputStyle, gridColumn: "1 / 3" }} placeholder="Address" value={editing.address || ""}
              onChange={e => setEditing({ ...editing, address: e.target.value })} />
            <input style={{ ...inputStyle, gridColumn: "1 / 3" }} placeholder="Specialities (comma-separated: Crown, Bridge, RPD…)"
              value={(editing.specialities || []).join(", ")}
              onChange={e => setEditing({ ...editing, specialities: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
            <textarea
              style={{ ...inputStyle, gridColumn: "1 / 3", minHeight: 60, resize: "vertical" }}
              placeholder="Notes (turnaround time, payment terms, etc.)"
              value={editing.notes || ""}
              onChange={e => setEditing({ ...editing, notes: e.target.value })}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: INK, fontWeight: 600 }}>
              <input type="checkbox" checked={!!editing.is_preferred}
                onChange={e => setEditing({ ...editing, is_preferred: e.target.checked })} />
              ⭐ Preferred vendor (shown first)
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
            <button onClick={cancel} style={{
              border: `1.5px solid ${LINE}`, background: "#fff", color: MUTE,
              borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{
              border: "none", background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
              color: "#fff", borderRadius: 12, padding: "10px 22px", fontWeight: 800, fontSize: 13.5,
              cursor: saving ? "wait" : "pointer", boxShadow: `0 4px 12px ${TEAL}44`,
            }}>{saving ? "Saving…" : (showAddForm ? "Add Vendor" : "Save Changes")}</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: MUTE, fontSize: 14 }}>Loading vendors…</div>
      ) : vendors.length === 0 ? (
        <div style={{
          padding: 40, textAlign: "center", color: MUTE,
          background: SOFT, borderRadius: 14, border: `1.5px dashed ${LINE}`,
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🦷</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 4 }}>No lab vendors yet</div>
          <div style={{ fontSize: 13 }}>Click "Add Vendor" to create your first lab partner.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {vendors.map(v => (
            <div key={v.id} style={{
              background: "#fff", border: `1.5px solid ${v.is_preferred ? TEAL : LINE}`,
              borderRadius: 14, padding: 14, display: "flex",
              alignItems: "flex-start", gap: 14, opacity: v.is_active === false ? 0.55 : 1,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: v.is_preferred ? TEAL : SOFT,
                color: v.is_preferred ? "#fff" : MUTE,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 800, flexShrink: 0,
              }}>{v.name?.[0]?.toUpperCase() || "L"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15.5, fontWeight: 800, color: INK }}>{v.name}</span>
                  {v.is_preferred && <span style={{
                    background: TEAL + "20", color: TEAL_DEEP, fontSize: 10.5, fontWeight: 800,
                    padding: "2px 8px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 3,
                  }}><Star size={10} /> Preferred</span>}
                  {v.is_active === false && <span style={{ fontSize: 10.5, color: "#991B1B", background: "#FEE2E2", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>Inactive</span>}
                </div>
                {v.contact_person && <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>{v.contact_person}</div>}
                <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap", fontSize: 12.5, color: MUTE }}>
                  {v.phone && <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><Phone size={12} /> {v.phone}</span>}
                  {v.whatsapp_number && v.whatsapp_number !== v.phone && <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><MessageSquare size={12} /> {v.whatsapp_number}</span>}
                  {v.address && <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><MapPin size={12} /> {v.address}</span>}
                </div>
                {(v.specialities && v.specialities.length > 0) && (
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    {v.specialities.map((s, i) => (
                      <span key={i} style={{
                        fontSize: 10.5, background: SOFT, color: MUTE, padding: "2px 8px", borderRadius: 999, fontWeight: 600,
                      }}>{s}</span>
                    ))}
                  </div>
                )}
                {v.notes && <div style={{ fontSize: 12.5, color: MUTE, marginTop: 6, fontStyle: "italic" }}>{v.notes}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEdit(v)} style={{
                  border: `1.5px solid ${LINE}`, background: "#fff", color: TEAL_DEEP,
                  borderRadius: 10, padding: "8px 10px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700,
                }}><Edit2 size={13} /> Edit</button>
                <button onClick={() => remove(v)} style={{
                  border: `1.5px solid #FECACA`, background: "#fff", color: "#DC2626",
                  borderRadius: 10, padding: "8px 10px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700,
                }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
