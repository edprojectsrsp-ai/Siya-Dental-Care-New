/**
 * PortalLinkGenerator.tsx — Bundle U, Sprint T+2 helper
 *
 * Generates a magic link for the patient portal and shares via WhatsApp.
 *
 * INTEGRATION (Patient detail view or Appointment context):
 *   import PortalLinkGenerator from './PortalLinkGenerator';
 *   <PortalLinkGenerator patientId={patient.id} patientPhone={patient.phone} patientName={patient.name} />
 */

import React, { useState } from 'react';
import * as api from "@/lib/api";
const TEAL = '#0E7C7B';

export default function PortalLinkGenerator({
  patientId, patientPhone, patientName
}: {
  patientId: string;
  patientPhone: string;
  patientName: string;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await api.apiFetch(`/api/portal/generate-token?patient_id=${patientId}&expires_days=30`, { method: 'POST' });
      setToken(data.token);
      const base = typeof window !== "undefined" ? window.location.origin : "";
      setLink(`${base}/p/${data.token}`);
    } catch { alert('Failed to generate link'); }
    finally { setGenerating(false); }
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!link) return;
    const msg = `Hi ${patientName},\n\nView your appointments, prescriptions, and payment history securely:\n${link}\n\nThis link is valid for 30 days.\n\n- Siya Dental Care`;
    let phone = patientPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '91' + phone.slice(1);
    if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!link) {
    return (
      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{
          padding: '8px 16px', borderRadius: '6px', border: 'none',
          background: TEAL, color: 'white', fontSize: '13px',
          fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
          alignItems: 'center', gap: '6px',
        }}
      >
        {generating ? 'Generating...' : '🔗 Share Patient Portal Link'}
      </button>
    );
  }

  return (
    <div style={{
      padding: '12px', borderRadius: '8px',
      background: '#e8f5f5', border: `1px solid ${TEAL}33`,
    }}>
      <div style={{ fontSize: '11px', color: '#0A5C5B', fontWeight: 700, marginBottom: '4px' }}>
        PORTAL LINK (30-day access)
      </div>
      <div style={{
        fontSize: '12px', color: '#495057', fontFamily: 'monospace',
        padding: '6px 8px', background: 'white', borderRadius: '4px',
        wordBreak: 'break-all', marginBottom: '8px',
      }}>
        {link}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          onClick={handleCopy}
          style={{
            padding: '6px 12px', borderRadius: '6px',
            border: '1px solid #dee2e6', background: 'white', color: '#495057',
            fontSize: '12px', cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
        <button
          onClick={handleShareWhatsApp}
          style={{
            padding: '6px 12px', borderRadius: '6px', border: 'none',
            background: '#25D366', color: 'white', fontSize: '12px',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          💬 Send via WhatsApp
        </button>
      </div>
    </div>
  );
}
