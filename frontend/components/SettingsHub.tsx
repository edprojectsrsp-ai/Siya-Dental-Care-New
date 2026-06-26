"use client";
/**
 * components/SettingsHub.tsx — Bundle Q+
 *
 * Doctor's control panel for everything in this bundle:
 *   • WhatsApp transport (Cloud API / Baileys webhook / Click-to-chat)
 *   • Reminder timings (24h / 2h / 30min toggles)
 *   • Receipt behavior (auto / manual / batch)
 *   • Rating ask + discount (₹100 default)
 *   • Razorpay keys
 *   • Phone consultation product (enable + fee + duration)
 *   • Message template editor (14 default + per-clinic overrides)
 *   • Test transport (send a one-off WhatsApp)
 *
 * Everything saves immediately. Backend reads settings on every send.
 */

import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { BrandingTab, ClinicInfoTab, HoursTab, N8nHostingTab, ServiceCatalogTab } from "@/components/SettingsExpanded";
import SettingsReminders from "@/components/SettingsReminders";
import { TreatmentTemplatesManager } from "@/components/TreatmentTemplates";
import SettingsBots from "@/components/SettingsBots";
import SiteCMSEditor from "@/components/SiteCMSEditor";
import SettingsLabsTab from "@/components/SettingsLabsTab";
import SettingsSpecialistsTab from "@/components/SettingsSpecialistsTab";
import SettingsModuleVisibility from "@/components/SettingsModuleVisibility";

const A = "#0E7C7B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";

const TABS = [
  { id: "messaging",  label: "Messaging",      icon: "💬" },
  { id: "reminders",  label: "Reminders",      icon: "⏰" },
  { id: "bots",       label: "Bots",           icon: "🤖" },
  { id: "billing",    label: "Receipts",       icon: "🧾" },
  { id: "ratings",    label: "Ratings",        icon: "⭐" },
  { id: "consult",    label: "Phone Consult",  icon: "📞" },
  { id: "razorpay",   label: "Razorpay",       icon: "💳" },
  { id: "templates",  label: "Templates",      icon: "📝" },
  { id: "test",       label: "Test",           icon: "🧪" },
  { id: "clinic",     label: "Clinic Info",    icon: "🏥" },
  { id: "hours",      label: "Hours",          icon: "🕐" },
  { id: "catalog",    label: "Services",       icon: "📋" },
  { id: "branding",   label: "Branding",       icon: "🎨" },
  { id: "website",    label: "Website",        icon: "🌐" },
  { id: "n8n",        label: "n8n Hosting",    icon: "🔌" },
  { id: "ar",         label: "AR Preview",     icon: "✨" },
  { id: "labs",       label: "Lab Vendors",    icon: "🧪" },
  { id: "spec_mgmt",  label: "Specialists",    icon: "👨‍⚕️" },
  { id: "modules",    label: "Module Access",  icon: "🔒" },
] as const;

