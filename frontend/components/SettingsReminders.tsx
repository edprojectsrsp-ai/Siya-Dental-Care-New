/**
 * SettingsReminders.tsx — Bundle U, Sprint T+1
 *
 * Configure automated reminders: WhatsApp + SMS toggles, timing controls.
 *
 * INTEGRATION into SettingsExpanded.tsx:
 *   import SettingsReminders from './SettingsReminders';
 *   <SettingsReminders clinicId={clinicId} />
 */

import React, { useState, useEffect, useCallback } from 'react';
import * as api from "@/lib/api";
const TEAL = '#0E7C7B';
const TEAL_DARK = '#0A5C5B';

interface ReminderSettings {
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  appt_24h_enabled: boolean;
  appt_24h_send_time: string;
  appt_2h_enabled: boolean;
  appt_30m_enabled: boolean;
  followup_day_enabled: boolean;
  followup_day_send_time: string;
  followup_1day_before_enabled: boolean;
  followup_7day_before_enabled: boolean;
  payment_3day_enabled: boolean;
  payment_7day_enabled: boolean;
  birthday_enabled: boolean;
  birthday_send_time: string;
  morning_digest_enabled: boolean;
  morning_digest_send_time: string;
}

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00'
];

function ToggleSwitch({
  checked, onChange, label, description
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '12px 0', cursor: 'pointer', gap: '12px',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#212529' }}>{label}</div>
        {description && (
          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>{description}</div>
        )}
      </div>
      <div
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', width: '40px', height: '22px',
          borderRadius: '11px', background: checked ? TEAL : '#dee2e6',
          transition: 'background 0.2s ease', flexShrink: 0, marginTop: '2px',
        }}
      >
        <div style={{
          position: 'absolute', top: '2px',
          left: checked ? '20px' : '2px',
          width: '18px', height: '18px', borderRadius: '50%',
          background: 'white', transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
    </label>
  );
}

