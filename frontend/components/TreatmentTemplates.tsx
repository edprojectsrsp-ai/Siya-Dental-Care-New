/**
 * TreatmentTemplates.tsx — Bundle U, Sprint T+7
 *
 * 1. Template manager (Settings section) — view/create/edit templates
 * 2. Template selector (in TreatmentWorkspace) — "Use Template" to instantiate plan
 * 3. Unified Patient PDF download button
 *
 * INTEGRATION:
 *   - Settings: <TreatmentTemplatesManager clinicId={clinicId} />
 *   - TreatmentWorkspace: <TemplateSelector patientId={pid} onSelect={() => refreshPlan()} />
 *   - Patients module: <UnifiedPdfButton patientId={pid} />
 */

import React, { useState, useEffect, useCallback } from 'react';
import * as api from "@/lib/api";
const TEAL = '#0E7C7B';
const TEAL_DARK = '#0A5C5B';

interface Procedure {
  procedure_name: string;
  sitting_no: number;
  notes: string;
}

interface Template {
  id: string;
  template_name: string;
  category: string;
  description: string;
  default_sittings: number;
  estimated_cost: number;
  procedures: Procedure[];
  default_advice: string;
  is_active: boolean;
}

const CATEGORIES = [
  { key: 'endodontic', label: 'Endodontic', icon: '🦷', color: '#1864ab' },
  { key: 'prosthetic', label: 'Prosthetic', icon: '👑', color: '#5f3dc4' },
  { key: 'restorative', label: 'Restorative', icon: '🔧', color: '#2b8a3e' },
  { key: 'periodontic', label: 'Periodontic', icon: '🪥', color: '#e67700' },
  { key: 'surgical', label: 'Surgical', icon: '⚕️', color: '#c92a2a' },
  { key: 'preventive', label: 'Preventive', icon: '✨', color: '#087f5b' },
  { key: 'orthodontic', label: 'Orthodontic', icon: '〰️', color: '#d6336c' },
];

function getCategoryStyle(cat: string) {
  return CATEGORIES.find(c => c.key === cat) || { icon: '📋', color: '#495057', label: cat };
}

// ============================================================
// Templates Manager (Settings)
// ============================================================

