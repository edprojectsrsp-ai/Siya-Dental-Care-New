"use client";
/**
 * components/DashboardHome.tsx — Bundle W
 *
 * Real KPI dashboard, SEPARATE from AppointmentHub.
 * Drops into the "dashboard" sidebar item; AppointmentHub stays for the "appointments" item.
 *
 * Pulls from /api/dashboard/* endpoints (dashboard_v2.py).
 *
 * Widgets (toggleable via dashboard_widget_prefs):
 *   1. today_summary       — counts: total / confirmed / in-clinic / unscheduled
 *   2. revenue_pulse       — today/week/month + 14-day sparkline + today by payment mode
 *   3. appt_funnel         — bucket counts (today / tomorrow / week)
 *   4. lab_pipeline        — DB-aligned statuses + overdue
 *   5. outstanding_aging   — 0-7d / 7-30d / 30-60d / 60d+
 *   6. followup_alerts     — overdue follow-ups
 *   7. no_show_30d         — 30-day no-show rate
 *   8. top_procedures      — this month's top
 *   9. reschedule_queue    — pending portal requests (counter)
 *  10. bot_pulse           — last 24h inbound/outbound bot activity
 *  11. reminders_health    — today fired/failed
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import * as api from "@/lib/api";
import RevenueDashboard from "@/components/RevenueDashboard";
import CountersDashboard from "@/components/CountersDashboard";

const TEAL = "#0E7C7B";
const TEAL_DEEP = "#0A5C5B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const BG_SOFT = "#F8FAFC";

const PALETTE = {
  green:  { bg: "#D1FAE5", fg: "#065F46" },
  blue:   { bg: "#DBEAFE", fg: "#1E40AF" },
  amber:  { bg: "#FEF3C7", fg: "#92400E" },
  rose:   { bg: "#FFE4E6", fg: "#9F1239" },
  purple: { bg: "#EDE9FE", fg: "#5B21B6" },
  slate:  { bg: "#F1F5F9", fg: "#334155" },
};

const BUCKET_META: Record<string, { label: string; tone: keyof typeof PALETTE; icon: string }> = {
  unscheduled:  { label: "Unscheduled",  tone: "amber",  icon: "📞" },
  scheduled:    { label: "Scheduled",    tone: "blue",   icon: "📅" },
  rescheduled:  { label: "Rescheduled",  tone: "purple", icon: "🔄" },
  no_answer:    { label: "No answer",    tone: "rose",   icon: "📵" },
  confirmed:    { label: "Confirmed",    tone: "green",  icon: "✅" },
  in_clinic:    { label: "In clinic",    tone: "purple", icon: "🏥" },
  completed:    { label: "Completed",    tone: "green",  icon: "✔️" },
  cancelled:    { label: "Cancelled",    tone: "slate",  icon: "❌" },
  no_show:      { label: "No-show",      tone: "rose",   icon: "🚫" },
};

const LAB_META: Record<string, { label: string; tone: keyof typeof PALETTE }> = {
  pending:   { label: "Pending",   tone: "amber" },
  sent:      { label: "Sent",      tone: "blue" },
  received:  { label: "Received",  tone: "green" },
  fitted:    { label: "Fitted",    tone: "purple" },
};

type InsightsTab = "overview" | "revenue" | "counters";

export default function DashboardHome({
  staff, show, accent = TEAL, onDrillDown,
}: { staff: any; show: (m: string) => void; accent?: string; onDrillDown?: (target: "lab_pay" | "spec_pay") => void }) {
  const clinicId = staff?.clinic_id;
  const [insightsTab, setInsightsTab] = useState<InsightsTab>("overview");
  const [summary, setSummary] = useState<any | null>(null);
  const [revenue, setRevenue] = useState<any | null>(null);
  const [funnel, setFunnel] = useState<any | null>(null);
  const [lab, setLab] = useState<any | null>(null);
  const [aging, setAging] = useState<any | null>(null);
  const [followups, setFollowups] = useState<any | null>(null);
  const [noShow, setNoShow] = useState<any | null>(null);
  const [topProc, setTopProc] = useState<any | null>(null);
  const [botPulse, setBotPulse] = useState<any | null>(null);
  const [reminders, setReminders] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const handle = async <T,>(p: Promise<T>) => { try { return await p; } catch { return null; } };
    const [s, r, f, l, a, fu, ns, tp, bp, rm] = await Promise.all([
      handle(api.dashboardSummary(clinicId)),
      handle(api.dashboardRevenue(clinicId)),
      handle(api.dashboardFunnel(clinicId)),
      handle(api.dashboardLab(clinicId)),
      handle(api.dashboardAging(clinicId)),
      handle(api.dashboardFollowups(clinicId, 10)),
      handle(api.dashboardNoShow(clinicId)),
      handle(api.dashboardTopProc(clinicId)),
      handle(api.dashboardBotPulse(clinicId)),
      handle(api.dashboardRemindersHealth(clinicId)),
    ]);
    setSummary(s); setRevenue(r); setFunnel(f); setLab(l); setAging(a);
    setFollowups(fu); setNoShow(ns); setTopProc(tp); setBotPulse(bp); setReminders(rm);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 60_000);  // refresh every minute
    return () => clearInterval(t);
  }, [load]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5)  return "Working late";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  }, []);

  if (loading && !summary && insightsTab === "overview") {
    return <div style={{ padding: 60, textAlign: "center", color: MUTE }}>⏳ Loading dashboard…</div>;
  }

  const tabBtn = (id: InsightsTab, label: string) => (
    <button key={id} onClick={() => setInsightsTab(id)} style={{
      border: insightsTab === id ? `2px solid ${accent}` : `1px solid ${LINE}`,
      background: insightsTab === id ? `${accent}15` : "#fff",
      color: insightsTab === id ? accent : MUTE,
      borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700,
      cursor: "pointer", fontFamily: "inherit",
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, color: INK }}>
            {greeting}, {staff?.name?.split(" ")?.[0] || "Doctor"} 👋
          </h1>
          <div style={{ color: MUTE, fontSize: 13, marginTop: 4 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        {insightsTab === "overview" && (
          <button onClick={load}
            style={{ border: `1px solid ${LINE}`, background: "#fff", padding: "6px 12px",
              borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", color: MUTE,
              fontFamily: "inherit" }}>
            ↻ Refresh
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabBtn("overview", "📊 Overview")}
        {tabBtn("revenue", "📈 Revenue")}
        {tabBtn("counters", "💬 Counters")}
      </div>

      {insightsTab === "revenue" && (
        <RevenueDashboard clinicId={clinicId} accent={accent} onDrillDown={onDrillDown} />
      )}
      {insightsTab === "counters" && (
        <CountersDashboard staff={staff} show={show} accent={accent} />
      )}

      {insightsTab === "overview" && (<>

      {/* 1. TODAY SUMMARY — 5 KPI tiles */}
      {summary && (
        <Row>
          <KpiTile
            label="Today's appointments"
            value={summary.appts_today_total}
            sub={`${summary.appts_today_confirmed || 0} confirmed`}
            icon="📅" tone="blue"
          />
          <KpiTile
            label="In clinic now"
            value={summary.appts_today_in_clinic}
            sub={`${summary.appts_today_completed || 0} done today`}
            icon="🏥" tone="purple"
          />
          <KpiTile
            label="Today's revenue"
            value={`₹${Number(summary.revenue_today || 0).toLocaleString()}`}
            icon="💰" tone="green"
          />
          <KpiTile
            label="Outstanding"
            value={`₹${Number(summary.outstanding_total || 0).toLocaleString()}`}
            tone="rose" icon="⏳"
          />
          <KpiTile
            label="Unscheduled (7d)"
            value={summary.unscheduled_recent_count}
            sub={summary.reschedule_pending_count ? `${summary.reschedule_pending_count} portal reqs` : undefined}
            tone="amber" icon="📞"
          />
        </Row>
      )}

      {/* 2. REVENUE PULSE */}
      {revenue && (
        <Card title="💹 Revenue pulse" right={
          <div style={{ display: "flex", gap: 10, fontSize: 11, color: MUTE }}>
            <span><b style={{ color: INK }}>{revenue.totals?.today_count || 0}</b> today</span>
            <span>·</span>
            <span><b style={{ color: INK }}>{revenue.totals?.week_count || 0}</b> this week</span>
            <span>·</span>
            <span><b style={{ color: INK }}>{revenue.totals?.month_count || 0}</b> this month</span>
          </div>
        }>
          <Row>
            <RevTile label="Today" value={revenue.totals?.today_total} tone="green" />
            <RevTile label="This week" value={revenue.totals?.week_total} tone="blue" />
            <RevTile label="This month" value={revenue.totals?.month_total} tone="purple" />
          </Row>
          <div style={{ marginTop: 12 }}>
            <Sparkline data={revenue.sparkline || []} accent={accent} />
          </div>
          {revenue.today_by_mode?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {revenue.today_by_mode.map((m: any) => (
                <span key={m.mode} style={{
                  padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: BG_SOFT, color: INK, border: `1px solid ${LINE}`,
                }}>
                  {m.mode}: ₹{Number(m.amount).toLocaleString()}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* 3. APPT FUNNEL */}
        {funnel?.funnel && (
          <Card title="📊 Appointment funnel" sub="Buckets for today / tomorrow / next 7 days">
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: MUTE, textAlign: "left", fontSize: 11, textTransform: "uppercase" }}>
                  <th style={{ padding: "6px 4px" }}>Bucket</th>
                  <th style={{ padding: "6px 4px", textAlign: "right" }}>Today</th>
                  <th style={{ padding: "6px 4px", textAlign: "right" }}>Tom.</th>
                  <th style={{ padding: "6px 4px", textAlign: "right" }}>Week</th>
                </tr>
              </thead>
              <tbody>
                {funnel.funnel.map((b: any) => {
                  const meta = BUCKET_META[b.bucket] || { label: b.bucket, tone: "slate", icon: "•" };
                  const p = PALETTE[meta.tone];
                  return (
                    <tr key={b.bucket} style={{ borderTop: `1px solid ${LINE}` }}>
                      <td style={{ padding: "8px 4px" }}>
                        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                          <span>{meta.icon}</span>
                          <span style={{
                            padding: "2px 8px", borderRadius: 999, background: p.bg, color: p.fg,
                            fontWeight: 700, fontSize: 11,
                          }}>{meta.label}</span>
                        </span>
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 700 }}>{b.today || 0}</td>
                      <td style={{ padding: "8px 4px", textAlign: "right", color: MUTE }}>{b.tomorrow || 0}</td>
                      <td style={{ padding: "8px 4px", textAlign: "right", color: MUTE }}>{b.week || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        {/* 4. LAB PIPELINE */}
        {lab && (
          <Card title="🦷 Lab pipeline" sub="DB-aligned statuses">
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: MUTE, textAlign: "left", fontSize: 11, textTransform: "uppercase" }}>
                  <th style={{ padding: "6px 4px" }}>Status</th>
                  <th style={{ padding: "6px 4px", textAlign: "right" }}>Total</th>
                  <th style={{ padding: "6px 4px", textAlign: "right" }}>Overdue</th>
                  <th style={{ padding: "6px 4px", textAlign: "right" }}>Due wk</th>
                </tr>
              </thead>
              <tbody>
                {(lab.by_status || []).map((s: any) => {
                  const meta = LAB_META[s.status] || { label: s.status, tone: "slate" };
                  const p = PALETTE[meta.tone];
                  return (
                    <tr key={s.status} style={{ borderTop: `1px solid ${LINE}` }}>
                      <td style={{ padding: "8px 4px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 999, background: p.bg, color: p.fg,
                          fontWeight: 700, fontSize: 11,
                        }}>{meta.label}</span>
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 700 }}>{s.n}</td>
                      <td style={{ padding: "8px 4px", textAlign: "right",
                                   color: s.overdue ? "#9F1239" : MUTE,
                                   fontWeight: s.overdue ? 700 : 400 }}>
                        {s.overdue || 0}
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right", color: MUTE }}>{s.due_week || 0}</td>
                    </tr>
                  );
                })}
                {(!lab.by_status || lab.by_status.length === 0) && (
                  <tr><td colSpan={4} style={{ padding: 12, color: MUTE, textAlign: "center" }}>No active lab orders</td></tr>
                )}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: MUTE, marginTop: 8 }}>
              Completed in last 30 days: <b style={{ color: INK }}>{lab.completed_30d?.n_completed || 0}</b>
              {lab.completed_30d?.total_cost > 0 && ` (₹${Number(lab.completed_30d.total_cost).toLocaleString()})`}
            </div>
          </Card>
        )}

        {/* 5. OUTSTANDING AGING */}
        {aging?.aging && (
          <Card title="⏳ Outstanding aging" sub="By plan age">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {aging.aging.map((a: any) => (
                <div key={a.bucket} style={{
                  background: a.bucket === "60d+" ? "#FFE4E6" : a.bucket === "30-60d" ? "#FEF3C7" : BG_SOFT,
                  borderRadius: 10, padding: 10, textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, color: MUTE, fontWeight: 700 }}>{a.bucket}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: INK, marginTop: 4 }}>
                    ₹{Number(a.total).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: MUTE, marginTop: 2 }}>{a.plans} plans</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 6. FOLLOW-UP ALERTS */}
        {followups?.followups && (
          <Card title="🔔 Follow-up alerts" sub="Overdue or due today">
            {followups.followups.length === 0 && (
              <div style={{ padding: 20, color: MUTE, textAlign: "center", fontSize: 13 }}>
                ✅ No overdue follow-ups
              </div>
            )}
            <div style={{ maxHeight: 220, overflow: "auto" }}>
              {followups.followups.map((f: any) => (
                <div key={f.plan_id} style={{
                  display: "flex", justifyContent: "space-between", padding: "8px 4px",
                  borderTop: `1px solid ${LINE}`,
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{f.patient_name}</div>
                    <div style={{ fontSize: 11, color: MUTE }}>
                      {f.plan_name} · 📞 {f.phone}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                      background: f.days_overdue > 0 ? "#FFE4E6" : "#DBEAFE",
                      color:      f.days_overdue > 0 ? "#9F1239" : "#1E40AF",
                    }}>
                      {f.days_overdue > 0 ? `${f.days_overdue}d overdue` : "due today"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 7. NO-SHOW */}
        {noShow && (
          <Card title="🚫 No-show rate (30d)" sub="Confirmed appointments only">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "10px 0" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: noShow.rate_pct > 15 ? "#9F1239" : "#065F46" }}>
                  {noShow.rate_pct}%
                </div>
                <div style={{ fontSize: 11, color: MUTE }}>no-show rate</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: INK }}>{noShow.attended}</div>
                <div style={{ fontSize: 11, color: MUTE }}>attended</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#9F1239" }}>{noShow.no_show}</div>
                <div style={{ fontSize: 11, color: MUTE }}>no-show</div>
              </div>
            </div>
          </Card>
        )}

        {/* 8. TOP PROCEDURES */}
        {topProc?.procedures && (
          <Card title="🏆 Top procedures this month" sub="By count, then revenue">
            {topProc.procedures.length === 0 ? (
              <div style={{ padding: 20, color: MUTE, textAlign: "center", fontSize: 13 }}>
                No procedure data this month
              </div>
            ) : (
              <div>
                {topProc.procedures.map((p: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between",
                       padding: "6px 0", borderTop: i === 0 ? "none" : `1px solid ${LINE}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>
                      {i === 0 && "🥇 "}{i === 1 && "🥈 "}{i === 2 && "🥉 "}{p.procedure_name}
                    </div>
                    <div style={{ fontSize: 12, color: MUTE }}>
                      <b style={{ color: INK }}>{p.times}x</b>
                      {p.revenue > 0 && ` · ₹${Number(p.revenue).toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 10. BOT PULSE */}
        {botPulse && (
          <Card title="🤖 Bot pulse (24h)" sub="Inbound + outbound across channels">
            {botPulse.buckets?.length === 0 ? (
              <div style={{ padding: 16, color: MUTE, textAlign: "center", fontSize: 13 }}>
                No bot activity in the last 24h
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {botPulse.buckets.map((b: any, i: number) => (
                  <span key={i} style={{
                    padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: b.direction === "in" ? "#D1FAE5" : "#DBEAFE",
                    color:      b.direction === "in" ? "#065F46" : "#1E40AF",
                  }}>
                    {b.channel.toUpperCase()} {b.direction === "in" ? "↓" : "↑"} {b.n}
                  </span>
                ))}
              </div>
            )}
            {botPulse.last_failed && (
              <div style={{ marginTop: 12, padding: 8, background: "#FFE4E6", borderRadius: 8,
                fontSize: 11, color: "#9F1239" }}>
                ⚠️ Last failure: {botPulse.last_failed.channel} — &ldquo;{botPulse.last_failed.message_text?.slice(0, 60)}&rdquo;
              </div>
            )}
          </Card>
        )}

        {/* 11. REMINDERS HEALTH */}
        {reminders?.by_status && (
          <Card title="⏰ Reminders health" sub="Last 7 days">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {reminders.by_status.map((r: any) => (
                <div key={r.status} style={{
                  padding: "8px 12px", borderRadius: 10,
                  background: r.status === "failed" ? "#FFE4E6" : "#D1FAE5",
                  color:      r.status === "failed" ? "#9F1239" : "#065F46",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{r.status}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>{r.n}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>({r.today_n} today)</div>
                </div>
              ))}
              {reminders.by_status.length === 0 && (
                <div style={{ padding: 16, color: MUTE, fontSize: 13 }}>
                  No reminders fired in the last 7 days
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      </>)}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Building blocks
// ────────────────────────────────────────────────────────────

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
      {children}
    </div>
  );
}

function Card({ title, sub, right, children }: any) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 16,
      boxShadow: "0 2px 8px #0f172a08", border: `1px solid ${LINE}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: INK }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: MUTE, marginTop: 1 }}>{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function KpiTile({ label, value, sub, icon, tone }: {
  label: string; value: any; sub?: string; icon: string; tone: keyof typeof PALETTE;
}) {
  const p = PALETTE[tone];
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 14, border: `1px solid ${LINE}`,
      boxShadow: "0 2px 8px #0f172a06",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: MUTE, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
          {label}
        </span>
        <span style={{
          padding: "2px 6px", borderRadius: 6, background: p.bg, fontSize: 14,
        }}>
          {icon}
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: INK, marginTop: 6, lineHeight: 1.2 }}>
        {value ?? 0}
      </div>
      {sub && <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function RevTile({ label, value, tone }: { label: string; value: any; tone: keyof typeof PALETTE }) {
  const p = PALETTE[tone];
  return (
    <div style={{ background: p.bg, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, color: p.fg, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: p.fg, marginTop: 4 }}>
        ₹{Number(value || 0).toLocaleString()}
      </div>
    </div>
  );
}

function Sparkline({ data, accent }: { data: any[]; accent: string }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => Number(d.amount || 0)), 1);
  const W = 600;
  const H = 60;
  const dx = W / (data.length - 1 || 1);
  const points = data.map((d, i) => {
    const x = i * dx;
    const y = H - (Number(d.amount || 0) / max) * (H - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  const totals = data.reduce((s, d) => s + Number(d.amount || 0), 0);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 60, display: "block" }}>
        <polyline points={points} fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <polygon points={`0,${H} ${points} ${W},${H}`} fill={accent} opacity="0.1" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTE, marginTop: 4 }}>
        <span>{data[0]?.day?.slice(5)}</span>
        <span style={{ fontWeight: 700, color: INK }}>14-day total: ₹{totals.toLocaleString()}</span>
        <span>{data[data.length - 1]?.day?.slice(5)}</span>
      </div>
    </div>
  );
}
