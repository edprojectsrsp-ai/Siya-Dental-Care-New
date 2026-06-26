"use client";
// ╔══════════════════════════════════════════════════════════════════╗
// ║  SPECIALIST MANAGER — directory + earnings ledger + outstanding.  ║
// ║  Sidebar mount: { id: "specialists", icon: "👨‍⚕️", label: "Specialists" }
// ║                                                                   ║
// ║  Assignment happens INSIDE the appointment modal (a separate      ║
// ║  AssignSpecialistButton component, exported below).               ║
// ╚══════════════════════════════════════════════════════════════════╝
import { useState, useEffect, useCallback, useMemo } from "react";
import * as api from "@/lib/api";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";

const card: any = { background: "#fff", borderRadius: 16, padding: 18, boxShadow: SHADOW, border: `1px solid ${LINE}` };
const lbl: any = { display: "block", fontSize: 11, fontWeight: 800, color: MUTE, marginBottom: 5, letterSpacing: 0.3, textTransform: "uppercase" };
const inp: any = { width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
const btn = (c: string): any => ({ background: c, color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" });
const btnGhost: any = { background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" };

function fmt(n: number) { return `₹${(n || 0).toLocaleString("en-IN")}`; }
function dmy(d?: string) { if (!d) return "—"; try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); } catch { return d; } }

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════
export function SpecialistManager({ accent, show, currentStaffRole }: { accent: string; show: (m: string) => void; currentStaffRole?: string }) {
  const A = accent;
  const isSpecialist = currentStaffRole === "specialist";
  const [tab, setTab] = useState<"queue" | "earnings" | "directory">(isSpecialist ? "queue" : "earnings");

  const tabs = isSpecialist
    ? [["queue", "📋 My Queue"], ["earnings", "💰 My Earnings"]] as const
    : [["queue", "📋 Specialist Queue"], ["earnings", "💰 Earnings Ledger"], ["directory", "👥 Directory"]] as const;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: INK }}>👨‍⚕️ Specialists</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTE }}>
          {isSpecialist
            ? "Your assigned patients and earnings. Payment finalisation is handled separately."
            : "Manage external specialists, view their queues, and settle earnings."}
        </p>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: SOFT, borderRadius: 12, padding: 4, width: "fit-content" }}>
        {tabs.map(([id, l]) => (
          <button key={id} onClick={() => setTab(id as any)} style={{
            border: "none", borderRadius: 10, padding: "9px 18px",
            background: tab === id ? A : "transparent", color: tab === id ? "#fff" : MUTE,
            fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>{l}</button>
        ))}
      </div>
      {tab === "queue" && <QueueTab A={A} show={show} isSpecialist={isSpecialist} />}
      {tab === "earnings" && <EarningsTab A={A} show={show} isSpecialist={isSpecialist} />}
      {tab === "directory" && !isSpecialist && <DirectoryTab A={A} show={show} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// QUEUE TAB — assigned appointments for a specialist
// ════════════════════════════════════════════════════════════════════
function QueueTab({ A, show, isSpecialist }: any) {
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [queue, setQueue] = useState<any>(null);

  useEffect(() => {
    if (!isSpecialist) {
      api.specListSpecialists().then(list => {
        setSpecialists(list);
        if (list.length > 0 && !selected) setSelected(list[0].id);
      }).catch(() => {});
    }
  }, [isSpecialist]);   // eslint-disable-line

  const load = useCallback(async () => {
    if (isSpecialist) {
      try { setQueue(await api.specQueue()); } catch (e: any) { show(e.message); }
    } else if (selected) {
      try { setQueue(await api.specQueue(selected)); } catch (e: any) { show(e.message); }
    }
  }, [isSpecialist, selected, show]);

  useEffect(() => { load(); }, [load]);

  const closeSession = async (apt: any) => {
    if (!confirm(`Close session for ${apt.patient_name}?`)) return;
    try {
      const r = await api.specCloseSession(apt.id);
      show(r.notification || "✓ Session closed");
      load();
    } catch (e: any) { show(e.message); }
  };

  return (
    <div>
      {!isSpecialist && (
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Viewing queue for</label>
          <select value={selected} onChange={e => setSelected(e.target.value)} style={{ ...inp, maxWidth: 360 }}>
            <option value="">— Pick a specialist —</option>
            {specialists.map(s => <option key={s.id} value={s.id}>{s.name}{s.specialization ? ` · ${s.specialization}` : ""}</option>)}
          </select>
        </div>
      )}
      {!queue && <div style={{ padding: 30, color: MUTE, textAlign: "center" }}>Loading…</div>}
      {queue && (
        <>
          {/* Summary tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>
            {[
              ["Today", queue.summary?.today, "#3B82F6", "📅"],
              ["Upcoming", queue.summary?.upcoming, "#8B5CF6", "🕐"],
              ["Completed", queue.summary?.completed, "#10B981", "✓"],
              ["Total in window", queue.summary?.total, "#64748B", "📋"],
            ].map(([l, v, c, i]: any) => (
              <div key={l} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", boxShadow: SHADOW, borderTop: `3px solid ${c}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, background: `${c}15`, color: c, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{i}</div>
                  <div style={{ fontSize: 10.5, color: MUTE, fontWeight: 800, letterSpacing: 0.3, textTransform: "uppercase" as const }}>{l}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: c, marginTop: 4 }}>{v || 0}</div>
              </div>
            ))}
          </div>

          <QueueSection title="📅 Today" items={queue.today || []} A={A} closeSession={closeSession} isSpecialist={isSpecialist} highlight />
          <QueueSection title="🕐 Upcoming" items={queue.upcoming || []} A={A} closeSession={closeSession} isSpecialist={isSpecialist} />
          <QueueSection title="✓ Completed (recent)" items={(queue.completed || []).slice(0, 10)} A={A} closeSession={closeSession} isSpecialist={isSpecialist} muted />
        </>
      )}
    </div>
  );
}

function QueueSection({ title, items, A, closeSession, isSpecialist, highlight, muted }: any) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: muted ? MUTE : INK, marginBottom: 8 }}>{title} <span style={{ color: MUTE, fontWeight: 600 }}>({items.length})</span></div>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
        {items.map((apt: any) => (
          <div key={apt.id} style={{
            background: "#fff", borderRadius: 12, padding: "12px 14px", boxShadow: SHADOW,
            borderLeft: `4px solid ${highlight ? A : apt.specialist_session_status === "closed" ? "#10B981" : "#94A3B8"}`,
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const,
            opacity: muted ? 0.8 : 1,
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                <b style={{ fontSize: 15 }}>{apt.patient_name}</b>
                <span style={{ color: MUTE, fontSize: 12 }}>{apt.patient_age ? `${apt.patient_age}y` : ""} {apt.patient_gender ? `/${apt.patient_gender}` : ""}</span>
                {(apt.existing_illnesses || []).slice(0, 2).map((i: string) => (
                  <span key={i} style={{ background: "#FEE2E2", color: "#991B1B", padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800 }}>⚠ {i}</span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>
                📅 {dmy(apt.scheduled_date)} · 🕐 {apt.scheduled_time || "—"}
                {(apt.chief_complaints || []).length > 0 && ` · ${(apt.chief_complaints || []).join(", ")}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <SessionPill status={apt.specialist_session_status} />
              {apt.specialist_session_status !== "closed" && (isSpecialist || true) && (
                <button onClick={() => closeSession(apt)} style={{ ...btn("#10B981"), padding: "7px 14px", fontSize: 12 }}>✓ Close Session</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionPill({ status }: { status?: string }) {
  if (!status) return null;
  const colors: Record<string, { bg: string; c: string; label: string }> = {
    pending: { bg: "#FEF3C7", c: "#D97706", label: "⏳ Pending" },
    in_session: { bg: "#DBEAFE", c: "#1D4ED8", label: "🩺 In session" },
    closed: { bg: "#D1FAE5", c: "#059669", label: "✓ Closed" },
  };
  const s = colors[status] || { bg: SOFT, c: MUTE, label: status };
  return <span style={{ background: s.bg, color: s.c, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>{s.label}</span>;
}

// ════════════════════════════════════════════════════════════════════
// EARNINGS TAB
// ════════════════════════════════════════════════════════════════════
function EarningsTab({ A, show, isSpecialist }: any) {
  const [earnings, setEarnings] = useState<any>(null);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [filterSpec, setFilterSpec] = useState<string>("");
  const [filterSettled, setFilterSettled] = useState<string>("unsettled");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recording, setRecording] = useState(false);
  const [batchSettle, setBatchSettle] = useState(false);

  const load = useCallback(async () => {
    const filters: any = {};
    if (filterSpec && !isSpecialist) filters.specialist_id = filterSpec;
    if (filterSettled === "settled") filters.settled = true;
    if (filterSettled === "unsettled") filters.settled = false;
    try { setEarnings(await api.specListEarnings(filters)); } catch (e: any) { show(e.message); }
  }, [filterSpec, filterSettled, isSpecialist, show]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!isSpecialist) api.specListSpecialists().then(setSpecialists).catch(() => {});
  }, [isSpecialist]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const selectAll = () => {
    const allUnsettled = (earnings?.items || []).filter((e: any) => !e.is_settled).map((e: any) => e.id);
    setSelectedIds(new Set(allUnsettled));
  };
  const clearSel = () => setSelectedIds(new Set());

  const selectedTotal = useMemo(() => {
    return (earnings?.items || []).filter((e: any) => selectedIds.has(e.id) && !e.is_settled).reduce((s: number, e: any) => s + (e.amount || 0), 0);
  }, [earnings, selectedIds]);

  return (
    <div>
      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 10, marginBottom: 14 }}>
        <div style={{ ...card, borderTop: "3px solid #F97316", padding: "14px 16px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: MUTE, letterSpacing: 0.3, textTransform: "uppercase" as const }}>💸 Outstanding</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#F97316", marginTop: 4 }}>{fmt(earnings?.summary?.outstanding_amount || 0)}</div>
          {(earnings?.summary?.outstanding_amount || 0) > 0 && (
            <button onClick={() => { selectAll(); setBatchSettle(true); }} style={{ ...btn("#F97316"), marginTop: 8, padding: "6px 12px", fontSize: 12 }}>Settle all unsettled</button>
          )}
        </div>
        <div style={{ ...card, borderTop: "3px solid #10B981", padding: "14px 16px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: MUTE, letterSpacing: 0.3, textTransform: "uppercase" as const }}>✓ Settled</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#10B981", marginTop: 4 }}>{fmt(earnings?.summary?.settled_amount || 0)}</div>
        </div>
        <div style={{ ...card, borderTop: `3px solid ${A}`, padding: "14px 16px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: MUTE, letterSpacing: 0.3, textTransform: "uppercase" as const }}>📋 Total records</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: A, marginTop: 4 }}>{earnings?.summary?.total_records || 0}</div>
        </div>
      </div>

      {/* Filters + record button */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" as const }}>
        {!isSpecialist && (
          <select value={filterSpec} onChange={e => setFilterSpec(e.target.value)} style={{ ...inp, width: 220 }}>
            <option value="">All specialists</option>
            {specialists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select value={filterSettled} onChange={e => setFilterSettled(e.target.value)} style={{ ...inp, width: 160 }}>
          <option value="unsettled">Unsettled only</option>
          <option value="settled">Settled only</option>
          <option value="all">All</option>
        </select>
        <div style={{ flex: 1 }} />
        {!isSpecialist && <button onClick={() => setRecording(true)} style={btn(A)}>＋ Record Earning</button>}
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && !isSpecialist && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: `${A}10`, border: `1.5px solid ${A}55`, borderRadius: 12, padding: "10px 16px", marginBottom: 10 }}>
          <div>
            <b>{selectedIds.size}</b> selected · <b>{fmt(selectedTotal)}</b> total
            <button onClick={clearSel} style={{ background: "transparent", border: "none", color: MUTE, marginLeft: 12, cursor: "pointer", fontSize: 12 }}>Clear</button>
          </div>
          <button onClick={() => setBatchSettle(true)} style={btn("#10B981")}>💰 Settle Selected</button>
        </div>
      )}

      {/* Earnings table */}
      <div style={{ ...card, padding: 0, overflow: "hidden" as const }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
          <thead><tr style={{ background: SOFT }}>
            {!isSpecialist && <th style={{ width: 36, padding: "10px 8px" }}></th>}
            {["Date", "Specialist", "Patient", "Amount", "Status", "Notes"].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: MUTE, fontWeight: 800 }}>{h.toUpperCase()}</th>
            ))}
          </tr></thead>
          <tbody>
            {(!earnings || earnings.items.length === 0) && (
              <tr><td colSpan={isSpecialist ? 6 : 7} style={{ padding: 30, textAlign: "center", color: MUTE }}>
                {isSpecialist ? "No earnings recorded yet." : "No earnings — click '＋ Record Earning' to add one."}
              </td></tr>
            )}
            {(earnings?.items || []).map((e: any) => (
              <tr key={e.id} style={{ borderTop: `1px solid ${SOFT}`, background: e.is_settled ? "#F0FDF4" : "transparent" }}>
                {!isSpecialist && (
                  <td style={{ padding: "8px 8px", textAlign: "center" as const }}>
                    {!e.is_settled && (
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)} style={{ accentColor: "#10B981", width: 16, height: 16 }} />
                    )}
                  </td>
                )}
                <td style={{ padding: "10px 12px", whiteSpace: "nowrap" as const, fontWeight: 700 }}>{dmy(e.earned_on)}</td>
                <td style={{ padding: "10px 12px" }}>{e.specialist_name}</td>
                <td style={{ padding: "10px 12px", fontSize: 12 }}>{e.patient_name || "—"}</td>
                <td style={{ padding: "10px 12px", fontWeight: 900, color: e.is_settled ? "#10B981" : "#F97316" }}>{fmt(e.amount)}</td>
                <td style={{ padding: "10px 12px" }}>
                  {e.is_settled ? (
                    <span style={{ background: "#D1FAE5", color: "#065F46", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                      ✓ {dmy(e.settled_on)} · {e.settled_payment_mode || ""}
                    </span>
                  ) : (
                    <span style={{ background: "#FED7AA", color: "#9A3412", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>Pending</span>
                  )}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: MUTE, maxWidth: 240 }}>{e.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {recording && <RecordEarningModal A={A} show={show} specialists={specialists} onClose={() => setRecording(false)} onSaved={() => { setRecording(false); load(); }} />}
      {batchSettle && (
        <BatchSettleModal A={A} show={show} earningIds={Array.from(selectedIds)} total={selectedTotal}
          onClose={() => setBatchSettle(false)}
          onSettled={() => { setBatchSettle(false); setSelectedIds(new Set()); load(); }} />
      )}
    </div>
  );
}

function RecordEarningModal({ A, show, specialists, onClose, onSaved }: any) {
  const [specialistId, setSpecialistId] = useState("");
  const [amount, setAmount] = useState("");
  const [earnedOn, setEarnedOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!specialistId) { show("Pick a specialist"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { show("Enter amount"); return; }
    setSaving(true);
    try {
      await api.specCreateEarning({ specialist_id: specialistId, amount: amt, earned_on: earnedOn, notes: notes || null });
      show(`✓ ${fmt(amt)} recorded`);
      onSaved();
    } catch (e: any) { show(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal A={A} title="＋ Record Specialist Earning" onClose={onClose}>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: MUTE }}>
        Used by the senior doctor when closing out a case: "Dr X earned ₹Y for patient Z".
      </p>
      <Inp label="Specialist *" type="select" value={specialistId} onChange={setSpecialistId}
        options={[["", "— Pick —"], ...specialists.map((s: any) => [s.id, `${s.name}${s.specialization ? ` · ${s.specialization}` : ""}`])]} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Inp label="Amount (₹) *" type="number" value={amount} onChange={setAmount} placeholder="500" />
        <Inp label="Date" type="date" value={earnedOn} onChange={setEarnedOn} />
      </div>
      <Inp label="Notes" value={notes} onChange={setNotes} placeholder="Patient name, treatment, etc." multiline />
      <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={save} disabled={saving} style={btn(A)}>{saving ? "Saving…" : "💾 Record"}</button>
      </div>
    </Modal>
  );
}

function BatchSettleModal({ A, show, earningIds, total, onClose, onSettled }: any) {
  const [amount, setAmount] = useState(String(total));
  const [mode, setMode] = useState("upi");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.specSettleBatch(earningIds, {
        settled_amount: parseFloat(amount) || 0, payment_mode: mode,
        reference: ref || null, notes: notes || null,
      });
      show(`✓ ${earningIds.length} earnings settled`);
      onSettled();
    } catch (e: any) { show(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal A={A} title="💰 Settle Earnings" onClose={onClose}>
      <div style={{ background: `${A}10`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: MUTE, fontWeight: 700 }}>SETTLING</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: A, marginTop: 2 }}>{earningIds.length} earning{earningIds.length !== 1 ? "s" : ""} · {fmt(total)}</div>
      </div>
      <Inp label="Payment Mode *" type="select" value={mode} onChange={setMode}
        options={[["cash", "Cash"], ["upi", "UPI"], ["bank", "Bank transfer"]]} />
      <Inp label="Reference (UPI ref / cheque no)" value={ref} onChange={setRef} placeholder="UPI-1234567890" />
      <Inp label="Settlement Notes" value={notes} onChange={setNotes} placeholder="e.g. November settlement" multiline />
      <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={save} disabled={saving} style={btn("#10B981")}>{saving ? "Settling…" : "✓ Confirm Settlement"}</button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// DIRECTORY TAB
// ════════════════════════════════════════════════════════════════════
function DirectoryTab({ A, show }: any) {
  const [list, setList] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const load = async () => { try { setList(await api.specListSpecialists()); } catch (e: any) { show(e.message); } };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: MUTE }}>{list.length} specialist{list.length !== 1 ? "s" : ""}</div>
        <button onClick={() => setCreating(true)} style={btn(A)}>＋ Add Specialist</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        {list.map(s => (
          <div key={s.id} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${A}, ${A}99)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16 }}>{s.name.charAt(0).toUpperCase()}</div>
              <div>
                <b style={{ fontSize: 14.5 }}>{s.name}</b>
                {s.specialization && <div style={{ fontSize: 12, color: A, fontWeight: 700 }}>{s.specialization}</div>}
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: MUTE }}>
              {s.phone && <div>📞 {s.phone}</div>}
              {s.email && <div>✉ {s.email}</div>}
              {s.default_visit_fee && <div>💰 Default ₹{s.default_visit_fee.toLocaleString()}/case</div>}
            </div>
          </div>
        ))}
      </div>
      {creating && <AddSpecialistModal A={A} show={show} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function AddSpecialistModal({ A, show, onClose, onSaved }: any) {
  const [v, setV] = useState<any>({ is_external: true });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!v.name?.trim()) { show("Name required"); return; }
    setSaving(true);
    try { await api.specCreateSpecialist(v); show("✓ Specialist added"); onSaved(); }
    catch (e: any) { show(e.message); }
    finally { setSaving(false); }
  };
  return (
    <Modal A={A} title="＋ Add Specialist" onClose={onClose}>
      <Inp label="Name *" value={v.name} onChange={(x: string) => setV({ ...v, name: x })} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Inp label="Specialization" value={v.specialization} onChange={(x: string) => setV({ ...v, specialization: x })} placeholder="Endodontist" />
        <Inp label="Default fee per case (₹)" type="number" value={v.default_visit_fee} onChange={(x: string) => setV({ ...v, default_visit_fee: parseFloat(x) || null })} placeholder="500" />
        <Inp label="Phone" value={v.phone} onChange={(x: string) => setV({ ...v, phone: x })} />
        <Inp label="WhatsApp" value={v.whatsapp_number} onChange={(x: string) => setV({ ...v, whatsapp_number: x })} />
        <Inp label="Email" value={v.email} onChange={(x: string) => setV({ ...v, email: x })} />
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 13, fontWeight: 700, color: INK }}>
        <input type="checkbox" checked={!!v.is_external} onChange={e => setV({ ...v, is_external: e.target.checked })} />
        Visiting (external) specialist
      </label>
      <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={save} disabled={saving} style={btn(A)}>{saving ? "Saving…" : "💾 Save"}</button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// EXPORTABLE: AssignSpecialistButton — mount inside appointment modal
