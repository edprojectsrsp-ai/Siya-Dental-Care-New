"use client";

import { useState, useEffect, useCallback } from "react";
import * as api from "@/lib/api";
import { sanitizeText } from "@/lib/text";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";
const SHADOW_LG = "0 8px 30px rgba(15,23,42,.14)";

const ROLE_COLORS: any = {
  admin: { bg: "#FEF3C7", color: "#92400E", icon: "👑" },
  doctor: { bg: "#DBEAFE", color: "#1E40AF", icon: "🩺" },
  specialist: { bg: "#EDE9FE", color: "#5B21B6", icon: "🧑‍⚕️" },
  nurse: { bg: "#F0FDFA", color: "#0E7C7B", icon: "💊" },
  receptionist: { bg: "#F3E8FF", color: "#6B21A8", icon: "📞" },
};

export function StaffManagement({ accent, show, currentStaff, clinics }:
  { accent: string; show: (m: string) => void; currentStaff: any; clinics: any[] }) {
  const A = accent;
  const [staff, setStaff] = useState<any[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [pinReset, setPinReset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStaff(await api.adminListStaff(includeInactive)); }
    catch (e: any) { show("Error loading staff: " + e.message); }
    finally { setLoading(false); }
  }, [includeInactive]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const stats = {
    total: staff.filter(s => s.is_active).length,
    nurses: staff.filter(s => s.is_active && s.role === "nurse").length,
    doctors: staff.filter(s => s.is_active && s.role === "doctor").length,
    specialists: staff.filter(s => s.is_active && s.role === "specialist").length,
    receptionists: staff.filter(s => s.is_active && s.role === "receptionist").length,
  };

  return (
    <div className="animate-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap" as const, gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: INK }}>👥 User Control</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#475569", fontWeight: 700 }}>
            <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} style={{ width: 17, height: 17, accentColor: A }} />
            Show inactive
          </label>
          <button onClick={() => setAdding(true)} style={{ background: `linear-gradient(135deg,${A},${A}DD)`, color: "#fff", border: "none", padding: "13px 22px", borderRadius: 13, cursor: "pointer", fontWeight: 800, fontSize: 14.5, fontFamily: "inherit", boxShadow: `0 6px 18px ${A}55` }}>＋ Add Staff Member</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          ["Total Active", stats.total, INK, "👥"],
          ["Doctors", stats.doctors, "#1E40AF", "🩺"],
          ["Specialists", stats.specialists, "#5B21B6", "🧑‍⚕️"],
          ["Nurses", stats.nurses, "#0E7C7B", "💊"],
          ["Receptionists", stats.receptionists, "#6B21A8", "📞"],
        ].map(([l, v, c, i]: any) => (
          <div key={l} style={{ background: "#fff", borderRadius: 18, padding: "16px 20px", boxShadow: SHADOW, position: "relative" as const, overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c},${c}55)` }} />
            <div style={{ fontSize: 12, fontWeight: 800, color: MUTE, letterSpacing: .5 }}>{i} {String(l).toUpperCase()}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: c, marginTop: 6 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 20, padding: 0, boxShadow: SHADOW, overflow: "hidden" }}>
        {loading && <div style={{ padding: 40, textAlign: "center" as const, color: MUTE, fontWeight: 700 }}>Loading…</div>}
        {!loading && staff.length === 0 && <div style={{ padding: 40, textAlign: "center" as const, color: MUTE }}>No staff members yet. Click "Add Staff Member" to begin.</div>}
        {!loading && staff.map(s => {
          const rc = ROLE_COLORS[s.role] || ROLE_COLORS.nurse;
          const isMe = s.id === currentStaff?.staff_id;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 22px", borderBottom: `1px solid ${SOFT}`, opacity: s.is_active ? 1 : .55, flexWrap: "wrap" as const }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg,${rc.color}33,${rc.color}11)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: rc.color, flexShrink: 0 }}>
                {sanitizeText(s.name || "").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                  <b style={{ fontSize: 17, color: INK }}>{sanitizeText(s.name || "")}</b>
                  <span style={{ background: rc.bg, color: rc.color, padding: "3px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 800 }}>{rc.icon} {s.role.toUpperCase()}</span>
                  {isMe && <span style={{ background: "#FEF3C7", color: "#92400E", padding: "3px 11px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>YOU</span>}
                  {!s.is_active && <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "3px 11px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>DEACTIVATED</span>}
                </div>
                <div style={{ fontSize: 13, color: MUTE, marginTop: 4 }}>
                  📱 {sanitizeText(s.phone || "")}{s.email ? ` · ✉ ${sanitizeText(s.email)}` : ""}{s.clinic_name ? ` · 🏥 ${sanitizeText(s.clinic_name)}` : ""}
                </div>
                <div style={{ fontSize: 11.5, color: MUTE, marginTop: 2 }}>
                  {s.last_login_at ? `Last login: ${new Date(s.last_login_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Never logged in"}
                </div>
              </div>
              {s.is_active && <div style={{ display: "flex", gap: 6 }}>
                <button title="Edit" onClick={() => setEditing(s)} style={iconBtn("#3B82F6")}>✏️</button>
                <button title="Reset PIN" onClick={() => setPinReset(s)} style={iconBtn("#F59E0B")}>🔑</button>
                {!isMe && <button title="Deactivate" onClick={async () => {
                  if (!confirm(`Deactivate ${sanitizeText(s.name)}? They will no longer be able to log in.`)) return;
                  try { await api.adminDeactivateStaff(s.id); show(`✓ ${sanitizeText(s.name)} deactivated`); load(); }
                  catch (e: any) { show("Error: " + e.message); }
                }} style={iconBtn("#EF4444")}>🚫</button>}
              </div>}
              {!s.is_active && <button onClick={async () => {
                try { await api.adminUpdateStaff(s.id, { is_active: true }); show(`✓ ${sanitizeText(s.name)} reactivated`); load(); }
                catch (e: any) { show("Error: " + e.message); }
              }} style={{ background: "#10B981", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 11, fontWeight: 800, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>↻ Reactivate</button>}
            </div>
          );
        })}
      </div>

      {(adding || editing) && <StaffFormModal A={A} show={show} clinics={clinics}
        editing={editing} onClose={() => { setAdding(false); setEditing(null); }} onSaved={() => { setAdding(false); setEditing(null); load(); }} />}
      {pinReset && <PinResetModal A={A} show={show} staff={pinReset} onClose={() => setPinReset(null)} />}
    </div>
  );
}

