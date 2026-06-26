"use client";
/**
 * components/BulkWhatsApp.tsx — Bundle Q+
 *
 * Select multiple patients → pick template → blast.
 * Supports up to 500 recipients per batch.
 *
 * For click2chat transport, the result includes wa.me URLs that must be
 * clicked manually — we open them in tabs (with a guard for the browser
 * popup blocker).
 */

import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";

export default function BulkWhatsApp({
  staff, show, accent = A,
}: { staff: any; show: (m: string) => void; accent?: string }) {
  const clinicId = staff?.clinic_id;

  // 1. Pick patients
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingPatients, setLoadingPatients] = useState(true);

  // 2. Pick template
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateKey, setTemplateKey] = useState<string>("");
  const [bodyOverride, setBodyOverride] = useState<string>("");
  const [usingOverride, setUsingOverride] = useState(false);
  const [commonVars, setCommonVars] = useState<Record<string, string>>({});

  // 3. Send + results
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  // Load patients
  useEffect(() => {
    if (!clinicId) return;
    (async () => {
      setLoadingPatients(true);
      try {
        const d = await api.pdbList({ clinic_id: clinicId, limit: 500 });
        setPatients(d.patients || []);
      } catch (e: any) {
        show("Error loading patients: " + e.message);
      } finally { setLoadingPatients(false); }
    })();
  }, [clinicId]); // eslint-disable-line

  // Load templates
  useEffect(() => {
    if (!clinicId) return;
    (async () => {
      try {
        const d = await api.templatesList(clinicId);
        setTemplates(d.templates || []);
      } catch (e: any) { show("Error loading templates: " + e.message); }
    })();
  }, [clinicId]); // eslint-disable-line

  // Filtered patients
  const filtered = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.phone || "").includes(q)
    );
  }, [patients, patientSearch]);

  // Selected template object
  const tpl = templates.find(t => t.template_key === templateKey);
  const placeholders = useMemo(() => {
    const text = usingOverride ? bodyOverride : (tpl?.body || "");
    const m = text.matchAll(/\{([a-zA-Z0-9_]+)\}/g);
    return Array.from(new Set(Array.from(m, (x: any) => x[1])));
  }, [tpl, bodyOverride, usingOverride]);

  // Selection helpers
  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  };
  const selectAll = () => setSelected(new Set(filtered.map(p => p.id)));
  const clearAll = () => setSelected(new Set());

  const selectedPatients = patients.filter(p => selected.has(p.id) && p.phone);
  const skippedNoPhone = patients.filter(p => selected.has(p.id) && !p.phone).length;

  const send = async () => {
    if (selectedPatients.length === 0) { show("No recipients with phone numbers"); return; }
    if (!templateKey && !bodyOverride.trim()) { show("Pick a template or write a custom message"); return; }
    if (selectedPatients.length > 500) { show("Maximum 500 recipients per batch"); return; }

    setSending(true); setResults(null);
    try {
      const recipients = selectedPatients.map(p => ({
        recipient_id: p.id,
        recipient_kind: "patient",
        recipient_name: p.name,
        recipient_phone: p.phone,
        variables: {
          patient_name: p.name || "",
          patient_phone: p.phone || "",
        },
      }));
      const body: any = {
        clinic_id: clinicId,
        common_variables: commonVars,
        recipients,
      };
      if (usingOverride && bodyOverride.trim()) body.body_override = bodyOverride;
      else body.template_key = templateKey;

      const r = await api.msgBulk(body);
      setResults(r);
      const pending = (r.results || []).filter((x: any) => x.status === "manual_pending").length;
      show(pending > 0
        ? `✓ ${r.sent} ready · ${pending} WhatsApp link(s) to open · ${r.failed} failed`
        : `✓ ${r.sent} sent · ${r.failed} failed`);

      // For click2chat: open the first 5 wa.me URLs (browser blocks > ~5)
      const links = (r.results || []).filter((x: any) => x.wa_url).slice(0, 5);
      links.forEach((x: any, i: number) => setTimeout(() => window.open(x.wa_url, "_blank"), i * 250));
      if ((r.results || []).filter((x: any) => x.wa_url).length > 5) {
        show("Opened first 5 WhatsApp links. Click 'Open all' in results to send the rest.");
      }
    } catch (e: any) {
      show("Error: " + e.message);
    } finally { setSending(false); }
  };

  const openAllPending = () => {
    if (!results) return;
    const links = (results.results || []).filter((x: any) => x.wa_url);
    links.forEach((x: any, i: number) => setTimeout(() => window.open(x.wa_url, "_blank"), i * 250));
  };

  return (
    <div>
      <h1 style={{ margin: "0 0 8px", fontSize: 30 }}>📨 Bulk WhatsApp Sender</h1>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: MUTE, maxWidth: 720, lineHeight: 1.5 }}>
        Send the same message to many patients at once — reminders, follow-ups, announcements, festival greetings.
        Pick a saved template or write custom text. With click-to-chat mode, WhatsApp links open for you to confirm each send.
      </p>

      {templates.length === 0 && !loadingPatients && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: "#FEF3C7", color: "#92400E", fontSize: 13 }}>
          No message templates loaded — use <b>Custom text</b> or add templates in Settings → Messages.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* LEFT: Patient picker */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" as const, marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>1. Pick recipients ({selected.size})</h3>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={selectAll} style={btnGhost}>All</button>
              <button onClick={clearAll} style={btnGhost}>Clear</button>
            </div>
          </div>
          <input
            value={patientSearch}
            onChange={e => setPatientSearch(e.target.value)}
            placeholder="🔎 Search name or phone…"
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <div style={{
            maxHeight: 380, overflow: "auto" as const, border: `1px solid ${LINE}`,
            borderRadius: 10, background: "#fff",
          }}>
            {loadingPatients && <div style={{ padding: 20, color: MUTE, textAlign: "center" as const }}>⏳ Loading…</div>}
            {!loadingPatients && filtered.length === 0 && (
              <div style={{ padding: 20, color: MUTE, textAlign: "center" as const }}>No patients</div>
            )}
            {filtered.map(p => (
              <label key={p.id} style={{
                display: "flex", alignItems: "center" as const, padding: "10px 12px",
                borderBottom: `1px solid ${LINE}`, cursor: "pointer",
                background: selected.has(p.id) ? `${accent}10` : "#fff",
              }}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)}
                  style={{ marginRight: 10, accentColor: accent }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK, overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: MUTE }}>
                    {p.phone || <span style={{ color: "#EF4444" }}>⚠ no phone</span>}
                    {(p.last_visit_date || p.last_visit) && ` · last visit ${new Date(p.last_visit_date || p.last_visit).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {skippedNoPhone > 0 && (
            <div style={{ fontSize: 11, color: "#B45309", marginTop: 6 }}>
              ⚠ {skippedNoPhone} selected patients have no phone — they'll be skipped.
            </div>
          )}
        </div>

        {/* RIGHT: Message + send */}
        <div style={card}>
          <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>2. Message</h3>

          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button onClick={() => setUsingOverride(false)} style={pillBtn(!usingOverride, accent)}>Template</button>
            <button onClick={() => setUsingOverride(true)} style={pillBtn(usingOverride, accent)}>Custom text</button>
          </div>

          {!usingOverride && (
            <>
              <select value={templateKey} onChange={e => setTemplateKey(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}>
                <option value="">— Pick a template —</option>
                {templates.map(t => (
                  <option key={t.template_key} value={t.template_key}>{t.category} · {t.label}</option>
                ))}
              </select>
              {tpl && (
                <div style={{
                  background: "#F8FAFC", borderRadius: 10, padding: 12, marginBottom: 10,
                  border: `1px solid ${LINE}`, fontSize: 12, color: INK, whiteSpace: "pre-wrap" as const, lineHeight: 1.5,
                }}>{tpl.body}</div>
              )}
            </>
          )}

          {usingOverride && (
            <textarea value={bodyOverride} onChange={e => setBodyOverride(e.target.value)}
              placeholder="Hi {patient_name}, ..."
              style={{ ...inputStyle, minHeight: 120, resize: "vertical" as const, marginBottom: 10, fontFamily: "inherit" }} />
          )}

          {/* Placeholder helpers */}
          {placeholders.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, marginBottom: 5, letterSpacing: 0.5 }}>VARIABLES</div>
              {placeholders.map(p => {
                if (p === "patient_name" || p === "patient_phone") {
                  return <code key={p} style={{ ...code, background: "#D1FAE5", color: "#065F46", marginRight: 4 }}>{`{${p}}`} auto</code>;
                }
                return (
                  <div key={p} style={{ marginBottom: 5 }}>
                    <code style={{ ...code, marginRight: 6 }}>{`{${p}}`}</code>
                    <input
                      value={commonVars[p] || ""}
                      onChange={e => setCommonVars({ ...commonVars, [p]: e.target.value })}
                      placeholder={`Value for ${p}`}
                      style={{ ...inputStyle, display: "inline-block", width: "auto", padding: "5px 9px", fontSize: 12 }} />
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={send} disabled={sending || selectedPatients.length === 0}
            style={{ ...btnPrimary(accent), width: "100%", padding: 14, fontSize: 14, marginTop: 6 }}>
            {sending ? "Sending…" : `🚀 Send to ${selectedPatients.length} ${selectedPatients.length === 1 ? "patient" : "patients"}`}
          </button>

          {results && (
            <div style={{
              marginTop: 14, padding: 12, borderRadius: 10,
              background: results.failed > 0 ? "#FEF3C7" : "#D1FAE5",
              border: `1px solid ${results.failed > 0 ? "#FCD34D" : "#10B981"}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>
                ✓ {results.sent} sent · ❌ {results.failed} failed · Total {results.total}
              </div>
              {(results.results || []).some((x: any) => x.wa_url) && (
                <button onClick={openAllPending} style={{ ...btnSecondary, marginTop: 8, fontSize: 12, padding: "6px 12px" }}>
                  📂 Open all WhatsApp links
                </button>
              )}
              <div style={{ maxHeight: 200, overflow: "auto" as const, marginTop: 10, fontSize: 12 }}>
                {(results.results || []).map((r: any, i: number) => (
                  <div key={i} style={{
                    padding: "5px 8px", borderBottom: `1px solid ${LINE}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center" as const, gap: 6,
                  }}>
                    <span>{r.name || r.phone}</span>
                    <span style={{ fontSize: 11, color: r.status === "failed" ? "#EF4444" : r.status === "sent" ? "#10B981" : "#F59E0B" }}>
                      {r.status}
                      {r.wa_url && <button onClick={() => window.open(r.wa_url, "_blank")}
                        style={{ marginLeft: 6, border: "none", background: accent, color: "#fff",
                          padding: "2px 8px", borderRadius: 6, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Open</button>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const card: any = {
  background: "#fff", borderRadius: 14, padding: 16, border: `1px solid ${LINE}`,
};
const inputStyle: any = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${LINE}`, fontSize: 14, outline: "none",
  boxSizing: "border-box" as const, fontFamily: "inherit",
};
const btnPrimary = (accent: string): any => ({
  background: accent, color: "#fff", border: "none", padding: "10px 16px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
});
const btnSecondary: any = {
  background: "#fff", color: INK, border: `1.5px solid ${LINE}`, padding: "8px 14px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const btnGhost: any = {
  background: "transparent", color: MUTE, border: `1px solid ${LINE}`, padding: "5px 10px",
  borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
};
const pillBtn = (active: boolean, accent: string): any => ({
  border: active ? `2px solid ${accent}` : `1.5px solid ${LINE}`,
  background: active ? `${accent}14` : "#fff",
  color: active ? accent : MUTE, padding: "6px 13px", borderRadius: 999,
  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});
const code: any = {
  fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11,
  background: "#F1F5F9", color: "#1E293B", padding: "2px 6px", borderRadius: 5,
  display: "inline-block", marginBottom: 4,
};