// ════════════════════════════════════════════════════════════════════
export function AssignSpecialistButton({ appointment, accent, show, onAssigned }: { appointment: any; accent: string; show: (m: string) => void; onAssigned?: () => void }) {
  const A = accent;
  const [open, setOpen] = useState(false);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>(appointment?.specialist_id || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) api.specListSpecialists().then(setSpecialists).catch(() => {}); }, [open]);

  const assign = async () => {
    if (!selected) { show("Pick a specialist"); return; }
    setSaving(true);
    try {
      const r: any = await api.specAssign(appointment.id, { specialist_id: selected, notes: notes || undefined });
      show("✓ Specialist assigned");
      if (r.whatsapp_link) {
        if (confirm(`Notify ${r.specialist?.name} via WhatsApp now?`)) {
          window.open(r.whatsapp_link, "_blank");
        }
      }
      setOpen(false);
      onAssigned?.();
    } catch (e: any) { show(e.message); }
    finally { setSaving(false); }
  };

  const unassign = async () => {
    if (!confirm("Remove specialist assignment?")) return;
    try { await api.specUnassign(appointment.id); show("✓ Removed"); setOpen(false); onAssigned?.(); }
    catch (e: any) { show(e.message); }
  };

  const currentSpecName = appointment?.specialist_name;

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        background: currentSpecName ? `${A}15` : "#fff",
        color: currentSpecName ? A : MUTE,
        border: `1.5px solid ${currentSpecName ? A : LINE}`,
        borderRadius: 10, padding: "6px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
      }}>
        {currentSpecName ? `👨‍⚕️ ${currentSpecName}` : "＋ Assign Specialist"}
      </button>
      {open && (
        <Modal A={A} title="Assign Specialist" onClose={() => setOpen(false)}>
          <Inp label="Specialist *" type="select" value={selected} onChange={setSelected}
            options={[["", "— Pick —"], ...specialists.map((s: any) => [s.id, `${s.name}${s.specialization ? ` · ${s.specialization}` : ""}`])]} />
          <Inp label="Notes for specialist" value={notes} onChange={setNotes} placeholder="Brief context for the case" multiline />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
            {currentSpecName ? (
              <button onClick={unassign} style={{ ...btnGhost, color: "#DC2626", borderColor: "#FCA5A5" }}>✕ Unassign</button>
            ) : <div />}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setOpen(false)} style={btnGhost}>Cancel</button>
              <button onClick={assign} disabled={saving} style={btn(A)}>{saving ? "Assigning…" : "✓ Assign + Notify"}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Small reusable bits
// ════════════════════════════════════════════════════════════════════
function Inp({ label, value, onChange, type, multiline, placeholder, options }: any) {
  if (type === "select") {
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={lbl}>{label}</label>
        <select value={value ?? ""} onChange={e => onChange(e.target.value)} style={inp}>
          {(options || []).map(([v, l]: any) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
    );
  }
  const I: any = multiline ? "textarea" : "input";
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={lbl}>{label}</label>
      <I type={type || "text"} value={value ?? ""} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} rows={multiline ? 2 : undefined}
        style={{ ...inp, ...(multiline ? { resize: "vertical" as const } : {}) }} />
    </div>
  );
}

function Modal({ children, onClose, title, A, wide }: any) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed" as const, inset: 0, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 22, maxWidth: wide ? 720 : 520, width: "100%", maxHeight: "90vh", overflow: "auto" as const, boxShadow: "0 30px 80px rgba(15,23,42,.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: INK }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, cursor: "pointer", color: MUTE }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