function StaffFormModal({ A, show, clinics, editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name || "", phone: editing?.phone || "", email: editing?.email || "",
    role: editing?.role || "nurse", clinic_id: editing?.clinic_id || (clinics[0]?.id || ""),
    pin: "0000", telegram_chat_id: editing?.telegram_chat_id || "",
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!editing;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim()) { show("Name and phone required"); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.adminUpdateStaff(editing.id, {
          name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || null,
          role: form.role, clinic_id: form.clinic_id || null,
          telegram_chat_id: form.telegram_chat_id.trim() || null,
        });
        show(`✓ ${sanitizeText(form.name)} updated`);
      } else {
        const r = await api.adminCreateStaff({ ...form, clinic_id: form.clinic_id || null });
        show(`✓ ${sanitizeText(form.name)} added · default PIN: ${r.default_pin || form.pin}`);
      }
      onSaved();
    } catch (e: any) { show("Error: " + e.message); } finally { setSaving(false); }
  };

  return (
    <div style={mBg} onClick={onClose}>
      <div className="animate-slide" style={{ ...mBox, width: 520 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 900, color: INK }}>{isEdit ? "✏️ Edit" : "＋ Add"} Staff Member</h3>
        <label style={lbl}>Full Name *</label>
        <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" style={inp} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={lbl}>Mobile *</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" style={inp} /></div>
          <div><label style={lbl}>Email</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@clinic.com" style={inp} /></div>
        </div>
        <label style={lbl}>Role *</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
          {["admin", "doctor", "specialist", "nurse", "receptionist"].map(r => {
            const rc = ROLE_COLORS[r];
            return (
              <button key={r} onClick={() => setForm({ ...form, role: r })}
                style={{ border: form.role === r ? `2px solid ${rc.color}` : `1.5px solid ${LINE}`,
                  background: form.role === r ? rc.bg : "#fff",
                  color: form.role === r ? rc.color : MUTE,
                  borderRadius: 12, padding: "10px 6px", cursor: "pointer", fontFamily: "inherit",
                  fontWeight: 800, fontSize: 12.5, textTransform: "capitalize" as const, transition: "all .12s" }}>
                {rc.icon}<br/>{r}
              </button>
            );
          })}
        </div>
        {clinics?.length > 1 && <>
          <label style={lbl}>Clinic Assignment</label>
          <select value={form.clinic_id} onChange={e => setForm({ ...form, clinic_id: e.target.value })} style={inp}>
            <option value="">— All clinics —</option>
            {clinics.map((c: any) => <option key={c.id} value={c.id}>{sanitizeText(c.name)}</option>)}
          </select>
        </>}
        {!isEdit && <>
          <label style={lbl}>Default PIN (4 digits)</label>
          <input value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
            placeholder="0000" style={{ ...inp, fontSize: 22, fontWeight: 900, textAlign: "center" as const, letterSpacing: 8 }} />
          <p style={{ fontSize: 12, color: MUTE, marginTop: 4 }}>Staff member can change this after first login.</p>
        </>}
        <label style={lbl}>Telegram Chat ID (optional)</label>
        <input value={form.telegram_chat_id} onChange={e => setForm({ ...form, telegram_chat_id: e.target.value })}
          placeholder="For Telegram bot notifications" style={inp} />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, border: `2px solid ${LINE}`, borderRadius: 13, background: "#fff", color: "#475569", fontWeight: 800, fontSize: 14.5, fontFamily: "inherit", cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} disabled={saving}
            style={{ flex: 2, padding: 14, border: "none", borderRadius: 13, background: `linear-gradient(135deg,${A},${A}DD)`, color: "#fff", fontWeight: 800, fontSize: 14.5, fontFamily: "inherit", cursor: "pointer", boxShadow: `0 6px 18px ${A}44` }}>
            {saving ? "Saving…" : isEdit ? "✓ Save Changes" : "＋ Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PinResetModal({ A, show, staff, onClose }: any) {
  const [pin, setPin] = useState(""); const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (pin.length < 4) { show("PIN must be at least 4 digits"); return; }
    setSaving(true);
    try { await api.adminResetPin(staff.id, pin); show(`✓ PIN reset for ${sanitizeText(staff.name)}`); onClose(); }
    catch (e: any) { show("Error: " + e.message); } finally { setSaving(false); }
  };
  return (
    <div style={mBg} onClick={onClose}>
      <div className="animate-slide" style={{ ...mBox, width: 400 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: INK }}>🔑 Reset PIN — {sanitizeText(staff.name)}</h3>
        <p style={{ fontSize: 13.5, color: MUTE, margin: "0 0 16px" }}>The staff member will use this new PIN to log in.</p>
        <input autoFocus type="text" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="0000"
          style={{ ...inp, fontSize: 28, fontWeight: 900, textAlign: "center" as const, letterSpacing: 10, borderColor: A, borderWidth: 2 }} />
        <button onClick={submit} disabled={saving} style={{ width: "100%", marginTop: 18, padding: 15, border: "none", borderRadius: 13, background: `linear-gradient(135deg,${A},${A}DD)`, color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "inherit", cursor: "pointer", boxShadow: `0 6px 18px ${A}55` }}>
          {saving ? "Resetting…" : `✓ Reset PIN to ${pin || "____"}`}
        </button>
      </div>
    </div>
  );
}

const iconBtn = (c: string): any => ({ width: 40, height: 40, borderRadius: 11, border: "none", background: c + "1A", color: c, cursor: "pointer", fontSize: 17, fontFamily: "inherit", fontWeight: 800, transition: "background .12s" });
const lbl: any = { display: "block", fontSize: 12, fontWeight: 800, marginTop: 14, marginBottom: 7, color: "#475569", textTransform: "uppercase" as const, letterSpacing: .5 };
const inp: any = { width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "13px 16px", fontSize: 15, boxSizing: "border-box" as const, outline: "none", fontFamily: "inherit", background: "#fff" };
const mBg: any = { position: "fixed" as const, inset: 0, background: "rgba(15,23,42,.55)", backdropFilter: "blur(3px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const mBox: any = { background: "#fff", borderRadius: 22, padding: 28, maxWidth: "95vw", maxHeight: "92vh", overflow: "auto", boxShadow: SHADOW_LG };
