/**
 * SettingsModuleVisibility — Bundle X
 *
 * Doctor/Admin controls which sidebar modules are visible to each role.
 * Matrix grid: modules × roles with toggle switches.
 * Saves via POST /api/module-visibility/bulk.
 */
import React, { useEffect, useState } from "react";
import * as api from "@/lib/api";

const TEAL = "#0E7C7B";
const TEAL_DEEP = "#0A5C5B";
const LINE = "#E2E8F0";
const INK = "#1F2937";
const MUTE = "#64748B";
const SOFT = "#F8FAFC";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "🏠 Dashboard", appointments: "📅 Appointments", patients: "👥 Patients",
  queue: "🩺 Queue", kanban: "🗂 Kanban", billing: "💰 Billing",
  medicines: "💊 Medicines", procedures: "🦷 Procedures", lab: "🧪 Lab",
  counters: "📊 Counters", specialists: "👨‍⚕️ Specialists", staff: "🧑‍💼 User Control",
  website: "🌐 Website", consult: "📞 Phone Consult",
  messages: "💬 Messages", bulkwa: "📲 Bulk WhatsApp", settings: "⚙️ Settings",
};

const BTN_LABELS: Record<string, string> = {
  btn_book_apt:        "📅 Book / Walk-in appointment",
  btn_send_queue:      "🩺 Send patient to doctor queue",
  btn_cancel_apt:      "✕ Cancel appointment",
  btn_collect_payment: "💵 Collect payment",
  btn_edit_reschedule: "✏️ Edit / Reschedule appointment",
  btn_call_confirm:    "📞 Call & Confirm patient",
  btn_bulk_wa:         "📲 Send bulk WhatsApp",
  btn_assign_lab:      "🧪 Assign lab order",
  btn_assign_spec:     "👨‍⚕️ Assign specialist",
  btn_close_visit:     "✓ Close specialist visit (doctor only)",
};
const BTN_KEYS = Object.keys(BTN_LABELS);

const ROLES = ["doctor", "admin", "receptionist", "specialist"];
const ROLE_LABELS: Record<string, string> = {
  doctor: "👨‍⚕️ Doctor", admin: "🔑 Admin", receptionist: "💁 Receptionist/Nurse", specialist: "🩺 Specialist",
};
const MODULES = Object.keys(MODULE_LABELS);

export default function SettingsModuleVisibility({ clinicId }: { clinicId?: string }) {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const res = await api.getModuleVisibility(clinicId);
      setMatrix(res?.matrix || {});
    } catch { setMatrix({}); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [clinicId]); // eslint-disable-line

  const toggle = (role: string, mod: string) => {
    setMatrix(prev => {
      const next = { ...prev };
      if (!next[role]) next[role] = {};
      next[role] = { ...next[role], [mod]: !next[role][mod] };
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      const entries: { module_key: string; role: string; is_visible: boolean }[] = [];
      for (const role of ROLES) {
        for (const mod of MODULES) {
          entries.push({
            module_key: mod,
            role,
            is_visible: matrix[role]?.[mod] !== false,
          });
        }
      }
      await api.updateModuleVisibility(clinicId, entries);
      setDirty(false);
    } catch (e: any) { alert(`Save failed: ${e?.message || e}`); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: MUTE }}>Loading visibility matrix…</div>;

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: INK }}>Module Visibility</div>
          <div style={{ fontSize: 13, color: MUTE, marginTop: 2 }}>
            Control which sidebar modules each role can see. Changes apply on next login.
          </div>
        </div>
        {dirty && (
          <button onClick={save} disabled={saving} style={{
            background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
            color: "#fff", border: "none", borderRadius: 12,
            padding: "11px 20px", fontWeight: 800, fontSize: 14, cursor: saving ? "wait" : "pointer",
            boxShadow: `0 4px 12px ${TEAL}44`,
          }}>{saving ? "Saving…" : "💾 Save Changes"}</button>
        )}
      </div>

      <div style={{ overflowX: "auto", borderRadius: 14, border: `1.5px solid ${LINE}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: SOFT }}>
              <th style={{ padding: 12, textAlign: "left", fontWeight: 800, color: MUTE, borderBottom: `1.5px solid ${LINE}`, minWidth: 180 }}>Module</th>
              {ROLES.map(r => (
                <th key={r} style={{ padding: 12, textAlign: "center", fontWeight: 800, color: MUTE, borderBottom: `1.5px solid ${LINE}`, minWidth: 110 }}>
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((mod, i) => (
              <tr key={mod} style={{ background: i % 2 === 0 ? "#fff" : SOFT }}>
                <td style={{ padding: "10px 12px", fontWeight: 700, color: INK, borderBottom: `1px solid ${LINE}` }}>
                  {MODULE_LABELS[mod]}
                </td>
                {ROLES.map(role => {
                  const visible = matrix[role]?.[mod] !== false;
                  return (
                    <td key={role} style={{ padding: "10px 12px", textAlign: "center", borderBottom: `1px solid ${LINE}` }}>
                      <button
                        onClick={() => toggle(role, mod)}
                        style={{
                          width: 44, height: 26, borderRadius: 13,
                          border: "none", cursor: "pointer",
                          background: visible ? TEAL : "#CBD5E1",
                          position: "relative", transition: "background .2s",
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: 10,
                          background: "#fff", position: "absolute", top: 3,
                          left: visible ? 21 : 3, transition: "left .2s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: MUTE, marginTop: 12, lineHeight: 1.5 }}>
        <b>Note:</b> "Settings" should remain visible to Doctor and Admin.
        Specialist role sees only their own queue by default.
        Changes take effect on the user's next page load.
      </div>

      {/* Button-level controls */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 4 }}>Button Controls</div>
        <div style={{ fontSize: 13, color: MUTE, marginBottom: 16 }}>
          Control which action buttons are available to each role inside the app.
        </div>
        <div style={{ overflowX: "auto", borderRadius: 14, border: `1.5px solid ${LINE}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: SOFT }}>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 800, color: MUTE, borderBottom: `1.5px solid ${LINE}`, minWidth: 220 }}>Action / Button</th>
                {ROLES.map(r => (
                  <th key={r} style={{ padding: 12, textAlign: "center", fontWeight: 800, color: MUTE, borderBottom: `1.5px solid ${LINE}`, minWidth: 110 }}>
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BTN_KEYS.map((btn, i) => (
                <tr key={btn} style={{ background: i % 2 === 0 ? "#fff" : SOFT }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: INK, borderBottom: `1px solid ${LINE}` }}>
                    {BTN_LABELS[btn]}
                  </td>
                  {ROLES.map(role => {
                    const visible = matrix[role]?.[btn] !== false;
                    return (
                      <td key={role} style={{ padding: "10px 12px", textAlign: "center", borderBottom: `1px solid ${LINE}` }}>
                        <button
                          onClick={() => toggle(role, btn)}
                          style={{
                            width: 44, height: 26, borderRadius: 13,
                            border: "none", cursor: "pointer",
                            background: visible ? TEAL : "#CBD5E1",
                            position: "relative", transition: "background .2s",
                          }}
                        >
                          <div style={{
                            width: 20, height: 20, borderRadius: 10,
                            background: "#fff", position: "absolute", top: 3,
                            left: visible ? 21 : 3, transition: "left .2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 12, color: MUTE, marginTop: 10 }}>
          Button controls are enforced by the frontend. "Doctor" should retain all controls.
        </div>
      </div>
    </div>
  );
}
