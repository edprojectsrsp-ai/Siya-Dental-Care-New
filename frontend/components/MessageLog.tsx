"use client";
/**
 * components/MessageLog.tsx — Bundle Q+
 *
 * Browse every message the system has sent, queued, or failed to send.
 * Filter by template, recipient kind, status, trigger. Resend failed messages.
 * Top stats panel shows live counts.
 */

import { useEffect, useState } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";

export default function MessageLog({
  staff, show, accent = A,
}: { staff: any; show: (m: string) => void; accent?: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("");
  const [days, setDays] = useState<number>(30);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [flushing, setFlushing] = useState(false);

  const clinicId = staff?.clinic_id;

  const loadMessages = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const opts: any = { clinic_id: clinicId, days, limit: 200 };
      if (tab === "auto")     opts.trigger = "auto";
      if (tab === "manual")   opts.trigger = "manual";
      if (tab === "failed")   opts.status = "failed";
      if (tab === "queued")   opts.status = "queued";
      if (templateFilter)     opts.template_key = templateFilter;
      const d = await api.msgLog(opts);
      setMessages(d.messages || []);
    } catch (e: any) {
      show("Error loading log: " + e.message);
    } finally { setLoading(false); }
  };

  const loadStats = async () => {
    if (!clinicId) return;
    try {
      const s = await api.msgStats(clinicId);
      setStats(s);
    } catch {}
  };

  useEffect(() => { loadMessages(); loadStats(); }, [clinicId, tab, templateFilter, days]); // eslint-disable-line

  const flush = async () => {
    setFlushing(true);
    try {
      const r = await api.msgFlush();
      show(`✓ Flushed ${r.sent} sent, ${r.failed} failed`);
      loadMessages(); loadStats();
    } catch (e: any) { show("Error: " + e.message); }
    finally { setFlushing(false); }
  };

  const resend = async (m: any) => {
    try {
      const r = await api.msgSend({
        clinic_id: clinicId,
        template_key: m.template_key,
        body_override: m.body,
        recipient_kind: m.recipient.kind,
        recipient_id: m.recipient.id,
        recipient_phone: m.recipient.phone,
        recipient_name: m.recipient.name,
        appointment_id: m.appointment_id,
        lab_order_id: m.lab_order_id,
      });
      show(r.status === "sent" || r.status === "manual_pending" ? "✓ Resent" : `Status: ${r.status}`);
      if (r.wa_url) window.open(r.wa_url, "_blank");
      loadMessages();
    } catch (e: any) { show("Error: " + e.message); }
  };

  const toggleExpand = (id: string) => {
    const n = new Set(expanded);
    if (n.has(id)) n.delete(id); else n.add(id);
    setExpanded(n);
  };

  // Collect distinct template_keys for filter dropdown
  const allKeys = Array.from(new Set(messages.map(m => m.template_key).filter(Boolean)));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, flexWrap: "wrap" as const, gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>💬 Message Log</h1>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={flush} disabled={flushing} style={btnSecondary}>
            {flushing ? "Flushing…" : "⚡ Send queued now"}
          </button>
          <button onClick={() => { loadMessages(); loadStats(); }} style={btnGhost}>↻ Refresh</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
          <Stat label="Today"          value={stats.today_count} color={accent} />
          <Stat label="This week"      value={stats.week_count} color="#0EA5E9" />
          <Stat label="Total sent"     value={stats.total_sent} color="#10B981" />
          <Stat label="Auto-sent"      value={stats.auto_sent} color="#8B5CF6" />
          <Stat label="Manual"         value={stats.manual_sent} color="#F59E0B" />
          <Stat label="Queued"         value={stats.queued} color="#3B82F6" />
          <Stat label="Failed"         value={stats.failed} color="#EF4444" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" as const }}>
        {[
          { v: "all", l: "All" },
          { v: "auto", l: "🤖 Automated" },
          { v: "manual", l: "👤 Manual" },
          { v: "queued", l: "⏳ Queued" },
          { v: "failed", l: "❌ Failed" },
        ].map(o => (
          <button key={o.v} onClick={() => setTab(o.v)} style={pillBtn(tab === o.v, accent)}>{o.l}</button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" as const, alignItems: "center" as const }}>
        <select value={templateFilter} onChange={e => setTemplateFilter(e.target.value)} style={selectStyle}>
          <option value="">All templates</option>
          {allKeys.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={days} onChange={e => setDays(parseInt(e.target.value))} style={selectStyle}>
          <option value={1}>Today only</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <span style={{ fontSize: 12, color: MUTE }}>{messages.length} messages</span>
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center" as const, color: MUTE }}>⏳ Loading…</div>}
      {!loading && messages.length === 0 && (
        <div style={{ padding: 40, textAlign: "center" as const, color: MUTE, background: "#fff", borderRadius: 14 }}>
          No messages match the filter.
        </div>
      )}

      {messages.map(m => (
        <div key={m.id} style={{
          background: "#fff", borderRadius: 12, padding: 12, marginBottom: 6,
          border: `1px solid ${m.status === "failed" ? "#FCA5A5" : LINE}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" as const }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" as const, flexWrap: "wrap" as const, marginBottom: 4 }}>
                <StatusBadge status={m.status} />
                <TriggerBadge trigger={m.trigger} />
                {m.template_key && <code style={code}>{m.template_key}</code>}
                <span style={{ fontSize: 11, color: MUTE }}>via {m.transport}</span>
              </div>
              <div style={{ fontSize: 13, color: INK }}>
                <b>{m.recipient.name || "—"}</b>
                <span style={{ color: MUTE }}> · {m.recipient.kind} · {m.recipient.phone}</span>
              </div>
              <div style={{
                fontSize: 12, color: MUTE, marginTop: 6, lineHeight: 1.4,
                whiteSpace: "pre-wrap" as const,
                maxHeight: expanded.has(m.id) ? "none" : 50, overflow: "hidden" as const,
              }}>{m.body}</div>
              {m.body.length > 90 && (
                <button onClick={() => toggleExpand(m.id)} style={{
                  border: "none", background: "transparent", color: accent,
                  fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0, marginTop: 4,
                  fontFamily: "inherit",
                }}>{expanded.has(m.id) ? "Show less ▲" : "Show full message ▼"}</button>
              )}
              {m.error_text && (
                <div style={{
                  marginTop: 6, padding: 6, background: "#FEE2E2", borderRadius: 6,
                  fontSize: 11, color: "#991B1B",
                }}>⚠ {m.error_text}</div>
              )}
            </div>
            <div style={{ textAlign: "right" as const, fontSize: 11, color: MUTE, minWidth: 130 }}>
              <div>{timeAgo(m.created_at)}</div>
              {m.scheduled_for && m.status === "queued" && (
                <div style={{ color: "#3B82F6", marginTop: 2 }}>📅 {new Date(m.scheduled_for).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              )}
              {m.sent_at && (
                <div style={{ color: "#10B981", marginTop: 2 }}>✓ {timeAgo(m.sent_at)}</div>
              )}
              {m.status === "failed" && (
                <button onClick={() => resend(m)} style={{
                  marginTop: 6, background: accent, color: "#fff", border: "none",
                  padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>🔁 Resend</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Small components ──────────────────────────────────────────
function Stat({ label, value, color }: any) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 11, border: `1px solid ${LINE}` }}>
      <div style={{ fontSize: 10, color: MUTE, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>{value ?? 0}</div>
    </div>
  );
}
function StatusBadge({ status }: any) {
  const m: any = {
    sent:           { c: "#10B981", l: "SENT" },
    manual_pending: { c: "#F59E0B", l: "WA OPEN" },
    queued:         { c: "#3B82F6", l: "QUEUED" },
    failed:         { c: "#EF4444", l: "FAILED" },
  };
  const t = m[status] || { c: MUTE, l: status?.toUpperCase() };
  return <span style={{ background: `${t.c}1A`, color: t.c, padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 800 }}>{t.l}</span>;
}
function TriggerBadge({ trigger }: any) {
  const m: any = {
    auto:    { e: "🤖", c: "#8B5CF6" },
    manual:  { e: "👤", c: "#F59E0B" },
    event:   { e: "⚡", c: "#0EA5E9" },
    webhook: { e: "🔌", c: "#64748B" },
  };
  const t = m[trigger] || { e: "?", c: MUTE };
  return <span style={{ background: `${t.c}1A`, color: t.c, padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 800 }}>{t.e} {trigger}</span>;
}
function timeAgo(s?: string) {
  if (!s) return "";
  const diff = Date.now() - new Date(s).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
const code: any = {
  fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10,
  background: "#F1F5F9", color: "#1E293B", padding: "1px 5px", borderRadius: 4,
};
const btnSecondary: any = {
  background: "#fff", color: INK, border: `1.5px solid ${LINE}`, padding: "8px 14px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const btnGhost: any = {
  background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, padding: "8px 14px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const pillBtn = (active: boolean, accent: string): any => ({
  border: active ? `2px solid ${accent}` : `1.5px solid ${LINE}`,
  background: active ? `${accent}14` : "#fff",
  color: active ? accent : MUTE, padding: "6px 13px", borderRadius: 999,
  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});
const selectStyle: any = {
  padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${LINE}`,
  fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff",
};
