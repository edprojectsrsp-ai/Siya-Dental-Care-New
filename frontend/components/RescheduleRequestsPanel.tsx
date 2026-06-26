/**
 * RescheduleRequestsPanel.tsx — Bundle U, Sprint T+2
 *
 * Nurse view: incoming reschedule requests from patient portal.
 * Approve/decline workflow.
 *
 * INTEGRATION:
 *   import RescheduleRequestsPanel from './RescheduleRequestsPanel';
 *   // Show on AppointmentHub or as separate tab
 */

import React, { useState, useEffect, useCallback } from 'react';
import * as api from "@/lib/api";
const TEAL = '#0E7C7B';

interface RescheduleRequest {
  id: string;
  patient_id: string;
  appointment_id: string;
  full_name: string;
  phone: string;
  original_date: string;
  requested_date: string;
  requested_time?: string;
  reason?: string;
  created_at: string;
  status: string;
}

export default function RescheduleRequestsPanel({ clinicId }: { clinicId: string }) {
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchRequests = useCallback(() => {
    api.apiFetch(`/api/reschedule-requests?clinic_id=${clinicId}&status=pending`)
      .then(data => setRequests(data.requests || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleResolve = async (id: string, approve: boolean) => {
    setResolving(id);
    try {
      await api.apiFetch(`/api/reschedule-requests/${id}/resolve?approve=${approve}`, { method: 'PATCH' });
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch { alert('Failed'); }
    finally { setResolving(null); }
  };

  if (loading) return <div style={{ padding: '16px', color: '#6c757d' }}>Loading...</div>;
  if (requests.length === 0) return null;

  return (
    <div style={{
      background: '#e7f5ff', border: '1px solid #74c0fc', borderRadius: '10px',
      padding: '16px', marginBottom: '16px',
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700, color: '#1864ab' }}>
        📅 Patient Reschedule Requests ({requests.length})
      </h3>

      {requests.map(req => (
        <div key={req.id} style={{
          background: 'white', padding: '12px 14px', borderRadius: '8px',
          marginBottom: '8px', border: '1px solid #d0ebff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#212529' }}>
                {req.full_name}
                <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: 400, marginLeft: '8px' }}>
                  {req.phone}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#495057', marginTop: '6px' }}>
                <strong>From:</strong> {new Date(req.original_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <div style={{ fontSize: '12px', color: '#1864ab', fontWeight: 600 }}>
                <strong>To:</strong> {new Date(req.requested_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {req.requested_time && ` at ${req.requested_time}`}
              </div>
              {req.reason && (
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px', fontStyle: 'italic' }}>
                  &ldquo;{req.reason}&rdquo;
                </div>
              )}
              <div style={{ fontSize: '10px', color: '#adb5bd', marginTop: '4px' }}>
                Requested {new Date(req.created_at).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => handleResolve(req.id, true)}
                disabled={resolving === req.id}
                style={{
                  padding: '6px 14px', borderRadius: '6px', border: 'none',
                  background: '#2f9e44', color: 'white', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                {resolving === req.id ? '...' : '✓ Approve'}
              </button>
              <button
                onClick={() => handleResolve(req.id, false)}
                disabled={resolving === req.id}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  border: '1px solid #ff8787', background: 'white', color: '#c92a2a',
                  fontSize: '12px', cursor: 'pointer',
                }}
              >
                ✕ Decline
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