function TimeSelect({
  value, onChange, disabled
}: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select
      value={value?.slice(0, 5) || '09:00'}
      onChange={e => onChange(e.target.value + ':00')}
      disabled={disabled}
      style={{
        padding: '6px 10px', borderRadius: '6px',
        border: '1px solid #ced4da', fontSize: '13px',
        background: disabled ? '#f8f9fa' : 'white',
        color: disabled ? '#adb5bd' : '#212529',
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
      }}
    >
      {TIME_OPTIONS.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

function Section({ title, children, disabled }: {
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div style={{
      padding: '16px', borderRadius: '10px', marginBottom: '12px',
      background: disabled ? '#f8f9fa' : 'white',
      border: '1px solid #e9ecef',
      opacity: disabled ? 0.5 : 1,
    }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700,
                   color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </h4>
      {children}
    </div>
  );
}


export default function SettingsReminders({ clinicId }: { clinicId: string }) {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchSettings = useCallback(() => {
    setLoading(true);
    api.apiFetch(`/api/settings/reminders?clinic_id=${clinicId}`)
      .then(data => setSettings(data))
      .catch(() => alert('Failed to load reminder settings'))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const update = (key: keyof ReminderSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.apiFetch(`/api/settings/reminders?clinic_id=${clinicId}`, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setDirty(false);
    } catch { alert('Network error'); }
    finally { setSaving(false); }
  };

  if (loading || !settings) {
    return <div style={{ padding: '20px', color: '#6c757d' }}>Loading reminder settings...</div>;
  }

  const channelsOff = !settings.whatsapp_enabled && !settings.sms_enabled;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#212529', margin: 0 }}>
          🔔 Automated Reminders
        </h3>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 20px', borderRadius: '6px', border: 'none',
              background: TEAL, color: 'white', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        )}
      </div>

      {/* Master channel toggles */}
      <Section title="Channels">
        <ToggleSwitch
          checked={settings.whatsapp_enabled}
          onChange={v => update('whatsapp_enabled', v)}
          label="WhatsApp"
          description="Send reminders via WhatsApp using configured transport"
        />
        <div style={{ borderTop: '1px solid #f1f3f5' }}>
          <ToggleSwitch
            checked={settings.sms_enabled}
            onChange={v => update('sms_enabled', v)}
            label="SMS Fallback"
            description="Send via SMS when WhatsApp delivery fails (requires SMS gateway)"
          />
        </div>
      </Section>

      {channelsOff && (
        <div style={{
          padding: '10px 14px', background: '#fff5f5', border: '1px solid #ffc9c9',
          borderRadius: '8px', fontSize: '13px', color: '#c92a2a', marginBottom: '12px'
        }}>
          ⚠️ All channels are off — no reminders will be sent.
        </div>
      )}

      {/* Appointment Reminders */}
      <Section title="Appointment Reminders" disabled={channelsOff}>
        <ToggleSwitch
          checked={settings.appt_24h_enabled}
          onChange={v => update('appt_24h_enabled', v)}
          label="24 hours before"
          description="Day-before reminder. Fires at the configured time below."
        />
        {settings.appt_24h_enabled && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '4px 0 8px 0', marginLeft: '12px',
            borderLeft: `2px solid ${TEAL}33`, paddingLeft: '12px',
          }}>
            <span style={{ fontSize: '12px', color: '#6c757d' }}>Send at:</span>
            <TimeSelect
              value={settings.appt_24h_send_time}
              onChange={v => update('appt_24h_send_time', v)}
              disabled={channelsOff}
            />
            <span style={{ fontSize: '11px', color: '#adb5bd' }}>
              (yesterday for today&apos;s appointments)
            </span>
          </div>
        )}

        <div style={{ borderTop: '1px solid #f1f3f5' }}>
          <ToggleSwitch
            checked={settings.appt_2h_enabled}
            onChange={v => update('appt_2h_enabled', v)}
            label="2 hours before"
            description="Sent automatically 2 hours before the appointment time"
          />
        </div>

        <div style={{ borderTop: '1px solid #f1f3f5' }}>
          <ToggleSwitch
            checked={settings.appt_30m_enabled}
            onChange={v => update('appt_30m_enabled', v)}
            label="30 minutes before"
            description="Last-minute reminder. Use for high no-show clinics."
          />
        </div>
      </Section>

      {/* Follow-up Reminders */}
      <Section title="Follow-up Reminders" disabled={channelsOff}>
        <ToggleSwitch
          checked={settings.followup_day_enabled}
          onChange={v => update('followup_day_enabled', v)}
          label="On follow-up day"
          description="Remind patient on the day their follow-up is due"
        />
        {settings.followup_day_enabled && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '4px 0 8px 0', marginLeft: '12px',
            borderLeft: `2px solid ${TEAL}33`, paddingLeft: '12px',
          }}>
            <span style={{ fontSize: '12px', color: '#6c757d' }}>Send at:</span>
            <TimeSelect
              value={settings.followup_day_send_time}
              onChange={v => update('followup_day_send_time', v)}
            />
          </div>
        )}

        <div style={{ borderTop: '1px solid #f1f3f5' }}>
          <ToggleSwitch
            checked={settings.followup_1day_before_enabled}
            onChange={v => update('followup_1day_before_enabled', v)}
            label="1 day before"
            description="Day-before nudge for follow-up appointments"
          />
        </div>

        <div style={{ borderTop: '1px solid #f1f3f5' }}>
          <ToggleSwitch
            checked={settings.followup_7day_before_enabled}
            onChange={v => update('followup_7day_before_enabled', v)}
            label="7 days before"
            description="Early reminder for long-gap follow-ups"
          />
        </div>
      </Section>

      {/* Payment Reminders */}
      <Section title="Payment Reminders" disabled={channelsOff}>
        <ToggleSwitch
          checked={settings.payment_3day_enabled}
          onChange={v => update('payment_3day_enabled', v)}
          label="3 days overdue"
          description="Gentle nudge for pending payments older than 3 days"
        />
        <div style={{ borderTop: '1px solid #f1f3f5' }}>
          <ToggleSwitch
            checked={settings.payment_7day_enabled}
            onChange={v => update('payment_7day_enabled', v)}
            label="7 days overdue"
            description="Firmer reminder for week-old pending payments"
          />
        </div>
      </Section>

      {/* Birthday */}
      <Section title="Birthday Wishes" disabled={channelsOff}>
        <ToggleSwitch
          checked={settings.birthday_enabled}
          onChange={v => update('birthday_enabled', v)}
          label="Send birthday wishes"
          description="Patient gets a wish on their birthday (uses 'birthday_wishes' template)"
        />
        {settings.birthday_enabled && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '4px 0 8px 0', marginLeft: '12px',
            borderLeft: `2px solid ${TEAL}33`, paddingLeft: '12px',
          }}>
            <span style={{ fontSize: '12px', color: '#6c757d' }}>Send at:</span>
            <TimeSelect
              value={settings.birthday_send_time}
              onChange={v => update('birthday_send_time', v)}
            />
          </div>
        )}
      </Section>

      {/* Daily Digest */}
      <Section title="Daily Digest to Staff" disabled={channelsOff}>
        <ToggleSwitch
          checked={settings.morning_digest_enabled}
          onChange={v => update('morning_digest_enabled', v)}
          label="Morning summary"
          description="Doctor + nurses get today's appointment count, pending labs, etc."
        />
        {settings.morning_digest_enabled && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '4px 0 8px 0', marginLeft: '12px',
            borderLeft: `2px solid ${TEAL}33`, paddingLeft: '12px',
          }}>
            <span style={{ fontSize: '12px', color: '#6c757d' }}>Send at:</span>
            <TimeSelect
              value={settings.morning_digest_send_time}
              onChange={v => update('morning_digest_send_time', v)}
            />
          </div>
        )}
      </Section>

      {/* Setup notice */}
      <div style={{
        marginTop: '20px', padding: '12px 16px', borderRadius: '8px',
        background: '#e7f5ff', border: '1px solid #74c0fc', fontSize: '13px', color: '#1864ab'
      }}>
        ℹ️ <strong>Scheduler required:</strong> Reminders fire via background job. Setup options:
        <ul style={{ margin: '6px 0 0 20px', padding: 0 }}>
          <li>APScheduler (embedded, easiest) — auto-starts with backend</li>
          <li>External cron: <code>*/5 * * * * curl -X POST http://localhost:8000/jobs/reminders/tick</code></li>
          <li>n8n workflow — schedule trigger every 5 min → HTTP node → /jobs/reminders/tick</li>
        </ul>
      </div>

      {dirty && (
        <div style={{
          position: 'sticky', bottom: '20px', marginTop: '20px',
          padding: '12px 16px', borderRadius: '8px',
          background: '#fff9db', border: '1px solid #ffe066',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '13px', color: '#856404' }}>You have unsaved changes</span>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 24px', borderRadius: '6px', border: 'none',
              background: TEAL, color: 'white', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            {saving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      )}
    </div>
  );
}
