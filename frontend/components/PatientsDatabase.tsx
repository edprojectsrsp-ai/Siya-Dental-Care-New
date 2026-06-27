"use client";
/**
 * components/PatientsDatabase.tsx — Sprint P1
 *
 * Standalone Patient Database module.
 * Doctor opens this from the sidebar ("Patients") and can:
 *   • search by name / phone
 *   • sort by recent visit, name, total visits, outstanding balance, alerts
 *   • filter to: has alerts · has active plans · has outstanding
 *   • drill into a patient and see all tabs:
 *       Overview · Workspace · Plans · Rx · Visits · Payments · Lab · Media · Timeline
 *
 * Quick actions per patient: Book · Open in Workspace · Call · WhatsApp.
 *
 * Inline styles, no external UI library, matches existing app aesthetic.
 *
 * Dependencies (must exist):
 *   - lib/api.ts pdb* helpers (api_patient_db.ts patch)
 *   - components/MedicalConditionsPicker
 *   - components/PatientWorkspaceView (in this sprint)
 *   - components/PatientToothChartReadOnly (in this sprint)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import * as api from "@/lib/api";
import ArchivedPatients from "@/components/ArchivedPatients";
import MediaGallery from "@/components/MediaGallery";
import PortalLinkGenerator from "@/components/PortalLinkGenerator";
import SmileStudio from "@/components/SmileStudio";
import QRCodeWidget from "@/components/QRCodeWidget";
import { MedicalConditionsPicker } from "@/components/MedicalConditionsPicker";
import { PatientWorkspaceView } from "@/components/PatientWorkspaceView";

// ─────────────────────────── Helpers ───────────────────────────
const fmtINR = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (s?: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const A = "#0E7C7B";    // teal accent (matches ClinicHub)
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";

const SEV: any = {
  critical: { bg: "#FEE2E2", text: "#991B1B", border: "#DC2626" },
  high:     { bg: "#FED7AA", text: "#9A3412", border: "#EA580C" },
  medium:   { bg: "#FEF3C7", text: "#92400E", border: "#D97706" },
};

const TABS = [
  { id: "overview",   label: "Overview",  icon: "📋" },
  { id: "workspace",  label: "Workspace", icon: "🦷" },
  { id: "plans",      label: "Plans",     icon: "📑" },
  { id: "rx",         label: "Rx",        icon: "💊" },
  { id: "visits",     label: "Visits",    icon: "🩺" },
  { id: "payments",   label: "Payments",  icon: "💰" },
  { id: "lab",        label: "Lab",       icon: "🧪" },
  { id: "media",      label: "Media",     icon: "📸" },
  { id: "timeline",   label: "Timeline",  icon: "⏱" },
] as const;

type SortKey = "recent" | "name" | "visits" | "outstanding" | "alerts";
type ModuleTab = "active" | "archived";

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function PatientsDatabase({
  staff,
  show,
  accent = A,
  onOpenWorkspace,
  onBookAppointment,
}: {
  staff: any;
  show: (msg: string) => void;
  accent?: string;
  onOpenWorkspace?: (patient: any) => void;
  onBookAppointment?: (patient: any) => void;
}) {
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [fAlerts, setFAlerts] = useState(false);
  const [fPlans, setFPlans] = useState(false);
  const [fDue, setFDue] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState<string>("overview");
  const [editMode, setEditMode] = useState(false);
  const [moduleTab, setModuleTab] = useState<ModuleTab>("active");

  const clinicId = staff?.clinic_id;

  // ── Loaders ────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.pdbList({
        clinic_id: clinicId,
        q: query.trim() || undefined,
        sort,
        filter_alerts: fAlerts || undefined,
        filter_active_plans: fPlans || undefined,
        filter_outstanding: fDue || undefined,
        limit: 100,
      });
      setList(d.patients || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      show("Error loading patients: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [clinicId, query, sort, fAlerts, fPlans, fDue, show]);

  const loadDetail = useCallback(async (pid: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await api.pdbFull(pid));
    } catch (e: any) {
      show("Error loading patient: " + e.message);
    } finally {
      setDetailLoading(false);
    }
  }, [show]);

  // ── Effects ────────────────────────────────────────────────────
  useEffect(() => { loadList(); }, [sort, fAlerts, fPlans, fDue, clinicId]); // eslint-disable-line
  useEffect(() => {
    const t = setTimeout(() => loadList(), 280);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line

  useEffect(() => { if (selectedId) loadDetail(selectedId); else setDetail(null); }, [selectedId, loadDetail]);

  // ── Auto-select first on initial load if nothing chosen ────────
  useEffect(() => {
    if (!selectedId && list.length > 0) setSelectedId(list[0].id);
  }, [list]); // eslint-disable-line

  // ── Actions ────────────────────────────────────────────────────
  const callPatient = (phone: string) => phone && window.open(`tel:${phone}`);
  const whatsAppPatient = (phone: string, name: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    const wa = clean.length === 10 ? "91" + clean : clean;
    const msg = encodeURIComponent(`Hi ${name}, this is ${staff?.clinic_name || "your dental clinic"}. How can we help?`);
    window.open(`https://wa.me/${wa}?text=${msg}`, "_blank");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>👥 Patient Database</h1>
        <span style={{ fontSize: 13, color: MUTE }}>
          {moduleTab === "active" ? `${total.toLocaleString("en-IN")} patients on file` : "Archived treatment records"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setModuleTab("active")} style={pill(moduleTab === "active", accent)}>Active Patients</button>
        <button onClick={() => setModuleTab("archived")} style={pill(moduleTab === "archived", accent)}>Archived Patients</button>
      </div>

      {moduleTab === "archived" ? (
        <div style={{ background: "#fff", borderRadius: 18, padding: 22, boxShadow: "0 2px 10px #0f172a08" }}>
          <ArchivedPatients
            clinicId={clinicId}
            accent={accent}
            show={show}
            onReopened={(patient) => {
              setModuleTab("active");
              setSelectedId(patient.id);
              setTab("overview");
              setEditMode(false);
              loadList();
            }}
          />
        </div>
      ) : (
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 16, alignItems: "stretch", minHeight: "calc(100vh - 220px)" }}>
        {/* ═══ LEFT — Directory ═══ */}
        <div style={{ background: "#fff", borderRadius: 18, padding: 14, boxShadow: "0 2px 10px #0f172a08", display: "flex", flexDirection: "column" }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="🔍  Search name or phone…"
            style={{
              width: "100%", border: `2px solid ${LINE}`, borderRadius: 12, padding: "11px 14px",
              fontSize: 14, outline: "none", marginBottom: 10, boxSizing: "border-box", fontFamily: "inherit",
            }}
          />

          {/* Sort + filters */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
            {(["recent", "name", "visits", "outstanding", "alerts"] as SortKey[]).map(s => (
              <button key={s} onClick={() => setSort(s)} style={pill(sort === s, accent)}>
                {s === "recent" ? "Recent" :
                 s === "name" ? "A–Z" :
                 s === "visits" ? "Most visits" :
                 s === "outstanding" ? "Due" : "⚠ Alerts"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
            <button onClick={() => setFAlerts(!fAlerts)} style={tagFilter(fAlerts, "#DC2626")}>⚠ Alerts</button>
            <button onClick={() => setFPlans(!fPlans)} style={tagFilter(fPlans, accent)}>Active plans</button>
            <button onClick={() => setFDue(!fDue)} style={tagFilter(fDue, "#F97316")}>Outstanding</button>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflow: "auto", marginRight: -6, paddingRight: 6 }}>
            {loading && <Loader label="Loading patients…" />}
            {!loading && list.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: MUTE, fontSize: 13 }}>
                No patients match these filters.<br />
                <button onClick={() => { setQuery(""); setFAlerts(false); setFPlans(false); setFDue(false); }}
                  style={{ marginTop: 14, background: accent, color: "#fff", border: "none", padding: "8px 16px",
                    borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Clear filters
                </button>
              </div>
            )}
            {list.map(p => {
              const active = selectedId === p.id;
              return (
                <button key={p.id} onClick={() => setSelectedId(p.id)}
                  style={{
                    width: "100%", textAlign: "left", border: "none",
                    background: active ? `${accent}14` : "transparent",
                    borderLeft: active ? `4px solid ${accent}` : "4px solid transparent",
                    padding: "12px 14px", borderRadius: 12, marginBottom: 4,
                    cursor: "pointer", display: "block", fontFamily: "inherit",
                    transition: "background .15s",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: INK }}>
                      {p.has_alerts && <span title="Health alerts" style={{ color: "#DC2626", marginRight: 4 }}>⚠</span>}
                      {p.name}
                    </div>
                    {p.outstanding > 0 && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", whiteSpace: "nowrap" }}>
                        {fmtINR(p.outstanding)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>
                    📞 {p.phone || "—"}{p.age ? ` · ${p.age}y` : ""}{p.gender ? ` · ${p.gender}` : ""}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>
                    {(p.total_visits || 0)} visits
                    {p.active_plans > 0 && <span> · <span style={{ color: accent, fontWeight: 700 }}>{p.active_plans} active</span></span>}
                    {p.last_visit_date && ` · last ${fmtDate(p.last_visit_date)}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ RIGHT — Detail panel ═══ */}
        <div style={{ background: "#fff", borderRadius: 18, padding: 22, boxShadow: "0 2px 10px #0f172a08", overflow: "auto" }}>
          {!selectedId && <EmptyState />}
          {selectedId && detailLoading && <Loader label="Loading record…" />}
          {selectedId && detail && !detailLoading && (
            <PatientDetail
              data={detail}
              tab={tab}
              setTab={setTab}
              editMode={editMode}
              setEditMode={setEditMode}
              accent={accent}
              staff={staff}
              show={show}
              refresh={() => { loadDetail(selectedId); loadList(); }}
              onCall={() => callPatient(detail.patient.phone)}
              onWhatsApp={() => whatsAppPatient(detail.patient.phone, detail.patient.name)}
              onOpenWorkspace={() => onOpenWorkspace?.(detail.patient)}
              onBookAppointment={() => onBookAppointment?.(detail.patient)}
            />
          )}
        </div>
      </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PATIENT DETAIL — header + tabs + content
// ═══════════════════════════════════════════════════════════════
function PatientDetail({
  data, tab, setTab, editMode, setEditMode,
  accent, staff, show, refresh,
  onCall, onWhatsApp, onOpenWorkspace, onBookAppointment,
}: any) {
  const p = data.patient;
  const alerts = data.alerts || [];
  const plans = data.treatment_plans || [];
  const rxs = data.prescriptions || [];

  return (
    <div>
      {/* Header */}
      <PatientHeader
        patient={p}
        alerts={alerts}
        summary={data.summary}
        accent={accent}
        editMode={editMode}
        setEditMode={setEditMode}
        onCall={onCall}
        onWhatsApp={onWhatsApp}
        onOpenWorkspace={onOpenWorkspace}
        onBookAppointment={onBookAppointment}
        onSave={async (patch: any) => {
          try { await api.pdbUpdate(p.id, patch); show("✓ Saved"); refresh(); setEditMode(false); }
          catch (e: any) { show("Error: " + e.message); }
        }}
      />

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${LINE}`, marginBottom: 16, display: "flex", gap: 2, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            border: "none", background: "transparent",
            padding: "11px 13px", fontSize: 13, fontWeight: 700,
            color: tab === t.id ? accent : MUTE,
            borderBottom: tab === t.id ? `2px solid ${accent}` : "2px solid transparent",
            cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap" as const, fontFamily: "inherit",
          }}>
            {t.icon} {t.label}
            {t.id === "plans" && plans.length > 0 && <Bdg n={plans.length} accent={accent} />}
            {t.id === "rx" && rxs.length > 0 && <Bdg n={rxs.length} accent={accent} />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview"  && <OverviewTab data={data} accent={accent} />}
      {tab === "workspace" && <WorkspaceEmbed patientId={p.id} accent={accent} />}
      {tab === "plans"     && <PlansTab plans={plans} accent={accent} />}
      {tab === "rx"        && <RxHistoryList rxs={rxs} accent={accent} clinicId={staff?.clinic_id} show={show} />}
      {tab === "visits"    && <VisitsTab patientId={p.id} accent={accent} />}
      {tab === "payments"  && <PaymentsTab pays={data.payments} summary={data.summary} accent={accent} />}
      {tab === "lab"       && <LabTab patientId={p.id} accent={accent} />}
      {tab === "media"     && <MediaTab patientId={p.id} clinicId={staff?.clinic_id} accent={accent} show={show} />}
      {tab === "timeline"  && <TimelineTab patientId={p.id} accent={accent} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HEADER — name, alerts, action bar, inline edit
// ═══════════════════════════════════════════════════════════════
function PatientHeader({ patient, alerts, summary, accent, editMode, setEditMode, onCall, onWhatsApp, onOpenWorkspace, onBookAppointment, onSave }: any) {
  const [form, setForm] = useState({
    name: patient.name || "",
    phone: patient.phone || "",
    age: patient.age ?? "",
    gender: patient.gender || "",
    address: patient.address || "",
    chairside_notes: patient.chairside_notes || "",
  });
  const [ills, setIlls] = useState<string[]>(patient.existing_illnesses || []);

  useEffect(() => {
    setForm({
      name: patient.name || "", phone: patient.phone || "",
      age: patient.age ?? "", gender: patient.gender || "",
      address: patient.address || "", chairside_notes: patient.chairside_notes || "",
    });
    setIlls(patient.existing_illnesses || []);
  }, [patient.id]); // eslint-disable-line

  if (editMode) {
    return (
      <div style={{ marginBottom: 16, background: "#F8FAFC", borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <b style={{ fontSize: 14, color: INK }}>✏️ Edit patient</b>
          <button onClick={() => setEditMode(false)} style={btnGhost}>Cancel</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" style={inp} />
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" style={inp} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10, marginTop: 8 }}>
          <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Age" style={inp} />
          <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} style={inp}>
            <option value="">Gender</option>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
          <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" style={inp} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Label>Existing illnesses</Label>
          <MedicalConditionsPicker value={ills} onChange={setIlls} accent={accent} compact />
        </div>
        <div style={{ marginTop: 10 }}>
          <Label>Chairside notes</Label>
          <textarea value={form.chairside_notes} onChange={e => setForm({ ...form, chairside_notes: e.target.value })}
            style={{ ...inp, minHeight: 70, resize: "vertical" as const }} placeholder="E.g. preferred anaesthetic, sensitivity history…" />
        </div>
        <button
          onClick={() => onSave({
            name: form.name, phone: form.phone,
            age: form.age ? parseInt(String(form.age)) : null,
            gender: form.gender || null, address: form.address || null,
            chairside_notes: form.chairside_notes || null,
            existing_illnesses: ills,
          })}
          style={{ ...btnPrimary(accent), marginTop: 12, padding: "11px 18px" }}
        >✓ Save changes</button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 26, color: INK }}>{patient.name}</h2>
          <div style={{ fontSize: 13, color: MUTE, marginTop: 4 }}>
            📞 {patient.phone || "—"}
            {patient.age && ` · ${patient.age} yrs`}
            {patient.gender && ` · ${patient.gender}`}
            {patient.clinic_name && <> · 🏥 {patient.clinic_name}</>}
          </div>
          {patient.address && (
            <div style={{ fontSize: 12, color: MUTE, marginTop: 3 }}>📍 {patient.address}</div>
          )}
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
            Patient ID {patient.id.slice(0, 8)} · Registered {fmtDate(patient.created_at)}
            {patient.last_visit_date && ` · Last visit ${fmtDate(patient.last_visit_date)}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={onOpenWorkspace} style={btnPrimary(accent)}>🦷 Open Workspace</button>
          <button onClick={onBookAppointment} style={btnSecondary}>📅 Book</button>
          <button onClick={onCall} style={iconBtn("#3B82F6")} title="Call">📞</button>
          <button onClick={onWhatsApp} style={iconBtn("#25D366")} title="WhatsApp">💬</button>
          <button onClick={() => setEditMode(true)} style={iconBtn(MUTE)} title="Edit patient">✏️</button>
        </div>
      </div>

      {/* Alerts row */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {alerts.map((a: any, i: number) => {
            const c = SEV[a.severity] || SEV.medium;
            return (
              <span key={i} style={{
                background: c.bg, color: c.text, border: `1px solid ${c.border}`,
                padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              }}>{a.icon} {a.label}</span>
            );
          })}
        </div>
      )}

      {/* Chairside note ribbon */}
      {patient.chairside_notes && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderLeft: `3px solid ${accent}`,
          background: "#F0FDFA", borderRadius: 8, fontSize: 12, color: INK, whiteSpace: "pre-wrap" as const }}>
          💭 <b>Chairside notes:</b> {patient.chairside_notes}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════
function OverviewTab({ data, accent }: any) {
  const s = data.summary || {};
  const p = data.patient;
  const active = (data.treatment_plans || []).filter((pl: any) => !pl.is_archived && !["completed", "cancelled", "closed"].includes(pl.status));
  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <PortalLinkGenerator patientId={p.id} patientPhone={p.phone} patientName={p.name} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Stat label="Total visits"  value={data.patient.total_visits || 0} color="#3B82F6" />
        <Stat label="Lifetime billed" value={fmtINR(s.lifetime_billed || 0)} color={INK} />
        <Stat label="Lifetime paid"   value={fmtINR(s.lifetime_paid || 0)}   color="#10B981" />
        <Stat label="Outstanding"     value={fmtINR(s.outstanding || 0)}      color={s.outstanding > 0 ? "#DC2626" : "#94a3b8"} />
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: INK }}>Active Treatment Plans</h3>
        <span style={{ fontSize: 12, color: MUTE }}>{active.length} active / {data.treatment_plans?.length || 0} total</span>
      </div>
      {active.length === 0 && <Empty text="No active plans. Use Open Workspace to start one." />}
      {active.map((pl: any) => (
        <PlanCard key={pl.id} pl={pl} accent={accent} />
      ))}

      {(data.prescriptions || []).slice(0, 3).length > 0 && (
        <>
          <h3 style={{ margin: "20px 0 8px", fontSize: 16, color: INK }}>Recent Prescriptions</h3>
          {(data.prescriptions || []).slice(0, 3).map((r: any) => (
            <div key={r.id} style={{ ...cardSoft, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <b style={{ fontSize: 13 }}>Rx #{r.serial_number || ""}</b>
                <span style={{ marginLeft: 8, fontSize: 12, color: MUTE }}>{fmtDate(r.created_at)}</span>
                {r.diagnosis && <div style={{ fontSize: 12, color: INK, marginTop: 2 }}>{r.diagnosis}</div>}
              </div>
              {r.pdf_url && (
                <button onClick={() => window.open(r.pdf_url, "_blank")} style={btnGhost}>📄 PDF</button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function PlanCard({ pl, accent }: any) {
  const pct = pl.items_count > 0 ? (pl.items_completed / pl.items_count) * 100 : 0;
  return (
    <div style={cardSoft}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{pl.name}</div>
          {pl.complaint && <div style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>Complaint: {pl.complaint}</div>}
          <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>
            {pl.items_completed} / {pl.items_count} items done
            {pl.sittings_completed > 0 && ` · ${pl.sittings_completed} sitting${pl.sittings_completed === 1 ? "" : "s"}`}
            {` · started ${fmtDate(pl.created_at)}`}
          </div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <div style={{ fontSize: 11, color: MUTE }}>Billed {fmtINR(pl.final_payable)}</div>
          <div style={{ fontSize: 11, color: "#10B981" }}>Paid {fmtINR(pl.total_paid)}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: pl.balance > 0 ? "#DC2626" : "#10B981" }}>
            {fmtINR(pl.balance)} due
          </div>
        </div>
      </div>
      <ProgressBar pct={pct} accent={accent} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WORKSPACE TAB (read-only embed)
// ═══════════════════════════════════════════════════════════════
function WorkspaceEmbed({ patientId, accent }: { patientId: string; accent: string }) {
  return <PatientWorkspaceView patientId={patientId} accent={accent} />;
}

// ═══════════════════════════════════════════════════════════════
// PLANS TAB — all plans (active + archived)
// ═══════════════════════════════════════════════════════════════
function PlansTab({ plans, accent }: any) {
  if (!plans || plans.length === 0) return <Empty text="No treatment plans yet." />;
  const active = plans.filter((p: any) => !p.is_archived);
  const archived = plans.filter((p: any) => p.is_archived);
  return (
    <div>
      {active.length > 0 && <h3 style={{ margin: "0 0 8px", fontSize: 14, color: INK }}>Active</h3>}
      {active.map((pl: any) => <PlanCard key={pl.id} pl={pl} accent={accent} />)}
      {archived.length > 0 && (
        <>
          <h3 style={{ margin: "20px 0 8px", fontSize: 14, color: MUTE }}>Archived</h3>
          {archived.map((pl: any) => (
            <div key={pl.id} style={{ ...cardSoft, opacity: 0.65 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <b>{pl.name}</b>
                  <div style={{ fontSize: 11, color: MUTE }}>
                    Closed {fmtDate(pl.archived_at)} · {pl.items_count} items · {fmtINR(pl.final_payable)} billed
                  </div>
                </div>
                <span style={{ background: "#F1F5F9", color: MUTE, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                  {pl.status}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Rx TAB
// ═══════════════════════════════════════════════════════════════
function RxHistoryList({ rxs, accent, clinicId, show }: any) {
  if (!rxs || rxs.length === 0) return <Empty text="No prescriptions on file yet." />;
  return (
    <div>
      {rxs.map((r: any) => (
        <div key={r.id} style={{ ...cardSoft, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <b style={{ fontSize: 14 }}>Rx #{r.serial_number || ""}</b>
              <span style={{ marginLeft: 8, fontSize: 12, color: MUTE }}>{fmtDate(r.created_at)}</span>
              {r.diagnosis && <div style={{ fontSize: 13, color: INK, marginTop: 4 }}>{r.diagnosis}</div>}
              {r.complaint && <div style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>Complaint: {r.complaint}</div>}
              {(r.medicines || []).length > 0 && (
                <div style={{ fontSize: 12, color: INK, marginTop: 4 }}>
                  💊 {(r.medicines || []).map((m: any) => m.name || m).join(", ")}
                </div>
              )}
              {r.advice && <div style={{ fontSize: 12, color: MUTE, marginTop: 4, whiteSpace: "pre-wrap" as const }}>{r.advice}</div>}
              {r.followup_date && (
                <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginTop: 4 }}>
                  Follow-up: {fmtDate(r.followup_date)}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <button onClick={() => window.open(api.getPrescriptionPdfUrl(r.id, r.pdf_url), "_blank")} style={btnGhost}>📄 PDF</button>
              {clinicId && <QRCodeWidget clinicId={clinicId} kind="rx" targetId={r.id} accent={accent} show={show} />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VISITS TAB
// ═══════════════════════════════════════════════════════════════
function VisitsTab({ patientId, accent }: { patientId: string; accent: string }) {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api.pdbVisits(patientId, 50).then(d => setVisits(d.visits || [])).finally(() => setLoading(false));
  }, [patientId]);
  if (loading) return <Loader label="Loading visits…" />;
  if (visits.length === 0) return <Empty text="No completed visits yet." />;
  return (
    <div>
      {visits.map(v => (
        <div key={v.id} style={{ ...cardSoft, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 13 }}>{fmtDate(v.date)}</b>
              {v.doctor_name && <span style={{ marginLeft: 8, fontSize: 12, color: MUTE }}>Dr. {v.doctor_name}</span>}
              {(v.procedures || []).length > 0 && (
                <div style={{ fontSize: 12, color: INK, marginTop: 4 }}>
                  {(v.procedures || []).map((p: any) => p.procedure_name || p.name).join(", ")}
                </div>
              )}
              {v.notes && <div style={{ fontSize: 12, color: MUTE, marginTop: 4, whiteSpace: "pre-wrap" as const }}>📝 {v.notes}</div>}
              {v.next_step && <div style={{ fontSize: 12, color: accent, marginTop: 4 }}>→ {v.next_step}</div>}
            </div>
            <div style={{ textAlign: "right" as const, minWidth: 100 }}>
              <div style={{ fontSize: 11, color: MUTE }}>Charged {fmtINR(v.amount_payable)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#10B981" }}>{fmtINR(v.amount_collected)} paid</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAYMENTS TAB
// ═══════════════════════════════════════════════════════════════
function PaymentsTab({ pays, summary, accent }: any) {
  if (!pays || pays.length === 0) return <Empty text="No payments collected yet." />;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <Stat label="Billed"      value={fmtINR(summary?.lifetime_billed || 0)} color={INK} />
        <Stat label="Paid"        value={fmtINR(summary?.lifetime_paid || 0)}   color="#10B981" />
        <Stat label="Outstanding" value={fmtINR(summary?.outstanding || 0)}     color={summary?.outstanding > 0 ? "#DC2626" : "#94a3b8"} />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
        <thead><tr style={{ background: "#F8FAFC" }}>
          {["Date", "Amount", "Mode", "Reference", "Remarks"].map(h =>
            <th key={h} style={{ padding: 10, textAlign: "left" as const, fontSize: 11, color: MUTE, fontWeight: 700, borderBottom: `1px solid ${LINE}` }}>{h}</th>)}
        </tr></thead>
        <tbody>{pays.map((p: any) => (
          <tr key={p.id}>
            <td style={td}>{fmtDate(p.date)}</td>
            <td style={{ ...td, fontWeight: 700, color: "#10B981" }}>{fmtINR(p.amount)}</td>
            <td style={td}>{(p.payment_mode || "—").toUpperCase()}</td>
            <td style={{ ...td, fontSize: 11, color: MUTE }}>{p.reference || "—"}</td>
            <td style={{ ...td, fontSize: 12, color: MUTE }}>{p.remarks || "—"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAB TAB
// ═══════════════════════════════════════════════════════════════
function LabTab({ patientId, accent }: { patientId: string; accent: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api.pdbLabOrders(patientId).then(d => setOrders(d.orders || [])).finally(() => setLoading(false));
  }, [patientId]);
  if (loading) return <Loader label="Loading lab orders…" />;
  if (orders.length === 0) return <Empty text="No lab orders for this patient." />;
  const statusColor = (s: string) => ({
    sent: "#F59E0B", in_progress: "#3B82F6", received: "#10B981", cancelled: "#94a3b8",
  } as any)[s] || MUTE;
  return (
    <div>
      {orders.map(o => (
        <div key={o.id} style={{ ...cardSoft, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 14 }}>{o.work_type}</b>
              <span style={{
                marginLeft: 8, fontSize: 11, fontWeight: 700,
                background: statusColor(o.status) + "22", color: statusColor(o.status),
                padding: "2px 10px", borderRadius: 999,
              }}>{(o.status || "").toUpperCase()}</span>
              {(o.teeth || []).length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, color: MUTE }}>🦷 {(o.teeth || []).join(", ")}</span>
              )}
              <div style={{ fontSize: 12, color: MUTE, marginTop: 4 }}>
                Vendor: {o.vendor_name || "—"}{o.vendor_phone && ` (${o.vendor_phone})`}
                {o.shade && ` · Shade ${o.shade}`}
              </div>
              <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>
                Sent {fmtDate(o.sent_date)} · Expected {fmtDate(o.expected_date)}
                {o.received_date && ` · Received ${fmtDate(o.received_date)}`}
              </div>
              {o.notes && <div style={{ fontSize: 12, color: INK, marginTop: 4 }}>{o.notes}</div>}
            </div>
            <div style={{ textAlign: "right" as const, minWidth: 110 }}>
              <div style={{ fontSize: 11, color: MUTE }}>Cost {fmtINR(o.cost)}</div>
              <div style={{ fontSize: 11, color: "#10B981" }}>Paid {fmtINR(o.amount_paid)}</div>
              {o.balance > 0 && (
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>{fmtINR(o.balance)} due</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MEDIA TAB — MediaGallery + Smile Studio
// ═══════════════════════════════════════════════════════════════
function MediaTab({ patientId, clinicId, accent, show }: {
  patientId: string; clinicId?: string; accent: string; show: (m: string) => void;
}) {
  if (!clinicId) return <Empty text="Clinic context required for media." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <MediaGallery clinicId={clinicId} patientId={patientId} accent={accent} show={show} />
      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 20 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, color: INK }}>✨ Smile Preview Studio</h3>
        <SmileStudio clinicId={clinicId} patientId={patientId} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TIMELINE TAB
// ═══════════════════════════════════════════════════════════════
function TimelineTab({ patientId, accent }: { patientId: string; accent: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<string>("all");
  useEffect(() => {
    setLoading(true);
    api.pdbTimeline(patientId, 150).then(d => setEvents(d.events || [])).finally(() => setLoading(false));
  }, [patientId]);
  if (loading) return <Loader label="Loading timeline…" />;
  if (events.length === 0) return <Empty text="No timeline events yet." />;

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "appointment", label: "📅 Appointments" },
    { id: "visit", label: "🦷 Treatment" },
    { id: "prescription", label: "💊 Rx" },
    { id: "lab", label: "🧪 Lab" },
    { id: "payment", label: "💰 Payments" },
    { id: "message", label: "💬 Messages" },
  ];
  const counts: Record<string, number> = {};
  events.forEach(e => { counts[e.kind] = (counts[e.kind] || 0) + 1; });
  const shown = kind === "all" ? events : events.filter(e => e.kind === kind);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 16 }}>
        {FILTERS.filter(f => f.id === "all" || counts[f.id]).map(f => (
          <button key={f.id} onClick={() => setKind(f.id)}
            style={{ border: kind === f.id ? `2px solid ${accent}` : `1.5px solid ${LINE}`, background: kind === f.id ? accent + "12" : "#fff", color: kind === f.id ? accent : "#475569", borderRadius: 999, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {f.label}{f.id !== "all" && counts[f.id] ? ` (${counts[f.id]})` : ""}
          </button>
        ))}
      </div>
    <div style={{ position: "relative" as const, paddingLeft: 26 }}>
      <div style={{ position: "absolute" as const, left: 10, top: 6, bottom: 6, width: 2, background: LINE }} />
      {shown.map((e, i) => (
        <div key={i} style={{ position: "relative" as const, marginBottom: 16 }}>
          <div style={{
            position: "absolute" as const, left: -22, top: 0,
            width: 22, height: 22, borderRadius: "50%" as const,
            background: "#fff", border: `2px solid ${accent}`,
            display: "flex", alignItems: "center" as const, justifyContent: "center" as const, fontSize: 11,
          }}>{e.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{e.title}</div>
          <div style={{ fontSize: 12, color: MUTE }}>{e.subtitle}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(e.at)}</div>
          {e.notes && <div style={{ fontSize: 12, color: INK, marginTop: 3, whiteSpace: "pre-wrap" as const }}>{e.notes}</div>}
        </div>
      ))}
    </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════
function Stat({ label, value, color }: any) {
  return (
    <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, color: MUTE, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ProgressBar({ pct, accent }: { pct: number; accent: string }) {
  return (
    <div style={{ marginTop: 8, height: 6, background: LINE, borderRadius: 999, overflow: "hidden" as const }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: pct >= 100 ? "#10B981" : accent, transition: "width .3s" }} />
    </div>
  );
}

function Bdg({ n, accent }: { n: number; accent: string }) {
  return <span style={{ background: accent, color: "#fff", padding: "0 6px", borderRadius: 999, fontSize: 10, fontWeight: 700, marginLeft: 4 }}>{n}</span>;
}

function Loader({ label }: { label: string }) {
  return <div style={{ padding: 40, textAlign: "center" as const, color: MUTE, fontSize: 13 }}>⏳ {label}</div>;
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 30, textAlign: "center" as const, color: MUTE, fontSize: 13, background: "#F8FAFC", borderRadius: 12 }}>{text}</div>;
}

function EmptyState() {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center" as const, justifyContent: "center" as const, flexDirection: "column" as const, color: MUTE }}>
      <div style={{ fontSize: 56, marginBottom: 8 }}>👈</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Pick a patient from the list</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>Overview · Workspace · Plans · Rx · Visits · Payments · Lab · Media · Timeline</div>
    </div>
  );
}

function Label({ children }: any) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: MUTE, marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>{children}</div>;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const pill = (active: boolean, accent: string): any => ({
  border: "none", borderRadius: 999, padding: "5px 12px",
  background: active ? INK : "#F1F5F9",
  color: active ? "#fff" : MUTE,
  fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" as const, fontFamily: "inherit",
});
const tagFilter = (active: boolean, color: string): any => ({
  border: `1.5px solid ${active ? color : LINE}`, borderRadius: 999,
  background: active ? color + "14" : "#fff",
  color: active ? color : MUTE,
  padding: "4px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});
const btnPrimary = (accent: string): any => ({
  background: accent, color: "#fff", border: "none", padding: "10px 16px",
  borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
});
const btnSecondary: any = {
  background: "#fff", color: INK, border: `2px solid ${LINE}`, padding: "10px 16px",
  borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const btnGhost: any = {
  background: "transparent", color: MUTE, border: `1px solid ${LINE}`, padding: "5px 12px",
  borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};
const iconBtn = (color: string): any => ({
  width: 38, height: 38, borderRadius: 12, border: "none",
  background: color, color: "#fff", cursor: "pointer", fontSize: 14, fontFamily: "inherit",
  display: "inline-flex" as const, alignItems: "center" as const, justifyContent: "center" as const,
});
const inp: any = {
  width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 10, padding: "9px 12px",
  fontSize: 14, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit",
};
const td: any = { padding: 10, fontSize: 13, borderBottom: `1px solid #F1F5F9` };
const cardSoft: any = {
  background: "#F8FAFC", borderRadius: 12, padding: 14, marginBottom: 8,
  border: `1px solid ${LINE}`,
};
