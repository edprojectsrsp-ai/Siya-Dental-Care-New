/**
 * SettingsSpecialistsTab — Bundle X
 *
 * CRUD for specialist staff members. Existing backend at /api/specialist/list
 * (GET = list, POST = create). This provides the missing Settings UI so
 * doctor/admin can add/edit specialists without needing direct DB access.
 */
import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Phone, MessageSquare, UserPlus } from "lucide-react";
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

type Specialist = {
  id: string; name: string; phone?: string; whatsapp_number?: string;
  email?: string; specialization?: string; is_external?: boolean;
  default_visit_fee?: number; clinic_id?: string;
};

const EMPTY: Partial<Specialist> = {
  name: "", phone: "", whatsapp_number: "", email: "",
  specialization: "", is_external: true, default_visit_fee: 0,
};

export default function SettingsSpecialistsTab({ clinicId }: { clinicId?: string }) {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Specialist> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.listSpecialists(clinicId);
      setSpecialists(Array.isArray(d) ? d : []);
    } catch { setSpecialists([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [clinicId]); // eslint-disable-line

  const startAdd = () => { setEditing({ ...EMPTY, clinic_id: clinicId }); setIsNew(true); };
  const startEdit = (s: Specialist) => { setEditing({ ...s }); setIsNew(false); };
  const cancel = () => { setEditing(null); setIsNew(false); };

  const save = async () => {
    if (!editing?.name?.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: editing.name, phone: editing.phone || null,
        whatsapp_number: editing.whatsapp_number || null,
        email: editing.email || null,
        specialization: editing.specialization || null,
        is_external: editing.is_external ?? true,
        default_visit_fee: editing.default_visit_fee || null,
        clinic_id: editing.clinic_id || clinicId || null,
      };
      if (isNew) {
        await api.createSpecialist(payload);
      } else if (editing.id) {
        await api.updateSpecialist(editing.id, payload);
      }
      await load();
      cancel();
    } catch (e: any) { alert(`Save failed: ${e?.message || e}`); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: INK }}>Specialists</div>
          <div style={{ fontSize: 13, color: MUTE, marginTop: 2 }}>
            Manage specialist doctors (endodontists, orthodontists, etc.) who can be referred patients.
          </div>
        </div>
        {!editing && (
          <button onClick={startAdd} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
            color: "#fff", border: "none", borderRadius: 12,
            padding: "11px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer",
            boxShadow: `0 4px 12px ${TEAL}44`,
          }}><UserPlus size={16} /> Add Specialist</button>
        )}
      </div>

      {editing && (
        <div style={{ background: SOFT, borderRadius: 14, padding: 18, marginBottom: 18, border: `1.5px solid ${LINE}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: TEAL_DEEP, marginBottom: 12 }}>
            {isNew ? "New Specialist" : `Edit: ${editing.name}`}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input style={inputStyle} placeholder="Name *" value={editing.name || ""}
              onChange={e => setEditing({ ...editing, name: e.target.value })} />
            <input style={inputStyle} placeholder="Specialization (e.g. Endodontist)"
              value={editing.specialization || ""}
              onChange={e => setEditing({ ...editing, specialization: e.target.value })} />
            <input style={inputStyle} placeholder="Phone" value={editing.phone || ""}
              onChange={e => setEditing({ ...editing, phone: e.target.value })} />
            <input style={inputStyle} placeholder="WhatsApp number" value={editing.whatsapp_number || ""}
              onChange={e => setEditing({ ...editing, whatsapp_number: e.target.value })} />
            <input style={inputStyle} placeholder="Email" value={editing.email || ""}
              onChange={e => setEditing({ ...editing, email: e.target.value })} />
            <input style={inputStyle} placeholder="Default visit fee ₹" type="number"
              value={editing.default_visit_fee || ""}
              onChange={e => setEditing({ ...editing, default_visit_fee: parseFloat(e.target.value) || 0 })} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: INK, fontWeight: 600 }}>
              <input type="checkbox" checked={!!editing.is_external}
                onChange={e => setEditing({ ...editing, is_external: e.target.checked })} />
              External specialist (not on payroll)
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
            }}>{saving ? "Saving…" : (isNew ? "Add Specialist" : "Save Changes")}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: MUTE }}>Loading…</div>
      ) : specialists.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: MUTE, background: SOFT, borderRadius: 14, border: `1.5px dashed ${LINE}` }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👨‍⚕️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 4 }}>No specialists configured</div>
          <div style={{ fontSize: 13 }}>Add an endodontist, orthodontist, or other visiting specialist.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {specialists.map(s => (
            <div key={s.id} style={{
              background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 14, padding: 14,
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: TEAL + "18",
                color: TEAL_DEEP, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 800, flexShrink: 0,
              }}>{s.name?.[0]?.toUpperCase() || "S"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15.5, fontWeight: 800, color: INK }}>{s.name}</span>
                  {s.specialization && <span style={{
                    background: TEAL + "15", color: TEAL_DEEP, fontSize: 10.5, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 999,
                  }}>{s.specialization}</span>}
                  {s.is_external && <span style={{ fontSize: 10.5, color: MUTE, background: SOFT, padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>External</span>}
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 12.5, color: MUTE }}>
                  {s.phone && <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><Phone size={12} /> {s.phone}</span>}
                  {s.whatsapp_number && s.whatsapp_number !== s.phone && <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><MessageSquare size={12} /> {s.whatsapp_number}</span>}
                  {s.default_visit_fee ? <span>₹{s.default_visit_fee.toLocaleString()}/visit</span> : null}
                </div>
              </div>
              <button onClick={() => startEdit(s)} style={{
                border: `1.5px solid ${LINE}`, background: "#fff", color: TEAL_DEEP,
                borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 4,
              }}><Edit2 size={13} /> Edit</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
