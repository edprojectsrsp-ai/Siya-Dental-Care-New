/**
 * PatientPortal.tsx — Bundle U, Sprint T+2
 *
 * Patient-facing public portal accessed via magic-link token.
 * Route: /p/[token]/page.tsx
 *
 * INTEGRATION:
 *   Create Next.js route: app/p/[token]/page.tsx
 *   Renders <PatientPortal token={token} />
 */

import React, { useState, useEffect, useCallback } from 'react';
import '@/app/public-site.css';

// Same-origin /api proxy → FastAPI (see next.config.js rewrites)
const API = "/api";
const TEAL = '#0E7C7B';
const TEAL_DARK = '#0A5C5B';
const TEAL_LIGHT = '#e8f5f5';

interface PortalData {
  patient: { id: string; full_name: string; phone: string; email?: string };
  upcoming_appointments: Array<{
    id: string; appointment_date: string; appointment_time?: string;
    status: string; illness?: string; doctor_name?: string;
  }>;
  past_prescriptions: Array<{
    id: string; created_at: string; complaint: string;
    follow_up_date?: string; status: string;
  }>;
  payment_summary: { total_paid: number; total_transactions: number };
  pending_payments: Array<{
    id: string; total_cost: number; paid_amount: number; pending_amount: number;
  }>;
}

