"use client";
// ────────────────────────────────────────────────────────────────
// /m — phone-first shell for nurse & doctor (also the APK entry).
// Deliberately minimal: Appointments · Lab · Patients (history).
// Big tap targets, one-thumb reach, quick actions only — full
// clinical work stays on the desktop workspace.
// ────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B", INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const dmy = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";

const btn = (c: string, solid = true): React.CSSProperties => ({
  border: solid ? "none" : `2px solid ${c}`, background: solid ? c : "#fff",
  color: solid ? "#fff" : c, borderRadius: 12, padding: "12px 16px",
  fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
});
const cardS: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: 14, boxShadow: "0 1px 6px rgba(15,23,42,.08)" };

function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 86, left: "50%", transform: "translateX(-50%)", background: INK, color: "#fff", borderRadius: 12, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, zIndex: 500, maxWidth: "90vw", boxShadow: "0 8px 24px rgba(0,0,0,.35)" }}>
      {msg}
    </div>
  );
}

// ── Login (PIN) ──
function MobileLogin({ onDone }: { onDone: () => void }) {
  const [clinics, setClinics] = useState<any[]>([]);
  const [clinicId, setClinicId] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.getClinics().then((c: any) => {
      const list = Array.isArray(c) ? c : c?.clinics || [];
      setClinics(list);
      if (list[0]) setClinicId(list[0].id);
    }).catch(() => setErr("Cannot reach the clinic server"));
  }, []);
  const go = async () => {
    setErr(""); setBusy(true);
    try { await api.login(phone.trim(), pin.trim(), clinicId); onDone(); }
    catch (e: any) { setErr(e.message || "Login failed"); }
    finally { setBusy(false); }
  };
  const inputS: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: `2px solid ${LINE}`, borderRadius: 14, padding: "15px 16px", fontSize: 17, outline: "none", fontFamily: "inherit", marginBottom: 12 };
  return (
    <div style={{ minHeight: "100dvh", background: `linear-gradient(160deg, ${A}, #0A5453)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 26, width: 380, maxWidth: "100%" }}>
        <div style={{ fontSize: 40, textAlign: "center" }}>🦷</div>
        <div style={{ fontWeight: 900, fontSize: 20, textAlign: "center", marginBottom: 4 }}>Clinic Mobile</div>
        <div style={{ fontSize: 13, color: MUTE, textAlign: "center", marginBottom: 20 }}>Appointments · Lab · Patients</div>
        {clinics.length > 1 && (
          <select value={clinicId} onChange={e => setClinicId(e.target.value)} style={inputS}>
            {clinics.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <input style={inputS} placeholder="Phone number" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} />
        <input style={inputS} placeholder="PIN" type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} />
        {err && <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 10, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>⚠ {err}</div>}
        <button disabled={busy || !phone || !pin} onClick={go} style={{ ...btn(A), width: "100%", padding: 15, fontSize: 16, opacity: busy ? .7 : 1 }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

// ── Appointments (today + pending approvals) ──
function ApptScreen({ clinicId, show }: { clinicId: string; show: (m: string) => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [busyId, setBusyId] = useState("");
  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const r = await api.hubAppointmentsRange(clinicId, today, today);
      setRows(r?.appointments || r || []);
    } catch { /* offline */ }
    try {
      const p = await api.getPendingAppointments(clinicId);
      setPending(Array.isArray(p) ? p : p?.appointments || []);
    } catch {}
  }, [clinicId]);
  useEffect(() => { load(); }, [load]);

  const mark = async (id: string, status: string) => {
    setBusyId(id);
    try { await api.hubMarkStatus(id, status); show(`✓ Marked ${status.replace("_", " ")}`); load(); }
    catch (e: any) { show("Error: " + e.message); }
    finally { setBusyId(""); }
  };
  const confirm = async (id: string) => {
    setBusyId(id);
    try { await api.confirmAppointment(id, {}); show("✓ Confirmed"); load(); }
    catch (e: any) { show("Error: " + e.message); }
    finally { setBusyId(""); }
  };

  const STATUS_COLOR: Record<string, string> = { confirmed: "#2563EB", arrived: "#D97706", in_chair: "#7C3AED", completed: "#059669", pending: "#64748B" };
  const active = rows.filter((r: any) => !["cancelled", "rejected", "no_show"].includes(r.status));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {pending.length > 0 && (
        <div style={{ ...cardS, border: "2px solid #FCD34D", background: "#FFFBEB" }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: "#92400E", marginBottom: 8 }}>⏳ {pending.length} awaiting approval</div>
          {pending.slice(0, 5).map((p: any) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: `1px dashed ${LINE}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{p.patient_name}</div>
                <div style={{ fontSize: 12, color: MUTE }}>{dmy(p.requested_date)} {String(p.requested_time || "").slice(0, 5)}</div>
              </div>
              <button disabled={busyId === p.id} onClick={() => confirm(p.id)} style={{ ...btn("#059669"), padding: "9px 14px", fontSize: 13 }}>✓ Confirm</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontWeight: 900, fontSize: 15, color: INK, padding: "4px 2px" }}>Today ({active.length})</div>
      {active.length === 0 && <div style={{ ...cardS, color: MUTE, fontSize: 14, textAlign: "center", padding: 28 }}>No appointments today</div>}
      {active.map((r: any) => {
        const next = r.status === "confirmed" ? ["arrived", "Mark Arrived", "#D97706"]
          : r.status === "arrived" ? ["in_chair", "In Chair", "#7C3AED"]
          : r.status === "in_chair" ? ["completed", "Complete", "#059669"] : null;
        return (
          <div key={r.id} style={cardS}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{r.patient_name}</div>
                <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>
                  {String(r.scheduled_time || r.confirmed_time || r.requested_time || "").slice(0, 5)} · {(r.chief_complaints || []).map((c: any) => typeof c === "string" ? c : c.text).join(", ") || r.appointment_type || "Visit"}
                </div>
              </div>
              <span style={{ background: (STATUS_COLOR[r.status] || MUTE) + "1A", color: STATUS_COLOR[r.status] || MUTE, borderRadius: 999, padding: "5px 11px", fontSize: 11.5, fontWeight: 800, textTransform: "capitalize" }}>
                {(r.status || "").replace("_", " ")}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {r.patient_phone && (
                <a href={`tel:${r.patient_phone}`} style={{ ...btn(A, false), padding: "10px 14px", fontSize: 13, textDecoration: "none", textAlign: "center" }}>📞 Call</a>
              )}
              {next && (
                <button disabled={busyId === r.id} onClick={() => mark(r.id, next[0] as string)} style={{ ...btn(next[2] as string), flex: 1, fontSize: 13 }}>
                  {busyId === r.id ? "…" : next[1]}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Lab (open orders + receive/approve) ──
function LabScreen({ clinicId, show }: { clinicId: string; show: (m: string) => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [busyId, setBusyId] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await api.labListOrders({ clinicId, status: "pending,sent,received", limit: 100 });
      setOrders(r?.orders || r || []);
    } catch {}
  }, [clinicId]);
  useEffect(() => { load(); }, [load]);

  const receive = async (id: string) => {
    setBusyId(id);
    try { await api.labReceiveOrder(id); show("✓ Marked received"); load(); }
    catch (e: any) { show("Error: " + e.message); }
    finally { setBusyId(""); }
  };
  const approve = async (id: string) => {
    setBusyId(id);
    try { await api.labApproveOrder(id); show("✓ Approved — payable to vendor"); load(); }
    catch (e: any) { show("Error: " + e.message); }
    finally { setBusyId(""); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontWeight: 900, fontSize: 15, color: INK, padding: "4px 2px" }}>Open lab work ({orders.length})</div>
      {orders.length === 0 && <div style={{ ...cardS, color: MUTE, fontSize: 14, textAlign: "center", padding: 28 }}>No open lab orders 🎉</div>}
      {orders.map((o: any) => {
        const overdue = o.status === "sent" && o.expected_date && new Date(o.expected_date) < new Date();
        return (
          <div key={o.id} style={{ ...cardS, border: overdue ? "2px solid #FCA5A5" : undefined }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 15 }}>{o.work_type || "Lab work"} {o.teeth?.length ? `· #${o.teeth.join(",")}` : ""}</div>
                <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>{o.patient_name} · {o.vendor_name || "no vendor"}</div>
                <div style={{ fontSize: 12, color: overdue ? "#DC2626" : MUTE, fontWeight: overdue ? 800 : 500, marginTop: 2 }}>
                  {overdue ? "⚠ OVERDUE" : o.status === "sent" ? "at lab" : o.status === "received" ? "received" : "to send"}
                  {o.expected_date ? ` · due ${dmy(o.expected_date)}` : ""}{o.cost ? ` · ${fmt(o.cost)}` : ""}
                </div>
              </div>
              {o.vendor_whatsapp && (
                <a href={`https://wa.me/${String(o.vendor_whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, status of ${o.work_type} for ${o.patient_name}? Due ${o.expected_date || ""}`)}`}
                  target="_blank" rel="noreferrer" style={{ fontSize: 22, textDecoration: "none" }}>💬</a>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {o.status === "sent" && (
                <button disabled={busyId === o.id} onClick={() => receive(o.id)} style={{ ...btn("#2563EB"), flex: 1, fontSize: 13 }}>
                  {busyId === o.id ? "…" : "📦 Mark Received"}
                </button>
              )}
              {o.status === "received" && (
                <button disabled={busyId === o.id} onClick={() => approve(o.id)} style={{ ...btn("#D97706"), flex: 1, fontSize: 13 }}>
                  {busyId === o.id ? "…" : `✓ Approve${o.cost ? ` (${fmt(o.cost)})` : ""}`}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Patients: search → history (visits, treatments, dues) ──
function PatientScreen({ show }: { show: (m: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      api.searchPatients(q.trim()).then((r: any) => setResults(Array.isArray(r) ? r : r?.patients || [])).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!sel) { setDetail(null); return; }
    Promise.all([
      api.pdbFull(sel.id).catch(() => null),
      api.pdbVisits(sel.id, 15).catch(() => null),
    ]).then(([full, visits]) => setDetail({ full, visits: visits?.visits || visits || [] }));
  }, [sel]);

  const inputS: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: `2px solid ${LINE}`, borderRadius: 14, padding: "14px 16px", fontSize: 16, outline: "none", fontFamily: "inherit" };

  if (sel) {
    const p = detail?.full?.patient || sel;
    const fin = detail?.full?.financial || {};
    const alerts: string[] = detail?.full?.health_alerts || p.health_alerts || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => setSel(null)} style={{ ...btn(MUTE, false), alignSelf: "flex-start", padding: "8px 14px", fontSize: 13 }}>← Search</button>
        <div style={cardS}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{p.name}</div>
          <div style={{ fontSize: 13, color: MUTE, marginTop: 2 }}>{p.phone} {p.age ? `· ${p.age}y` : ""} {p.gender ? `· ${p.gender}` : ""}</div>
          {alerts.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
              {alerts.map((a: string, i: number) => (
                <span key={i} style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 999, padding: "4px 10px", fontSize: 11.5, fontWeight: 800 }}>⚠ {a}</span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {p.phone && <a href={`tel:${p.phone}`} style={{ ...btn(A), flex: 1, fontSize: 13, textDecoration: "none", textAlign: "center" }}>📞 Call</a>}
            {p.phone && (
              <a href={`https://wa.me/${String(p.phone).replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noreferrer"
                style={{ ...btn("#25D366"), flex: 1, fontSize: 13, textDecoration: "none", textAlign: "center" }}>💬 WhatsApp</a>
            )}
          </div>
        </div>

        {(fin.outstanding || 0) > 0 && (
          <div style={{ ...cardS, background: "#FFFBEB", border: "2px solid #FCD34D" }}>
            <span style={{ fontWeight: 900, color: "#92400E", fontSize: 15 }}>Outstanding: {fmt(fin.outstanding)}</span>
            <span style={{ fontSize: 12.5, color: "#78350F" }}> · collect at desk</span>
          </div>
        )}

        <div style={{ fontWeight: 900, fontSize: 15, color: INK, padding: "4px 2px" }}>Visit history</div>
        {!detail && <div style={{ ...cardS, color: MUTE, textAlign: "center" }}>Loading…</div>}
        {detail && detail.visits.length === 0 && <div style={{ ...cardS, color: MUTE, fontSize: 14, textAlign: "center" }}>No recorded visits</div>}
        {detail && detail.visits.map((v: any, i: number) => (
          <div key={v.id || i} style={cardS}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{dmy(v.date || v.visit_date || v.created_at)}</div>
            {(v.complaint || v.chief_complaint) && <div style={{ fontSize: 13, marginTop: 3 }}><b>C/O:</b> {v.complaint || v.chief_complaint}</div>}
            {(v.treatment_done || v.treatments) && <div style={{ fontSize: 13, marginTop: 3 }}><b>Done:</b> {v.treatment_done || (Array.isArray(v.treatments) ? v.treatments.join(", ") : v.treatments)}</div>}
            {v.notes && <div style={{ fontSize: 12.5, color: MUTE, marginTop: 3 }}>{v.notes}</div>}
            {(v.paid || v.amount_paid) > 0 && <div style={{ fontSize: 12.5, color: "#059669", fontWeight: 700, marginTop: 3 }}>Paid {fmt(v.paid || v.amount_paid)}</div>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input style={inputS} placeholder="🔍 Search name or phone…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
      {results.map((p: any) => (
        <button key={p.id} onClick={() => setSel(p)} style={{ ...cardS, textAlign: "left", border: "none", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: INK }}>{p.name}</div>
          <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>{p.phone} {p.age ? `· ${p.age}y` : ""}</div>
        </button>
      ))}
      {q.trim().length >= 2 && results.length === 0 && (
        <div style={{ ...cardS, color: MUTE, fontSize: 14, textAlign: "center" }}>No patients found</div>
      )}
      {q.trim().length < 2 && (
        <div style={{ ...cardS, color: MUTE, fontSize: 13.5, textAlign: "center", padding: 28 }}>
          Type at least 2 letters of a name or phone number.<br />Full records open on the clinic desktop.
        </div>
      )}
    </div>
  );
}

// ── Shell ──
export default function MobileApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"appt" | "lab" | "patients">("appt");
  const [toast, setToast] = useState("");
  const staff = api.getStaffInfo();
  const show = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  useEffect(() => { setAuthed(!!api.getToken()); }, []);
  if (authed === null) return null;
  if (!authed) return <MobileLogin onDone={() => setAuthed(true)} />;

  const clinicId = staff?.clinic_id || "";
  const TABS: [typeof tab, string, string][] = [["appt", "📅", "Appointments"], ["lab", "🧪", "Lab"], ["patients", "👤", "Patients"]];

  return (
    <div style={{ minHeight: "100dvh", background: SOFT, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: A, color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🦷</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>{staff?.clinic_name || "Clinic"}</div>
          <div style={{ fontSize: 11.5, opacity: .85 }}>{staff?.name} · {staff?.role}</div>
        </div>
        <button onClick={() => { localStorage.clear(); setAuthed(false); }}
          style={{ border: "1.5px solid rgba(255,255,255,.4)", background: "transparent", color: "#fff", borderRadius: 10, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Sign out
        </button>
      </div>

      <div style={{ padding: "14px 14px 96px", maxWidth: 560, margin: "0 auto" }}>
        {tab === "appt" && <ApptScreen clinicId={clinicId} show={show} />}
        {tab === "lab" && <LabScreen clinicId={clinicId} show={show} />}
        {tab === "patients" && <PatientScreen show={show} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1.5px solid ${LINE}`, display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {TABS.map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, border: "none", background: "transparent", padding: "10px 0 12px", cursor: "pointer", fontFamily: "inherit", color: tab === id ? A : MUTE }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, marginTop: 2 }}>{label}</div>
          </button>
        ))}
      </div>

      <Toast msg={toast} />
    </div>
  );
}
