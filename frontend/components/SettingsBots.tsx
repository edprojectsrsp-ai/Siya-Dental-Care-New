"use client";
/**
 * components/SettingsBots.tsx — Bundle V (Sprint T+5)
 *
 * Configure n8n webhook forwarding, Telegram alerts, and WhatsApp inbound bot.
 * Plus an event log showing the last 50 bot messages.
 *
 * Goes into SettingsHub as the "Bots" tab.
 */

import { useEffect, useState, useCallback } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const BG_SOFT = "#F8FAFC";

const ACTIONS = [
  { key: "list_appointments",   label: "List upcoming appointments" },
  { key: "request_appointment", label: "Request to book a slot" },
  { key: "request_cancel",      label: "Request to cancel" },
  { key: "show_balance",        label: "Show pending payments" },
  { key: "show_history",        label: "Show past visits" },
];

export default function SettingsBots({
  clinicId, accent = A, show,
}: { clinicId: string; accent?: string; show: (m: string) => void }) {
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"n8n" | "telegram" | "whatsapp" | "events">("n8n");
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.botConfigGet(clinicId);
      setCfg({
        ...d,
        whatsapp_intent_routing: Array.isArray(d.whatsapp_intent_routing) ? d.whatsapp_intent_routing : [],
      });
      setDirty(false);
    } catch (e: any) { show("Failed to load bot config: " + e.message); }
    finally { setLoading(false); }
  }, [clinicId, show]);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: any) => {
    setCfg((prev: any) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      const body: any = { ...cfg };
      // Don't send masked token back
      if (typeof body.telegram_bot_token === "string" && body.telegram_bot_token.startsWith("***")) {
        delete body.telegram_bot_token;
      }
      delete body.id;
      delete body.updated_at;
      delete body.clinic_id;
      await api.botConfigUpdate(clinicId, body);
      show("✓ Bot settings saved");
      load();
    } catch (e: any) { show("Save failed: " + e.message); }
    finally { setSaving(false); }
  };

  const testTelegram = async () => {
    setTesting(true);
    try {
      const r = await api.telegramTest(clinicId);
      show(r.ok ? "✓ Test sent — check your Telegram" : `Telegram error: HTTP ${r.status}`);
    } catch (e: any) { show("Telegram test failed: " + e.message); }
    finally { setTesting(false); }
  };

  if (loading || !cfg) return <div style={{ padding: 40, textAlign: "center", color: MUTE }}>⏳ Loading…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: INK }}>🤖 Bots & integrations</h3>
        {dirty && (
          <button onClick={save} disabled={saving} style={btnPrimary(accent)}>
            {saving ? "Saving…" : "💾 Save"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${LINE}`, marginBottom: 14 }}>
        {([
          { id: "n8n", label: "⚙️ n8n" },
          { id: "telegram", label: "✈️ Telegram" },
          { id: "whatsapp", label: "💬 WhatsApp" },
          { id: "events", label: "📋 Event log" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            border: "none", background: tab === t.id ? `${accent}14` : "transparent",
            padding: "9px 14px", color: tab === t.id ? accent : MUTE,
            fontWeight: 700, fontSize: 13, borderBottom: tab === t.id ? `2px solid ${accent}` : "2px solid transparent",
            marginBottom: -1, cursor: "pointer", fontFamily: "inherit", borderRadius: "8px 8px 0 0",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "n8n" && (
        <Section title="n8n forwarding" icon="⚙️">
          <p style={p}>Push appointment, payment, and bot events to your n8n workflow for downstream automation.</p>
          <Toggle checked={!!cfg.n8n_enabled} onChange={v => set("n8n_enabled", v)}
                  label="Enable n8n forwarding" accent={accent} />
          <Field label="Webhook URL">
            <input value={cfg.n8n_webhook_url || ""} onChange={e => set("n8n_webhook_url", e.target.value)}
                   placeholder="https://n8n.yourdomain.com/webhook/abc123" style={inputStyle} />
          </Field>
          <Tip>
            In n8n: add a <b>Webhook</b> trigger node → copy the test URL here.
            Inbound WhatsApp events automatically forward when this is enabled.
          </Tip>
        </Section>
      )}

      {tab === "telegram" && (
        <Section title="Telegram alerts" icon="✈️">
          <p style={p}>Staff receive Telegram messages for appointments, payments, lab updates, and alerts.</p>
          <Toggle checked={!!cfg.telegram_enabled} onChange={v => set("telegram_enabled", v)}
                  label="Enable Telegram alerts" accent={accent} />
          <Field label="Bot token">
            <input value={cfg.telegram_bot_token || ""} onChange={e => set("telegram_bot_token", e.target.value)}
                   placeholder={cfg.telegram_bot_token?.startsWith("***") ? "Leave blank to keep current" : "1234567890:ABCDE…"}
                   style={inputStyle} />
          </Field>
          <Field label="Chat ID">
            <input value={cfg.telegram_chat_id || ""} onChange={e => set("telegram_chat_id", e.target.value)}
                   placeholder="-100123456789 or 123456789" style={inputStyle} />
          </Field>
          <button onClick={testTelegram} disabled={testing || !cfg.telegram_chat_id} style={{
            ...btnPrimary("#0088CC"), marginTop: 8,
          }}>{testing ? "Sending…" : "📤 Send test message"}</button>
          <Tip>
            <b>Setup:</b>
            <ol style={{ margin: "6px 0 0 16px", padding: 0 }}>
              <li>Open <code>@BotFather</code> on Telegram → <code>/newbot</code> → copy token</li>
              <li>Start a chat with your new bot (send any message)</li>
              <li>Visit <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> and copy <code>chat.id</code></li>
            </ol>
          </Tip>
        </Section>
      )}

      {tab === "whatsapp" && (
        <Section title="WhatsApp inbound bot" icon="💬">
          <p style={p}>Patients text keywords and get auto-replies. Routes by first matched keyword.</p>
          <Toggle checked={!!cfg.whatsapp_bot_enabled} onChange={v => set("whatsapp_bot_enabled", v)}
                  label="Enable inbound bot" accent={accent} />

          <div style={{ marginTop: 12, fontSize: 11, color: MUTE, fontWeight: 700, textTransform: "uppercase" }}>
            Intent rules ({cfg.whatsapp_intent_routing?.length || 0})
          </div>
          {(cfg.whatsapp_intent_routing || []).map((rule: any, i: number) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(180px, 2fr) auto",
              gap: 6, marginBottom: 6, padding: 8, background: BG_SOFT, borderRadius: 8,
            }}>
              <input value={rule.keyword || ""} placeholder="keyword"
                     onChange={e => {
                       const next = [...cfg.whatsapp_intent_routing];
                       next[i] = { ...rule, keyword: e.target.value.toLowerCase() };
                       set("whatsapp_intent_routing", next);
                     }}
                     style={inputStyle} />
              <select value={rule.action || ""}
                      onChange={e => {
                        const a = ACTIONS.find(x => x.key === e.target.value);
                        const next = [...cfg.whatsapp_intent_routing];
                        next[i] = { ...rule, action: e.target.value, label: a?.label || "" };
                        set("whatsapp_intent_routing", next);
                      }}
                      style={inputStyle}>
                {ACTIONS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
              <button onClick={() => set("whatsapp_intent_routing", cfg.whatsapp_intent_routing.filter((_: any, x: number) => x !== i))}
                      style={btnRemove}>✕</button>
            </div>
          ))}
          <button onClick={() => set("whatsapp_intent_routing", [
            ...(cfg.whatsapp_intent_routing || []),
            { keyword: "", action: ACTIONS[0].key, label: ACTIONS[0].label },
          ])} style={{
            padding: "6px 12px", borderRadius: 8, border: `1px dashed ${accent}`,
            background: "#fff", color: accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>+ Add rule</button>

          <Tip>
            <b>Endpoint:</b> <code>POST /api/bot/whatsapp/inbound</code><br />
            Wire your WhatsApp transport (Cloud API webhook / Baileys / n8n) to forward
            messages here as <code>{`{ from_phone, message_text, clinic_id }`}</code>.
            Response contains <code>response</code> text to send back.
          </Tip>
        </Section>
      )}

      {tab === "events" && <EventLog clinicId={clinicId} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Event log
// ────────────────────────────────────────────────────────────

function EventLog({ clinicId }: { clinicId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "in" | "out" | "failed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.botEventsList(clinicId, 100);
      setEvents(d?.events || []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  const filtered = events.filter(e => {
    if (filter === "all") return true;
    if (filter === "failed") return e.status === "failed";
    return e.direction === filter;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "in", "out", "failed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              border: filter === f ? `2px solid ${A}` : `1px solid ${LINE}`,
              background: filter === f ? `${A}14` : "#fff",
              color: filter === f ? A : MUTE, padding: "5px 12px", borderRadius: 999,
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>{f.toUpperCase()}</button>
          ))}
        </div>
        <button onClick={load} style={{
          border: `1px solid ${LINE}`, background: "#fff", padding: "5px 12px", borderRadius: 8,
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: MUTE,
        }}>↻ Refresh</button>
      </div>

      {loading ? <div style={{ padding: 20, color: MUTE }}>Loading…</div> :
       filtered.length === 0 ? <div style={{ padding: 20, color: MUTE, textAlign: "center" }}>No events</div> :
       filtered.map(e => (
        <div key={e.id} style={{
          padding: 10, marginBottom: 6, background: e.status === "failed" ? "#FFE4E6" : BG_SOFT,
          borderRadius: 8, fontSize: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{
              padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800,
              background: e.direction === "in" ? "#D1FAE5" : "#DBEAFE",
              color:      e.direction === "in" ? "#065F46" : "#1E40AF",
            }}>
              {e.channel?.toUpperCase()} {e.direction === "in" ? "↓ IN" : "↑ OUT"}
            </span>
            <span style={{ fontSize: 10, color: MUTE }}>
              {new Date(e.created_at).toLocaleString("en-IN")}
            </span>
          </div>
          {e.patient_name && (
            <div style={{ marginTop: 4, fontWeight: 700, color: INK }}>
              {e.patient_name} <span style={{ color: MUTE, fontWeight: 400 }}>{e.from_id}</span>
            </div>
          )}
          {e.message_text && <div style={{ color: INK, marginTop: 2 }}><b>In:</b> {e.message_text}</div>}
          {e.intent && <div style={{ color: MUTE, fontSize: 11 }}>Intent: <b>{e.intent}</b></div>}
          {e.response_text && (
            <div style={{ color: INK, marginTop: 2 }}>
              <b>Out:</b> {e.response_text.slice(0, 200)}{e.response_text.length > 200 ? "…" : ""}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Building blocks
// ────────────────────────────────────────────────────────────

function Section({ title, icon, children }: any) {
  return (
    <div style={{
      padding: 16, borderRadius: 12, border: `1px solid ${LINE}`, background: "#fff",
    }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 8 }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label, accent }: any) {
  return (
    <label style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 0", cursor: "pointer",
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{label}</span>
      <span onClick={() => onChange(!checked)} style={{
        width: 40, height: 22, borderRadius: 11, position: "relative",
        background: checked ? accent : "#cbd5e1", transition: "background 0.15s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: 9, background: "#fff",
          transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </span>
    </label>
  );
}

function Field({ label, children }: any) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function Tip({ children }: any) {
  return (
    <div style={{
      marginTop: 12, padding: "10px 12px", borderRadius: 8,
      background: "#E7F5FF", color: "#1864AB", fontSize: 11, lineHeight: 1.6,
    }}>
      {children}
    </div>
  );
}

const p: React.CSSProperties = { margin: "0 0 10px", fontSize: 12, color: MUTE };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 10,
  border: `1.5px solid ${LINE}`, fontSize: 13, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit", background: "#fff",
};
const btnPrimary = (accent: string): React.CSSProperties => ({
  background: accent, color: "#fff", border: "none", padding: "9px 16px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
});
const btnRemove: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 6,
  border: "1px solid #FCA5A5", background: "#fff", color: "#9F1239",
  fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};