export default function SettingsHub({
  staff, show, accent = A,
}: { staff: any; show: (msg: string) => void; accent?: string }) {
  const [tab, setTab] = useState<string>("messaging");
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const clinicId = staff?.clinic_id;

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const d = await api.settingsGet(clinicId);
      setSettings(d);
      setDirty({});
    } catch (e: any) {
      show("Error loading settings: " + e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [clinicId]); // eslint-disable-line

  const set = (k: string, v: any) => {
    setDirty({ ...dirty, [k]: v });
    setSettings({ ...settings, [k]: v });
  };

  const save = async () => {
    if (Object.keys(dirty).length === 0) { show("Nothing to save"); return; }
    setSaving(true);
    try {
      await api.settingsUpdate(clinicId, dirty);
      show("✓ Settings saved");
      setDirty({});
      await load();
    } catch (e: any) {
      show("Error: " + e.message);
    } finally { setSaving(false); }
  };

  if (loading || !settings) return <div style={{ padding: 40, textAlign: "center" as const, color: MUTE }}>⏳ Loading settings…</div>;

  const hasDirty = Object.keys(dirty).length > 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>⚙️ Settings Hub</h1>
        {hasDirty && (
          <button onClick={save} disabled={saving}
            style={btnPrimary(accent)}>
            {saving ? "Saving…" : `💾 Save (${Object.keys(dirty).length} changes)`}
          </button>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 2px 10px #0f172a08", overflow: "hidden" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${LINE}`, padding: "8px 8px 0", overflowX: "auto" as const }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              border: "none", background: tab === t.id ? `${accent}14` : "transparent",
              padding: "11px 16px", borderRadius: "10px 10px 0 0",
              color: tab === t.id ? accent : MUTE, fontWeight: 700, fontSize: 13,
              borderBottom: tab === t.id ? `2px solid ${accent}` : "2px solid transparent",
              marginBottom: -1, cursor: "pointer", whiteSpace: "nowrap" as const, fontFamily: "inherit",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {tab === "messaging"  && <MessagingTab s={settings} set={set} accent={accent} />}
          {tab === "reminders"  && <SettingsReminders clinicId={clinicId} />}
          {tab === "bots"       && <SettingsBots clinicId={clinicId} accent={accent} show={show} />}
          {tab === "billing"    && <BillingTab s={settings} set={set} accent={accent} />}
          {tab === "ratings"    && <RatingsTab s={settings} set={set} accent={accent} />}
          {tab === "consult"    && <ConsultTab s={settings} set={set} accent={accent} />}
          {tab === "razorpay"   && <RazorpayTab s={settings} set={set} accent={accent} />}
          {tab === "templates"  && <TreatmentTemplatesManager clinicId={clinicId} />}
          {tab === "test"       && <TestTab clinicId={clinicId} settings={settings} accent={accent} show={show} />}
          {tab === "clinic"     && <ClinicInfoTab clinicId={clinicId} show={show} />}
          {tab === "hours"      && <HoursTab clinicId={clinicId} show={show} />}
          {tab === "catalog"    && <ServiceCatalogTab clinicId={clinicId} show={show} />}
          {tab === "branding"   && <BrandingTab clinicId={clinicId} show={show} />}
          {tab === "website"    && <SiteCMSEditor clinicId={clinicId} accent={accent} show={show} />}
          {tab === "n8n"        && <N8nHostingTab clinicId={clinicId} show={show} />}
          {tab === "ar"         && <ARSettingsTab clinicId={clinicId} show={show} accent={accent} />}
          {tab === "labs"       && <SettingsLabsTab clinicId={clinicId} />}
          {tab === "spec_mgmt"  && <SettingsSpecialistsTab clinicId={clinicId} />}
          {tab === "modules"    && <SettingsModuleVisibility clinicId={clinicId} />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MESSAGING TAB — transport selection
// ═══════════════════════════════════════════════════════════════
function MessagingTab({ s, set, accent }: any) {
  const transport = s.message_transport || "click2chat";
  return (
    <div>
      <SectionTitle>Transport</SectionTitle>
      <P>Pick how WhatsApp messages are sent. Switch any time — no code changes.</P>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
        <TransportCard
          active={transport === "click2chat"} accent={accent}
          icon="👆" title="Click-to-chat"
          subtitle="Free · Manual confirm · Best for testing"
          desc="Backend prepares the message, staff clicks the wa.me link to actually send. Zero setup. Use this NOW to live-test."
          onClick={() => set("message_transport", "click2chat")}
        />
        <TransportCard
          active={transport === "cloud_api"} accent={accent}
          icon="🏢" title="Meta Cloud API"
          subtitle="₹0.35/msg · Auto · Production"
          desc="Official WhatsApp Business Cloud API. Requires Meta-verified business + pre-approved templates. Fully automatic."
          onClick={() => set("message_transport", "cloud_api")}
        />
        <TransportCard
          active={transport === "baileys"} accent={accent}
          icon="🔌" title="Self-hosted webhook"
          subtitle="Free · Auto · Personal number"
          desc="n8n + Baileys / whatsapp-web.js. Uses your personal WhatsApp via QR code. Free but riskier — Meta may suspend."
          onClick={() => set("message_transport", "baileys")}
        />
      </div>

      {transport === "cloud_api" && (
        <Card>
          <SectionTitle>Meta Cloud API credentials</SectionTitle>
          <Field label="Phone Number ID">
            <Input value={s.cloud_api_phone_id || ""} onChange={v => set("cloud_api_phone_id", v)}
              placeholder="e.g. 123456789012345" />
          </Field>
          <Field label="WABA ID">
            <Input value={s.cloud_api_waba_id || ""} onChange={v => set("cloud_api_waba_id", v)}
              placeholder="WhatsApp Business Account ID" />
          </Field>
          <Field label={`Permanent Token ${s.cloud_api_token_masked ? `· current: ${s.cloud_api_token_masked}` : ""}`}>
            <Input type="password" value={s.cloud_api_token || ""} onChange={v => set("cloud_api_token", v)}
              placeholder={s.cloud_api_token_masked ? "Leave blank to keep current" : "EAAB..."} />
          </Field>
          <Note>Get these from <code style={code}>business.facebook.com → WhatsApp Manager → API Setup</code>. Free tier covers 1,000 business-initiated conversations/month.</Note>
        </Card>
      )}

      {transport === "baileys" && (
        <Card>
          <SectionTitle>Self-hosted webhook</SectionTitle>
          <Field label="Webhook URL">
            <Input value={s.webhook_url || ""} onChange={v => set("webhook_url", v)}
              placeholder="https://n8n.yourdomain.com/webhook/whatsapp" />
          </Field>
          <Field label={`Shared secret ${s.webhook_secret_masked ? `· current: ${s.webhook_secret_masked}` : "(optional but recommended)"}`}>
            <Input type="password" value={s.webhook_secret || ""} onChange={v => set("webhook_secret", v)}
              placeholder={s.webhook_secret_masked ? "Leave blank to keep current" : "Random shared secret"} />
          </Field>
          <Note>
            Backend POSTs to your webhook: <code style={code}>{`{ phone, body, template_key? }`}</code> with header
            <code style={code}>X-Webhook-Secret: …</code>. n8n workflow should return <code style={code}>{`{ ok: true, id }`}</code>.
            <br /><br />Sample n8n flow JSON included in the deployment bundle (<code style={code}>n8n/baileys_whatsapp.json</code>).
          </Note>
        </Card>
      )}

      {transport === "click2chat" && (
        <Card>
          <SectionTitle>How click-to-chat works</SectionTitle>
          <P>Backend prepares messages and returns <code style={code}>wa.me</code> links. Staff click → WhatsApp Web/app opens with pre-filled text → they hit send. <b>No setup needed.</b></P>
          <Note>Use this for live testing. Switch to Cloud API or Baileys later when you're ready to fully automate.</Note>
        </Card>
      )}
    </div>
  );
}

function TransportCard({ active, accent, icon, title, subtitle, desc, onClick }: any) {
  return (
    <button onClick={onClick} style={{
      textAlign: "left" as const, padding: 14, borderRadius: 12,
      border: active ? `2px solid ${accent}` : `1.5px solid ${LINE}`,
      background: active ? `${accent}10` : "#fff", cursor: "pointer", fontFamily: "inherit",
    }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 14, color: INK }}>{title} {active && "✓"}</div>
      <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginTop: 2 }}>{subtitle}</div>
      <div style={{ fontSize: 12, color: MUTE, marginTop: 6, lineHeight: 1.4 }}>{desc}</div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// REMINDERS TAB
// ═══════════════════════════════════════════════════════════════
function RemindersTab({ s, set, accent }: any) {
  return (
    <div>
      <SectionTitle>Appointment reminders</SectionTitle>
      <P>Auto-sent before appointments. Each toggle is independent.</P>
      <ToggleRow
        label="24 hours before"
        sublabel="Sent the day before. Good for confirmation."
        value={s.reminder_24h_enabled}
        onChange={v => set("reminder_24h_enabled", v)}
        accent={accent}
      />
      <ToggleRow
        label="2 hours before"
        sublabel="Last-mile nudge with clinic address."
        value={s.reminder_2h_enabled}
        onChange={v => set("reminder_2h_enabled", v)}
        accent={accent}
      />
      <ToggleRow
        label="30 minutes before"
        sublabel="For drive-time / walking-in patients. Off by default."
        value={s.reminder_30m_enabled}
        onChange={v => set("reminder_30m_enabled", v)}
        accent={accent}
      />

      <Note>The scheduler runs every 10 minutes. Reminders queue up and fire automatically when their time window opens.</Note>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RECEIPT BILLING TAB
// ═══════════════════════════════════════════════════════════════
function BillingTab({ s, set, accent }: any) {
  return (
    <div>
      <SectionTitle>Payment receipts via WhatsApp</SectionTitle>
      <RadioGroup
        value={s.receipt_mode}
        onChange={v => set("receipt_mode", v)}
        accent={accent}
        options={[
          { value: "manual_confirm", label: "Manual confirm (recommended)",
            desc: "Nurse clicks 'Send Receipt' after recording payment. Most flexible." },
          { value: "auto", label: "Auto-send on every payment",
            desc: "Every payment_transaction insert → instant WhatsApp receipt." },
          { value: "daily_batch", label: "End-of-day batch",
            desc: "One roll-up per patient at 9pm with all today's payments." },
        ]}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RATINGS TAB
// ═══════════════════════════════════════════════════════════════
function RatingsTab({ s, set, accent }: any) {
  return (
    <div>
      <SectionTitle>Rating requests + discount</SectionTitle>
      <ToggleRow
        label="Ask for ratings"
        sublabel="Auto-send a rating link after every completed visit."
        value={s.rating_ask_enabled}
        onChange={v => set("rating_ask_enabled", v)}
        accent={accent}
      />

      {s.rating_ask_enabled && (
        <>
          <Field label="Send first ask after (hours)">
            <NumberInput value={s.rating_ask_hours} onChange={v => set("rating_ask_hours", v)} min={1} max={168} />
            <Note>Default: 24h after visit ends</Note>
          </Field>
          <Field label="Retry if no response after (days)">
            <NumberInput value={s.rating_retry_days} onChange={v => set("rating_retry_days", v)} min={1} max={30} />
          </Field>

          <Divider />

          <SectionTitle>Reward</SectionTitle>
          <Field label="Discount amount (₹)">
            <NumberInput value={s.rating_discount_amount} onChange={v => set("rating_discount_amount", v)} min={0} max={5000} />
          </Field>
          <Field label="Discount mode">
            <RadioGroup
              value={s.rating_discount_mode}
              onChange={v => set("rating_discount_mode", v)}
              accent={accent}
              options={[
                { value: "auto_apply", label: "Auto-apply credit on next bill",
                  desc: "System creates a credit row; billing deducts it automatically." },
                { value: "coupon", label: "Issue coupon code",
                  desc: "Patient gets a code via WhatsApp; mentions it at clinic for manual apply." },
                { value: "manual", label: "Doctor's discretion",
                  desc: "System flags rating-given patients; doctor decides per visit." },
              ]}
            />
          </Field>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHONE CONSULT TAB
// ═══════════════════════════════════════════════════════════════
function ConsultTab({ s, set, accent }: any) {
  return (
    <div>
      <SectionTitle>Phone Consultation product</SectionTitle>
      <P>Patients book a paid phone consultation from your public website. They pay, doctor calls, Rx goes via WhatsApp.</P>
      <ToggleRow
        label="Enable phone consultation"
        sublabel="Shows the booking form on your public website."
        value={s.phone_consult_enabled}
        onChange={v => set("phone_consult_enabled", v)}
        accent={accent}
      />

      {s.phone_consult_enabled && (
        <>
          <Field label="Consultation fee (₹)">
            <NumberInput value={s.phone_consult_fee} onChange={v => set("phone_consult_fee", v)} min={0} max={10000} />
          </Field>
          <Field label="Duration shown to patient (minutes)">
            <NumberInput value={s.phone_consult_duration_min} onChange={v => set("phone_consult_duration_min", v)} min={1} max={60} />
            <Note>"Doctor will call within X minutes" — sets expectation.</Note>
          </Field>
          <Note>
            <b>Required:</b> Configure Razorpay keys in the Razorpay tab. Without keys the form will fall back to offline payment mode (patient pays at clinic / on call).
          </Note>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RAZORPAY TAB
// ═══════════════════════════════════════════════════════════════
function RazorpayTab({ s, set, accent }: any) {
  return (
    <div>
      <SectionTitle>Razorpay payment gateway</SectionTitle>
      <P>Used for phone consultation product (and any future online payments).</P>

      <Field label="Mode">
        <RadioGroup
          value={s.razorpay_mode}
          onChange={v => set("razorpay_mode", v)}
          accent={accent}
          inline
          options={[
            { value: "test", label: "Test", desc: "Use rzp_test_* keys" },
            { value: "live", label: "Live", desc: "Real money 🚨" },
          ]}
        />
      </Field>
      <Field label="Key ID">
        <Input value={s.razorpay_key_id || ""} onChange={v => set("razorpay_key_id", v)}
          placeholder={s.razorpay_mode === "test" ? "rzp_test_..." : "rzp_live_..."} />
      </Field>
      <Field label={`Key Secret ${s.razorpay_key_secret_masked ? `· current: ${s.razorpay_key_secret_masked}` : ""}`}>
        <Input type="password" value={s.razorpay_key_secret || ""} onChange={v => set("razorpay_key_secret", v)}
          placeholder={s.razorpay_key_secret_masked ? "Leave blank to keep current" : "Razorpay secret"} />
      </Field>
      <Note>
        Get test keys from <code style={code}>dashboard.razorpay.com → Settings → API Keys</code> (test mode is free, no KYC needed). Switch to live keys after KYC verification.
      </Note>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATES TAB
// ═══════════════════════════════════════════════════════════════
function TemplatesTab({ clinicId, accent, show }: { clinicId: string; accent: string; show: any }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.templatesList(clinicId);
      setTemplates(d.templates || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [clinicId]); // eslint-disable-line

  const categories = useMemo(() => Array.from(new Set(templates.map(t => t.category))), [templates]);
  const filtered = category ? templates.filter(t => t.category === category) : templates;

  if (loading) return <div style={{ padding: 40, textAlign: "center" as const, color: MUTE }}>⏳ Loading templates…</div>;

  return (
    <div>
      <SectionTitle>Message templates</SectionTitle>
      <P>14 default templates ship with the system. Override any per-clinic by clicking Edit.</P>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" as const }}>
        <button onClick={() => setCategory("")} style={pillBtn(category === "", accent)}>All ({templates.length})</button>
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={pillBtn(category === c, accent)}>
            {c} ({templates.filter(t => t.category === c).length})
          </button>
        ))}
      </div>

      {/* List */}
      <div>
        {filtered.map(t => (
          <div key={t.template_key} style={{
            background: "#F8FAFC", borderRadius: 12, padding: 14, marginBottom: 8,
            border: `1px solid ${LINE}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <b style={{ fontSize: 14 }}>{t.label}</b>
                  <code style={{ ...code, background: "#fff", color: MUTE }}>{t.template_key}</code>
                  {t.clinic_id && <span style={tag(accent)}>custom</span>}
                  <span style={tag(MUTE)}>{t.category}</span>
                </div>
                <div style={{ fontSize: 12, color: MUTE, marginTop: 6, whiteSpace: "pre-wrap" as const, lineHeight: 1.5 }}>
                  {t.body}
                </div>
              </div>
              <button onClick={() => setEditing(t)} style={btnGhost}>✏ Edit</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <TemplateEditor
          template={editing}
          clinicId={clinicId}
          accent={accent}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); show("Template saved"); load(); }}
        />
      )}
    </div>
  );
}

function TemplateEditor({ template, clinicId, accent, onClose, onSaved }: any) {
  const [body, setBody] = useState(template.body);
  const [label, setLabel] = useState(template.label);
  const [cloudName, setCloudName] = useState(template.cloud_template_name || "");
  const [saving, setSaving] = useState(false);

  const placeholders = useMemo(() => {
    const m = body.matchAll(/\{([a-zA-Z0-9_]+)\}/g);
    return Array.from(new Set(Array.from(m, (x: any) => x[1])));
  }, [body]);

  const save = async () => {
    setSaving(true);
    try {
      await api.templateUpsert({
        clinic_id: clinicId,
        template_key: template.template_key,
        category: template.category,
        label, body, cloud_template_name: cloudName,
        cloud_template_lang: template.cloud_template_lang || "en",
        is_active: true,
      });
      onSaved();
    } catch (e: any) { alert("Error: " + e.message); } finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed" as const, inset: 0, background: "#0f172aa0", zIndex: 200,
      display: "flex", alignItems: "center" as const, justifyContent: "center" as const, padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, padding: 22, maxWidth: 640, width: "100%",
        maxHeight: "90vh", overflow: "auto" as const,
      }}>
        <h3 style={{ margin: "0 0 6px" }}>Edit template</h3>
        <code style={{ ...code, fontSize: 12 }}>{template.template_key}</code>

        <Divider />
        <Field label="Label (shown in template list)">
          <Input value={label} onChange={setLabel} />
        </Field>
        <Field label="Body — use {variable} placeholders">
          <textarea value={body} onChange={e => setBody(e.target.value)}
            style={{
              width: "100%", minHeight: 160, padding: 12, borderRadius: 10,
              border: `1.5px solid ${LINE}`, fontSize: 13.5, fontFamily: "inherit",
              resize: "vertical" as const, lineHeight: 1.5, outline: "none",
            }} />
        </Field>

        {placeholders.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: MUTE, marginBottom: 5, letterSpacing: 0.4 }}>PLACEHOLDERS DETECTED</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
              {placeholders.map((p: string) => (
                <code key={p} style={{ ...code, background: `${accent}14`, color: accent }}>{`{${p}}`}</code>
              ))}
            </div>
          </div>
        )}

        <Field label="Cloud API template name (optional)">
          <Input value={cloudName} onChange={setCloudName}
            placeholder="Pre-approved name in Meta Business" />
          <Note>Only needed if your transport is Meta Cloud API and the template must be Meta-pre-approved for outbound (24h session not open).</Note>
        </Field>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" as const, marginTop: 16 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={save} disabled={saving} style={btnPrimary(accent)}>{saving ? "Saving…" : "💾 Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEST TAB — send a real WhatsApp to verify config
// ═══════════════════════════════════════════════════════════════
function TestTab({ clinicId, settings, accent, show }: any) {
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("✓ Test from Siya Dental settings. If you see this, your WhatsApp transport is working!");
  const [result, setResult] = useState<any>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!phone) { show("Enter a phone number"); return; }
    setSending(true); setResult(null);
    try {
      const r = await api.settingsTest(clinicId, phone, msg);
      setResult(r);
      if (r.wa_url) window.open(r.wa_url, "_blank");
      show(r.status === "sent" ? "✓ Sent!" : r.status === "manual_pending" ? "Link opened — click Send in WhatsApp" : `Status: ${r.status}`);
    } catch (e: any) {
      setResult({ status: "failed", error: e.message });
    } finally { setSending(false); }
  };

  return (
    <div>
      <SectionTitle>Test transport</SectionTitle>
      <P>Send a one-off WhatsApp using the current transport ({<code style={code}>{settings.message_transport}</code>}). Confirms your config works end-to-end.</P>

      <Field label="Phone (with or without country code)">
        <Input value={phone} onChange={setPhone} placeholder="9876543210" />
      </Field>
      <Field label="Message">
        <textarea value={msg} onChange={e => setMsg(e.target.value)}
          style={{
            width: "100%", minHeight: 80, padding: 12, borderRadius: 10,
            border: `1.5px solid ${LINE}`, fontSize: 13.5, fontFamily: "inherit",
            resize: "vertical" as const, outline: "none",
          }} />
      </Field>
      <button onClick={send} disabled={sending} style={btnPrimary(accent)}>
        {sending ? "Sending…" : "🚀 Send Test"}
      </button>

      {result && (
        <div style={{
          marginTop: 16, padding: 14, borderRadius: 10,
          background: result.status === "failed" ? "#FEE2E2" :
                       result.status === "manual_pending" ? "#FEF3C7" : "#D1FAE5",
          border: `1px solid ${
            result.status === "failed" ? "#DC2626" :
            result.status === "manual_pending" ? "#D97706" : "#10B981"
          }`, fontSize: 13,
        }}>
          <b>Status: {result.status}</b>
          {result.transport && <div style={{ fontSize: 12, marginTop: 4 }}>Transport: {result.transport}</div>}
          {result.wa_url && (
            <div style={{ fontSize: 12, marginTop: 6, wordBreak: "break-all" as const }}>
              Link: <a href={result.wa_url} target="_blank" rel="noopener noreferrer" style={{ color: accent }}>{result.wa_url}</a>
            </div>
          )}
          {result.error && <div style={{ fontSize: 12, marginTop: 4, color: "#991B1B" }}>Error: {result.error}</div>}
          {result.log_id && <div style={{ fontSize: 11, color: MUTE, marginTop: 4 }}>Log ID: {result.log_id}</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════
function SectionTitle({ children }: any) {
  return <h3 style={{ margin: "0 0 6px", fontSize: 16, color: INK }}>{children}</h3>;
}
function P({ children }: any) {
  return <p style={{ fontSize: 13, color: MUTE, marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>{children}</p>;
}
function Card({ children }: any) {
  return <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 16, border: `1px solid ${LINE}`, marginTop: 12 }}>{children}</div>;
}
function Field({ label, children }: any) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}
function Input({ value, onChange, type = "text", placeholder }: any) {
  return (
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width: "100%", padding: "10px 12px", borderRadius: 10,
        border: `1.5px solid ${LINE}`, fontSize: 14, outline: "none",
        boxSizing: "border-box" as const, fontFamily: "inherit",
      }} />
  );
}
function NumberInput({ value, onChange, min, max }: any) {
  return (
    <input type="number" value={value ?? ""} min={min} max={max}
      onChange={e => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
      style={{
        width: 140, padding: "10px 12px", borderRadius: 10,
        border: `1.5px solid ${LINE}`, fontSize: 14, outline: "none",
        boxSizing: "border-box" as const, fontFamily: "inherit",
      }} />
  );
}
function ToggleRow({ label, sublabel, value, onChange, accent }: any) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center" as const,
      padding: "14px 0", borderBottom: `1px solid ${LINE}`,
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>{sublabel}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 48, height: 26, borderRadius: 999, position: "relative" as const,
        border: "none", background: value ? accent : "#CBD5E1",
        cursor: "pointer", transition: "background .2s", fontFamily: "inherit",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%" as const, background: "#fff",
          position: "absolute" as const, top: 2, left: value ? 24 : 2,
          transition: "left .2s", boxShadow: "0 2px 4px #00000033",
        }} />
      </button>
    </div>
  );
}
function RadioGroup({ value, onChange, options, accent, inline }: any) {
  return (
    <div style={{ display: inline ? "flex" : "block", gap: 8, flexWrap: "wrap" as const }}>
      {options.map((o: any) => (
        <label key={o.value} style={{
          display: "block", padding: 12, borderRadius: 10, cursor: "pointer", marginBottom: 6,
          border: value === o.value ? `2px solid ${accent}` : `1.5px solid ${LINE}`,
          background: value === o.value ? `${accent}10` : "#fff",
          flex: inline ? 1 : "initial",
        }}>
          <div style={{ display: "flex", alignItems: "center" as const, gap: 8 }}>
            <input type="radio" checked={value === o.value} onChange={() => onChange(o.value)}
              style={{ accentColor: accent }} />
            <b style={{ fontSize: 13 }}>{o.label}</b>
          </div>
          {o.desc && <div style={{ fontSize: 12, color: MUTE, marginTop: 4, marginLeft: 24 }}>{o.desc}</div>}
        </label>
      ))}
    </div>
  );
}
function Note({ children }: any) {
  return (
    <div style={{
      background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 10,
      padding: 12, marginTop: 10, fontSize: 12.5, color: "#78350F", lineHeight: 1.5,
    }}>💡 {children}</div>
  );
}
function Divider() {
  return <div style={{ height: 1, background: LINE, margin: "16px 0" }} />;
}
const btnPrimary = (accent: string): any => ({
  background: accent, color: "#fff", border: "none", padding: "10px 18px",
  borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
});
const btnGhost: any = {
  background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, padding: "8px 14px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const code: any = {
  fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11,
  background: "#F1F5F9", color: "#1E293B", padding: "1px 6px", borderRadius: 5,
};
const pillBtn = (active: boolean, accent: string): any => ({
  border: active ? `2px solid ${accent}` : `1.5px solid ${LINE}`,
  background: active ? `${accent}14` : "#fff",
  color: active ? accent : MUTE, padding: "5px 11px", borderRadius: 999,
  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});
const tag = (color: string): any => ({
  background: `${color}14`, color, padding: "1px 8px", borderRadius: 999,
  fontSize: 10, fontWeight: 700,
});

// ═══════════════════════════════════════════════════════════════
// AR SETTINGS TAB — Banuba token + effect config
// ═══════════════════════════════════════════════════════════════
function ARSettingsTab({ clinicId, show, accent = A }: { clinicId: string; show: (m: string) => void; accent?: string }) {
  const [token, setToken] = useState("");
  const [effects, setEffects] = useState<string[]>(["whitening"]);
  const [intensity, setIntensity] = useState(60);
  const [bracesStyle, setBracesStyle] = useState("metal");
  const [veneerShade, setVeneerShade] = useState("natural");
  const [showGuide, setShowGuide] = useState(true);
  const [brandingText, setBrandingText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.arSettingsGet();
        setToken(d.banuba_token || "");
        setEffects(d.enabled_effects || ["whitening"]);
        setIntensity(d.default_whitening_intensity || 60);
        setBracesStyle(d.braces_style || "metal");
        setVeneerShade(d.veneer_shade || "natural");
        setShowGuide(d.show_alignment_guide !== false);
        setBrandingText(d.custom_branding_text || "");
        setLoaded(true);
      } catch { setLoaded(true); }
    })();
  }, []);

  const toggleEffect = (eff: string) => {
    setEffects(prev => prev.includes(eff) ? prev.filter(e => e !== eff) : [...prev, eff]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.arSettingsUpdate({
        banuba_token: token || null,
        enabled_effects: effects,
        default_whitening_intensity: intensity,
        braces_style: bracesStyle,
        veneer_shade: veneerShade,
        show_alignment_guide: showGuide,
        custom_branding_text: brandingText || null,
      });
      show("✓ AR settings saved");
    } catch (e: any) { show(e.message || "Failed to save"); }
    setSaving(false);
  };

  if (!loaded) return <div style={{ padding: 20, color: MUTE }}>Loading AR settings...</div>;

  const ALL_EFFECTS = [
    { id: "whitening", label: "✨ Teeth Whitening", desc: "Adjustable whitening overlay on detected teeth" },
    { id: "braces", label: "🦷 Braces Preview", desc: "Virtual bracket + wire visualization (requires Banuba)" },
    { id: "veneers", label: "💎 Veneer Preview", desc: "Smooth, bright veneer simulation (requires Banuba)" },
    { id: "alignment", label: "📐 Alignment Guide", desc: "Midline + smile symmetry measurement overlay" },
  ];

  const hasToken = token.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* SDK Token */}
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 6 }}>BanubaSDK Client Token</div>
        <div style={{ fontSize: 12, color: MUTE, marginBottom: 8 }}>
          Get your token from <a href="https://docs.banuba.com/face-ar-sdk/web/web_overview" target="_blank" rel="noopener" style={{ color: accent }}>Banuba Developer Portal</a>.
          Without a token, only basic whitening (face-api.js) is available.
        </div>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Paste your Banuba client token here..."
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            border: `1.5px solid ${hasToken ? "#10B981" : LINE}`, fontSize: 13,
            fontFamily: "monospace", background: hasToken ? "#F0FDF4" : "#fff",
            boxSizing: "border-box" as const,
          }}
        />
        <div style={{ fontSize: 11, marginTop: 4, color: hasToken ? "#10B981" : "#F59E0B", fontWeight: 600 }}>
          {hasToken ? "✓ Token configured — Enhanced AR mode active" : "⚠ No token — Basic whitening mode only"}
        </div>
      </div>

      {/* Enabled Effects */}
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 8 }}>Enabled Effects</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ALL_EFFECTS.map(eff => {
            const active = effects.includes(eff.id);
            const needsToken = eff.id !== "whitening" && eff.id !== "alignment";
            const disabled = needsToken && !hasToken;
            return (
              <label key={eff.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px",
                background: active ? `${accent}06` : "#fff", borderRadius: 12,
                border: `1.5px solid ${active ? accent + "44" : LINE}`,
                cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
              }}>
                <input
                  type="checkbox" checked={active} disabled={disabled}
                  onChange={() => !disabled && toggleEffect(eff.id)}
                  style={{ marginTop: 2, accentColor: accent }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: INK }}>{eff.label}</div>
                  <div style={{ fontSize: 11, color: MUTE }}>{eff.desc}</div>
                  {disabled && <div style={{ fontSize: 10, color: "#F59E0B", fontWeight: 600, marginTop: 2 }}>Requires BanubaSDK token above</div>}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Whitening Default */}
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 6 }}>Default Whitening Intensity</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input type="range" min={10} max={100} value={intensity} onChange={e => setIntensity(Number(e.target.value))} style={{ flex: 1, accentColor: accent }} />
          <span style={{ fontWeight: 800, color: accent, fontSize: 14, minWidth: 36 }}>{intensity}%</span>
        </div>
      </div>

      {/* Braces Style */}
      {effects.includes("braces") && (
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 6 }}>Braces Style</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["metal", "ceramic", "lingual"].map(s => (
              <button key={s} onClick={() => setBracesStyle(s)} style={pillBtn(bracesStyle === s, accent)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Veneer Shade */}
      {effects.includes("veneers") && (
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 6 }}>Veneer Shade</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["natural", "hollywood", "bright"].map(s => (
              <button key={s} onClick={() => setVeneerShade(s)} style={pillBtn(veneerShade === s, accent)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alignment Guide Toggle */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={showGuide} onChange={e => setShowGuide(e.target.checked)} style={{ accentColor: accent }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: INK }}>Show alignment guide by default</span>
      </label>

      {/* Custom Branding */}
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: INK, marginBottom: 6 }}>Custom Footer Text <span style={{ fontWeight: 400, color: MUTE }}>(optional)</span></div>
        <input
          value={brandingText} onChange={e => setBrandingText(e.target.value)}
          placeholder="e.g. Visit us at Siya Dental, Main Road, Rourkela"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${LINE}`, fontSize: 13, boxSizing: "border-box" as const }}
        />
      </div>

      {/* Preview Link */}
      <div style={{
        padding: "12px 16px", background: `${accent}06`, borderRadius: 12,
        border: `1px dashed ${accent}33`, display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: INK }}>Public Smile Preview Page</div>
          <div style={{ fontSize: 11, color: MUTE }}>Share this link with patients</div>
        </div>
        <a href="/public/smile" target="_blank" rel="noopener" style={{
          background: accent, color: "#fff", borderRadius: 10, padding: "8px 16px",
          fontSize: 12, fontWeight: 800, textDecoration: "none",
        }}>
          Open Preview →
        </a>
      </div>

      {/* Save */}
      <button onClick={save} disabled={saving} style={{
        background: accent, color: "#fff", border: "none", borderRadius: 14,
        padding: "14px 24px", fontSize: 15, fontWeight: 800, cursor: saving ? "wait" : "pointer",
        boxShadow: `0 4px 14px ${accent}44`, alignSelf: "flex-start",
      }}>
        {saving ? "⏳ Saving..." : "💾 Save AR Settings"}
      </button>
    </div>
  );
}