export default function PatientPortal({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'home' | 'appointments' | 'history' | 'payments'>('home');
  const [rescheduling, setRescheduling] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`${API}/portal/${token}/dashboard`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 401 ? 'Link expired' : 'Invalid link');
        return r.json();
      })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="ps-root">
        <div className="ps-loading">Loading your dashboard…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ps-root" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
        <div className="ps-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
          <h2 className="ps-display" style={{ fontSize: '1.35rem' }}>{error || 'Unable to load'}</h2>
          <p style={{ color: 'var(--ps-muted)', fontSize: '0.9rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
            Please contact Siya Dental Care to get a new access link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-root" style={{ minHeight: '100vh', background: 'var(--ps-bg)' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
        color: 'white', padding: '24px 20px',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="ps-eyebrow" style={{ color: 'rgba(255,255,255,.75)' }}>Patient portal</div>
          <h1 className="ps-display" style={{ margin: '6px 0 0', fontSize: '1.65rem', color: '#fff' }}>
            Welcome, {data.patient.full_name}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px', padding: '12px 20px 0',
        maxWidth: '600px', margin: '0 auto', overflowX: 'auto',
      }}>
        {([
          { key: 'home', label: '🏠 Home' },
          { key: 'appointments', label: '📅 Appointments' },
          { key: 'history', label: '💊 History' },
          { key: 'payments', label: '₹ Payments' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 16px', borderRadius: '8px 8px 0 0',
              border: 'none', background: tab === t.key ? 'white' : 'transparent',
              color: tab === t.key ? TEAL_DARK : '#6c757d',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: 'white', maxWidth: '600px', margin: '0 auto', minHeight: 'calc(100vh - 200px)', padding: '20px' }}>
        {tab === 'home' && (
          <div>
            {/* Quick stats */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 140px', padding: '16px', background: TEAL_LIGHT, borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: TEAL_DARK, fontWeight: 600 }}>UPCOMING</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: TEAL_DARK }}>
                  {data.upcoming_appointments.length}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>appointments</div>
              </div>
              <div style={{ flex: '1 1 140px', padding: '16px', background: '#fff3cd', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: '#856404', fontWeight: 600 }}>PENDING</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#856404' }}>
                  ₹{(data.pending_payments.reduce((s, p) => s + p.pending_amount, 0) || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>payments due</div>
              </div>
            </div>

            {/* Next appointment */}
            {data.upcoming_appointments[0] && (
              <div style={{
                padding: '16px', borderRadius: '10px', border: `2px solid ${TEAL}33`,
                background: TEAL_LIGHT, marginBottom: '16px',
              }}>
                <div style={{ fontSize: '11px', color: TEAL_DARK, fontWeight: 600, marginBottom: '4px' }}>
                  YOUR NEXT VISIT
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#212529' }}>
                  {new Date(data.upcoming_appointments[0].appointment_date).toLocaleDateString('en-IN', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  })}
                </div>
                {data.upcoming_appointments[0].appointment_time && (
                  <div style={{ fontSize: '14px', color: TEAL_DARK, marginTop: '2px' }}>
                    🕐 {data.upcoming_appointments[0].appointment_time}
                  </div>
                )}
                <button
                  onClick={() => { setTab('appointments'); setRescheduling(data.upcoming_appointments[0].id); }}
                  style={{
                    marginTop: '10px', padding: '6px 14px', borderRadius: '6px',
                    border: `1px solid ${TEAL}`, background: 'white', color: TEAL_DARK,
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  📅 Request Reschedule
                </button>
              </div>
            )}

            {/* Quick actions */}
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#495057', marginBottom: '10px' }}>
                Quick Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => window.open(`tel:+918895050000`)}
                  style={qaButtonStyle}>
                  📞 Call clinic
                </button>
                <button onClick={() => window.open(`https://wa.me/918895050000`)}
                  style={{ ...qaButtonStyle, background: '#25D366', color: 'white', borderColor: '#25D366' }}>
                  💬 WhatsApp clinic
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'appointments' && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0 }}>
              Upcoming Appointments
            </h3>
            {data.upcoming_appointments.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#adb5bd' }}>
                No upcoming appointments
              </div>
            ) : (
              data.upcoming_appointments.map(apt => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  token={token}
                  isRescheduling={rescheduling === apt.id}
                  onStartReschedule={() => setRescheduling(apt.id)}
                  onCancelReschedule={() => setRescheduling(null)}
                  onSuccess={() => { setRescheduling(null); fetchData(); }}
                />
              ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0 }}>Prescription History</h3>
            {data.past_prescriptions.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#adb5bd' }}>
                No past prescriptions
              </div>
            ) : (
              data.past_prescriptions.map(rx => (
                <div key={rx.id} style={{
                  padding: '14px', borderRadius: '8px', border: '1px solid #e9ecef',
                  marginBottom: '8px',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#212529' }}>
                    {new Date(rx.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </div>
                  <div style={{ fontSize: '13px', color: '#495057', marginTop: '4px' }}>
                    {rx.complaint || 'Visit summary'}
                  </div>
                  {rx.follow_up_date && (
                    <div style={{ fontSize: '12px', color: TEAL_DARK, marginTop: '6px' }}>
                      📅 Follow-up: {new Date(rx.follow_up_date).toLocaleDateString('en-IN')}
                    </div>
                  )}
                  <a href={`${API}/prescriptions/${rx.id}/pdf`} target="_blank" rel="noreferrer"
                    style={{
                      display: 'inline-block', marginTop: '8px',
                      padding: '4px 12px', borderRadius: '4px',
                      background: TEAL_LIGHT, color: TEAL_DARK,
                      fontSize: '12px', fontWeight: 600, textDecoration: 'none',
                    }}>
                    📄 View PDF
                  </a>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0 }}>Payment Summary</h3>

            <div style={{
              padding: '16px', borderRadius: '10px', background: TEAL_LIGHT,
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: TEAL_DARK }}>Total Paid</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: TEAL_DARK }}>
                    ₹{Number(data.payment_summary.total_paid).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: TEAL_DARK }}>Transactions</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: TEAL_DARK }}>
                    {data.payment_summary.total_transactions}
                  </div>
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#495057', marginTop: '16px' }}>
              Pending Balances
            </h4>
            {data.pending_payments.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#2b8a3e' }}>
                ✅ No pending payments
              </div>
            ) : (
              data.pending_payments.map(pp => (
                <div key={pp.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px', borderRadius: '8px', border: '1px solid #ffe066',
                  background: '#fff9db', marginBottom: '8px',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#495057' }}>
                      Plan: ₹{Number(pp.total_cost).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>
                      Paid ₹{Number(pp.paid_amount).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#856404' }}>PENDING</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#856404' }}>
                      ₹{Number(pp.pending_amount).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: '#adb5bd' }}>
        Siya Dental Care · Powered by secure portal
      </div>
    </div>
  );
}

const qaButtonStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: '8px',
  border: `1px solid ${TEAL}`,
  background: 'white',
  color: TEAL_DARK,
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left',
};


// ============================================================
// Appointment Card with Reschedule Form
// ============================================================

function AppointmentCard({
  appointment, token, isRescheduling, onStartReschedule, onCancelReschedule, onSuccess
}: {
  appointment: any; token: string;
  isRescheduling: boolean;
  onStartReschedule: () => void;
  onCancelReschedule: () => void;
  onSuccess: () => void;
}) {
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!requestedDate) { alert('Please pick a new date'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/portal/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointment.id,
          requested_date: requestedDate,
          requested_time: requestedTime || null,
          reason: reason || null,
        })
      });
      if (res.ok) {
        alert('Reschedule request sent. The clinic will confirm shortly.');
        onSuccess();
      } else {
        alert('Failed to submit request');
      }
    } catch { alert('Network error'); }
    finally { setSubmitting(false); }
  };

  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <div style={{
      padding: '14px', borderRadius: '8px',
      border: `1px solid ${isRescheduling ? TEAL : '#e9ecef'}`,
      background: isRescheduling ? TEAL_LIGHT : 'white',
      marginBottom: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#212529' }}>
            {new Date(appointment.appointment_date).toLocaleDateString('en-IN', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            })}
          </div>
          {appointment.appointment_time && (
            <div style={{ fontSize: '13px', color: '#495057', marginTop: '2px' }}>
              🕐 {appointment.appointment_time}
            </div>
          )}
          {appointment.illness && (
            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
              For: {appointment.illness}
            </div>
          )}
        </div>
        <span style={{
          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
          background: appointment.status === 'confirmed' ? '#d3f9d8' : '#fff3cd',
          color: appointment.status === 'confirmed' ? '#2b8a3e' : '#856404',
        }}>
          {appointment.status}
        </span>
      </div>

      {isRescheduling ? (
        <div style={{ marginTop: '12px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            Request New Date
          </div>
          <input
            type="date"
            value={requestedDate}
            min={minDate}
            onChange={e => setRequestedDate(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ced4da', marginBottom: '6px' }}
          />
          <input
            type="time"
            value={requestedTime}
            onChange={e => setRequestedTime(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ced4da', marginBottom: '6px' }}
            placeholder="Preferred time (optional)"
          />
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={2}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ced4da', fontFamily: 'inherit', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1, padding: '10px', borderRadius: '6px', border: 'none',
                background: TEAL, color: 'white', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Sending...' : '✓ Send Request'}
            </button>
            <button
              onClick={onCancelReschedule}
              style={{
                padding: '10px 14px', borderRadius: '6px',
                border: '1px solid #dee2e6', background: 'white', color: '#495057',
                fontSize: '13px', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onStartReschedule}
          style={{
            marginTop: '10px', padding: '6px 12px', borderRadius: '6px',
            border: `1px solid ${TEAL}`, background: 'white', color: TEAL_DARK,
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          📅 Reschedule
        </button>
      )}
    </div>
  );
}
