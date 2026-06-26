"use client";
// ╔══════════════════════════════════════════════════════════════════╗
// ║  LAB GUARD BANNER — warns about pending lab orders before        ║
// ║  scheduling or starting treatment.                                ║
// ║                                                                   ║
// ║  Usage examples:                                                  ║
// ║    <LabGuardBanner patientId={W.patient.id} />                    ║
// ║    <LabGuardBanner patientId={pid} compact />  (in modals)        ║
// ║                                                                   ║
// ║  Set onBlock={true} on critical actions to use the returned       ║
// ║  `blocked` boolean from the hook below to disable Start buttons.  ║
// ╚══════════════════════════════════════════════════════════════════╝
import { useState, useEffect, useCallback } from "react";
import * as api from "@/lib/api";

const MUTE = "#64748B", LINE = "#E2E8F0";

interface GuardResp {
  blocked: boolean;
  pending: any[];
  received_ready: any[];
  summary: string;
}

/** Hook version — returns the guard state for use in disable logic. */
export function useLabGuard(patientId?: string) {
  const [data, setData] = useState<GuardResp | null>(null);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    if (!patientId) { setData(null); return; }
    setLoading(true);
    try { setData(await api.labGuard(patientId)); }
    catch { setData({ blocked: false, pending: [], received_ready: [], summary: "" }); }
    finally { setLoading(false); }
  }, [patientId]);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, reload, blocked: data?.blocked || false };
}

/** Banner — pass patientId. Returns null when no pending or ready lab work. */
export function LabGuardBanner({ patientId, compact, onLabClick }: { patientId?: string; compact?: boolean; onLabClick?: () => void }) {
  const { data, reload } = useLabGuard(patientId);
  if (!data || (data.pending.length === 0 && data.received_ready.length === 0)) return null;

  const hasPending = data.pending.length > 0;
  const hasReady = data.received_ready.length > 0;
  // Priority: overdue > pending > ready
  const overdueCount = data.pending.filter(p => p.is_overdue).length;
  const headlineColor = overdueCount > 0 ? "#DC2626" : hasPending ? "#F59E0B" : "#10B981";
  const headlineBg = overdueCount > 0 ? "#FEF2F2" : hasPending ? "#FFFBEB" : "#F0FDF4";
  const headline =
    overdueCount > 0 ? `⚠ ${overdueCount} OVERDUE lab order${overdueCount > 1 ? "s" : ""}`
    : hasPending ? `🧪 ${data.pending.length} pending lab order${data.pending.length > 1 ? "s" : ""}`
    : `✓ ${data.received_ready.length} lab work ready to fit`;

  if (compact) {
    return (
      <div style={{
        background: headlineBg, color: headlineColor, border: `1.5px solid ${headlineColor}55`,
        padding: "8px 12px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {headline}
        {onLabClick && <button onClick={onLabClick} style={{ background: headlineColor, color: "#fff", border: "none", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>View →</button>}
      </div>
    );
  }

  const receiveOrder = async (orderId: string) => {
    if (!confirm("Mark this lab order as received?")) return;
    try { await api.labReceiveOrder(orderId); reload(); }
    catch { /* silent */ }
  };

  return (
    <div style={{
      background: headlineBg, border: `2px solid ${headlineColor}55`, borderRadius: 14,
      padding: "12px 16px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: headlineColor }}>{headline}</div>
        {onLabClick && <button onClick={onLabClick} style={{ background: headlineColor, color: "#fff", border: "none", borderRadius: 10, padding: "5px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Open Lab →</button>}
      </div>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
        {data.pending.map(o => (
          <div key={o.id} style={{
            background: "#fff", borderRadius: 10, padding: "8px 12px",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            border: o.is_overdue ? "1.5px solid #DC2626" : `1px solid ${LINE}`, flexWrap: "wrap" as const,
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <b style={{ fontSize: 13 }}>{o.work_type}</b>
              {Array.isArray(o.teeth) && o.teeth.length > 0 && <span style={{ color: MUTE, fontWeight: 700, fontSize: 11.5 }}> #{o.teeth.join(", ")}</span>}
              <div style={{ fontSize: 11.5, color: MUTE, marginTop: 2 }}>
                {o.vendor_name || "No vendor"} · Expected {o.expected_date || "—"}
                {o.is_overdue && <span style={{ color: "#DC2626", fontWeight: 800, marginLeft: 6 }}>⚠ overdue</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {o.vendor_whatsapp && (
                <a href={`https://wa.me/${o.vendor_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, status of ${o.work_type} order? Expected: ${o.expected_date || "N/A"}`)}`}
                   target="_blank" rel="noreferrer"
                   style={{ background: "#25D366", color: "#fff", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>💬 Chase</a>
              )}
              {o.vendor_phone && (
                <a href={`tel:${o.vendor_phone}`}
                   style={{ background: "#3B82F6", color: "#fff", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>📞 Call</a>
              )}
              <button onClick={() => receiveOrder(o.id)}
                style={{ background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                ✓ Mark Received
              </button>
            </div>
          </div>
        ))}
        {data.received_ready.map(o => (
          <div key={o.id} style={{
            background: "#fff", borderRadius: 10, padding: "8px 12px",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            border: "1.5px solid #10B981",
          }}>
            <div>
              <b style={{ fontSize: 13, color: "#059669" }}>✓ {o.work_type} READY</b>
              {Array.isArray(o.teeth) && o.teeth.length > 0 && <span style={{ color: MUTE, fontWeight: 700, fontSize: 11.5 }}> #{o.teeth.join(", ")}</span>}
              <div style={{ fontSize: 11.5, color: MUTE, marginTop: 2 }}>From {o.vendor_name || "lab"} — schedule fitting</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
