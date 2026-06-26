"use client";
/**
 * components/CountersDashboard.tsx — Bundle R
 *
 * Live communication metrics dashboard.
 * Matches the exact counter table from Dr. Madhu's WhatsApp matrix spec:
 *   confirmations sent, reminders sent, follow-up reminders sent,
 *   receipts sent, rating requests sent, rating reminders sent,
 *   rewards generated, rewards redeemed, lab orders sent,
 *   lab reminders sent, specialist messages sent, doctor digest sent,
 *   nurse digest sent, manual messages sent, bulk messages sent,
 *   failed messages, click-to-chat pending.
 *
 * Each tile is grouped by purpose with color coding.
 */

import { useEffect, useState } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B";
const A_DEEP = "#0A5C5B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const BG = "#F8FAFC";

const GROUPS = [
  {
    title: "📞 Appointment communications",
    items: [
      { key: "confirmations_sent",      label: "Confirmations sent",     color: "#10B981" },
      { key: "reminders_sent",          label: "Reminders sent",         color: "#3B82F6" },
      { key: "followup_reminders_sent", label: "Follow-up reminders sent", color: "#0EA5E9" },
    ],
  },
  {
    title: "💰 Billing & rewards",
    items: [
      { key: "receipts_sent",        label: "Receipts sent",        color: "#10B981" },
      { key: "rating_requests_sent", label: "Rating requests sent", color: "#F59E0B" },
      { key: "rating_reminders_sent", label: "Rating reminders sent", color: "#F59E0B" },
      { key: "rewards_generated",    label: "Rewards generated",    color: "#A855F7" },
      { key: "rewards_redeemed",     label: "Rewards redeemed",     color: "#7C3AED" },
    ],
  },
  {
    title: "🦷 Lab & specialist",
    items: [
      { key: "lab_orders_sent",          label: "Lab orders sent",       color: "#0EA5E9" },
      { key: "lab_reminders_sent",       label: "Lab reminders sent",    color: "#F97316" },
      { key: "specialist_messages_sent", label: "Specialist messages",   color: "#A855F7" },
    ],
  },
  {
    title: "📋 Daily digests",
    items: [
      { key: "doctor_digest_sent", label: "Doctor digests sent", color: "#10B981" },
      { key: "nurse_digest_sent",  label: "Nurse digests sent",  color: "#10B981" },
    ],
  },
  {
    title: "💬 Manual & broadcast",
    items: [
      { key: "manual_messages_sent", label: "Manual messages sent", color: A },
      { key: "bulk_messages_sent",   label: "Bulk messages sent",   color: A },
    ],
  },
  {
    title: "⚠ Failures & pending",
    items: [
      { key: "failed_messages",       label: "Failed messages",          color: "#EF4444" },
      { key: "click_to_chat_pending", label: "Click-to-chat pending",    color: "#F59E0B" },
    ],
  },
];

export default function CountersDashboard({ staff, show, accent = A }: any) {
  const [counters, setCounters] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"today" | "week" | "month" | "all">("month");

  const load = async () => {
    if (!staff?.clinic_id) return;
    setLoading(true);
    try {
      const d = await api.apiFetch?.(`/api/counters?clinic_id=${staff.clinic_id}`);
      setCounters(d);
    } catch (e: any) { show("Error: " + e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [staff?.clinic_id]); // eslint-disable-line

  if (loading || !counters) {
    return <div style={loadingDiv}>⏳ Loading counters…</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" as const, marginBottom: 14, flexWrap: "wrap" as const, gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>📊 Communication Counters</h1>
        <button onClick={load} style={btnGhost}>↻ Refresh</button>
      </div>

      {/* Time window selector */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 18, padding: 12, background: "#fff",
        borderRadius: 14, border: `1px solid ${LINE}`, alignItems: "center" as const, flexWrap: "wrap" as const,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: MUTE, marginRight: 4 }}>WINDOW:</span>
        {[
          { v: "today" as const, l: "Today",        c: counters.today_count },
          { v: "week" as const,  l: "Last 7 days",  c: counters.week_count },
          { v: "month" as const, l: "Last 30 days", c: counters.month_count },
          { v: "all" as const,   l: "All-time",     c: null },
        ].map(o => (
          <button key={o.v} onClick={() => setRange(o.v)} style={pillBtn(range === o.v)}>
            {o.l} {o.c !== null && <span style={{ marginLeft: 4, color: range === o.v ? A_DEEP : MUTE, fontWeight: 800 }}>· {o.c}</span>}
          </button>
        ))}
      </div>

      {/* Hero — total */}
      <div style={{
        background: `linear-gradient(135deg, ${A}, ${A_DEEP})`, color: "#fff",
        borderRadius: 18, padding: 22, marginBottom: 18,
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14,
      }}>
        <HeroStat label="Today" v={counters.today_count} />
        <HeroStat label="This week" v={counters.week_count} />
        <HeroStat label="This month" v={counters.month_count} />
        <HeroStat label="Failed" v={counters.failed_messages} alert={counters.failed_messages > 0} />
      </div>

      {/* Grouped sections */}
      {GROUPS.map(group => (
        <section key={group.title} style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, color: A_DEEP, fontWeight: 800, letterSpacing: 0.3 }}>{group.title}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {group.items.map(item => (
              <CounterTile
                key={item.key}
                label={item.label}
                value={counters[item.key] || 0}
                color={item.color}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CounterTile({ label, value, color }: any) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: 14,
      border: `1px solid ${LINE}`, borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, color: MUTE, fontWeight: 700, letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: INK, marginTop: 3 }}>{value.toLocaleString()}</div>
    </div>
  );
}

function HeroStat({ label, v, alert }: any) {
  return (
    <div>
      <div style={{
        fontSize: 11, color: alert ? "#FECACA" : "#ffffffaa",
        fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" as const,
      }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 900, marginTop: 3, lineHeight: 1 }}>{v.toLocaleString()}</div>
    </div>
  );
}

const btnGhost: any = {
  background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, padding: "8px 14px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const pillBtn = (active: boolean): any => ({
  border: active ? `2px solid ${A}` : `1.5px solid ${LINE}`,
  background: active ? `${A}14` : "#fff",
  color: active ? A_DEEP : MUTE, padding: "6px 13px", borderRadius: 999,
  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});
const loadingDiv: any = {
  padding: 40, textAlign: "center" as const, color: MUTE, fontSize: 14,
};