export function TreatmentTemplatesManager({ clinicId }: { clinicId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    api.apiFetch(`/api/treatment-templates?clinic_id=${clinicId}`)
      .then(data => {
        // Parse procedures if JSONB came back as string
        const parsed = (data.templates || []).map((t: any) => ({
          ...t,
          procedures: typeof t.procedures === 'string' ? JSON.parse(t.procedures) : t.procedures
        }));
        setTemplates(parsed);
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = filter === 'all' ? templates : templates.filter(t => t.category === filter);

  if (loading) return <div style={{ padding: '20px', color: '#6c757d' }}>Loading templates...</div>;

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#212529', marginBottom: '16px' }}>
        📋 Treatment Templates ({templates.length})
      </h3>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 14px', borderRadius: '20px',
            border: filter === 'all' ? `2px solid ${TEAL}` : '1px solid #dee2e6',
            background: filter === 'all' ? '#e8f5f5' : 'white',
            color: filter === 'all' ? TEAL_DARK : '#6c757d',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          All ({templates.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = templates.filter(t => t.category === cat.key).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              style={{
                padding: '6px 14px', borderRadius: '20px',
                border: filter === cat.key ? `2px solid ${cat.color}` : '1px solid #dee2e6',
                background: filter === cat.key ? `${cat.color}11` : 'white',
                color: filter === cat.key ? cat.color : '#6c757d',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Template cards */}
      {filtered.map(t => {
        const cs = getCategoryStyle(t.category);
        const isExpanded = expandedId === t.id;

        return (
          <div key={t.id} style={{
            border: '1px solid #e9ecef', borderRadius: '10px',
            marginBottom: '8px', overflow: 'hidden',
            background: 'white',
          }}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : t.id)}
              style={{
                padding: '14px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '8px',
                  background: `${cs.color}15`, color: cs.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {cs.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#212529' }}>
                    {t.template_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                    {t.default_sittings} sitting{t.default_sittings > 1 ? 's' : ''}
                    {t.estimated_cost > 0 && ` · ₹${Number(t.estimated_cost).toLocaleString()}`}
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: '12px', color: '#adb5bd',
                transform: isExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease'
              }}>
                ▼
              </span>
            </div>

            {isExpanded && (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f1f3f5' }}>
                {t.description && (
                  <p style={{ fontSize: '13px', color: '#495057', margin: '10px 0' }}>
                    {t.description}
                  </p>
                )}

                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6c757d',
                                 textTransform: 'uppercase', marginBottom: '6px' }}>
                    Procedures
                  </div>
                  {(t.procedures || []).map((p, i) => (
                    <div key={i} style={{
                      padding: '8px 10px', borderRadius: '6px',
                      background: '#f8f9fa', marginBottom: '4px',
                      fontSize: '12px',
                    }}>
                      <span style={{ fontWeight: 600, color: TEAL_DARK }}>
                        Sitting {p.sitting_no}:
                      </span>{' '}
                      <span style={{ color: '#212529' }}>{p.procedure_name}</span>
                      {p.notes && (
                        <div style={{ color: '#6c757d', fontSize: '11px', marginTop: '2px' }}>
                          {p.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {t.default_advice && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6c757d',
                                   textTransform: 'uppercase', marginBottom: '4px' }}>
                      Default Advice
                    </div>
                    <div style={{ fontSize: '12px', color: '#495057', padding: '8px',
                                   background: '#f8f9fa', borderRadius: '6px' }}>
                      {t.default_advice}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ============================================================
// Template Selector (modal in TreatmentWorkspace)
// ============================================================

export function TemplateSelector({
  clinicId, patientId, onSelect, onClose
}: {
  clinicId: string;
  patientId: string;
  onSelect: (planId: string) => void;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    api.apiFetch(`/api/treatment-templates?clinic_id=${clinicId}`)
      .then(data => {
        const parsed = (data.templates || []).map((t: any) => ({
          ...t,
          procedures: typeof t.procedures === 'string' ? JSON.parse(t.procedures) : t.procedures
        }));
        setTemplates(parsed);
      })
      .finally(() => setLoading(false));
  }, [clinicId]);

  const handleApply = async (templateId: string) => {
    setApplying(templateId);
    try {
      const data = await api.apiFetch(`/api/treatment-plans/from-template/${templateId}?patient_id=${patientId}`, { method: 'POST' });
      onSelect(data.plan_id);
      onClose();
    } catch { alert('Network error'); }
    finally { setApplying(null); }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      padding: '20px',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '12px',
          maxWidth: '600px', width: '100%', maxHeight: '85vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e9ecef',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            📋 Use a Treatment Template
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6c757d' }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ padding: '20px', color: '#6c757d' }}>Loading...</div>
          ) : (
            templates.map(t => {
              const cs = getCategoryStyle(t.category);
              return (
                <div key={t.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', borderRadius: '8px', marginBottom: '6px',
                  border: '1px solid #e9ecef',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <span style={{ fontSize: '20px' }}>{cs.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#212529' }}>
                        {t.template_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6c757d' }}>
                        {t.default_sittings} sitting{t.default_sittings > 1 ? 's' : ''}
                        {t.estimated_cost > 0 && ` · ₹${Number(t.estimated_cost).toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApply(t.id)}
                    disabled={applying === t.id}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', border: 'none',
                      background: TEAL, color: 'white',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {applying === t.id ? '...' : 'Use'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================
// Unified Patient PDF Button
// ============================================================

export function UnifiedPdfButton({ patientId, months = 12 }: {
  patientId: string;
  months?: number;
}) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const token = api.getToken();
      const res = await fetch(`/api/patients/${patientId}/unified-pdf?months=${months}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        alert('PDF generation failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `patient_summary_${patientId.slice(0, 8)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { alert('Network error'); }
    finally { setGenerating(false); }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      style={{
        padding: '8px 16px', borderRadius: '6px', border: 'none',
        background: TEAL, color: 'white', fontSize: '13px',
        fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
        alignItems: 'center', gap: '6px',
      }}
    >
      {generating ? 'Generating...' : '📄 Full Patient PDF'}
    </button>
  );
}

export default TreatmentTemplatesManager;
