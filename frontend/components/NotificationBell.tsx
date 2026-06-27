"use client";
// ╔══════════════════════════════════════════════════════════════════╗
// ║  NOTIFICATION BELL — unified clinic activity feed.                ║
// ║  Surfaces clinic_notifications (arrivals, bookings, overdue labs,  ║
// ║  payments) as a header bell with unread badge + dropdown feed.    ║
// ╚══════════════════════════════════════════════════════════════════╝
import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "@/lib/api";

const PRIORITY: Record<string, string> = { high: "#EF4444", urgent: "#EF4444", medium: "#F59E0B", normal: "#64748B", low: "#94A3B8" };
const ICON: Record<string, string> = {
  patient_arrived: "🟢", appointment_booked: "📅", booking_request: "🌐", payment_due: "💰",
  payment_received: "💵", lab_overdue: "🧪", lab_ready: "🧪", followup_due: "🔔", message: "💬",
};

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationBell({ clinicId, accent = "#6366F1", onNavigate }:
  { clinicId?: string; accent?: string; onNavigate?: (section: string) => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    if (!clinicId) return;
    try { const r = await api.notifUnreadCount(clinicId); setUnread(r?.unread || 0); } catch {}
  }, [clinicId]);

  const loadList = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try { const r = await api.notifList(clinicId, false, 30); setItems(Array.isArray(r) ? r : []); } catch {}
    finally { setLoading(false); }
  }, [clinicId]);

  useEffect(() => { loadCount(); const i = setInterval(loadCount, 20000); return () => clearInterval(i); }, [loadCount]);
  useEffect(() => { if (open) loadList(); }, [open, loadList]);

  // close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const markAll = async () => {
    if (!clinicId) return;
    try { await api.notifMarkAllRead(clinicId); setItems(items.map(i => ({ ...i, is_read: true }))); setUnread(0); } catch {}
  };

  const clickItem = async (n: any) => {
    if (!n.is_read) {
      try { await api.notifMarkRead(n.id); } catch {}
      setItems(items.map(i => i.id === n.id ? { ...i, is_read: true } : i));
      setUnread(u => Math.max(0, u - 1));
    }
    if (onNavigate) {
      if (n.related_appointment_id || n.type === "patient_arrived" || n.type === "booking_request") onNavigate("appointments");
      else if (n.type === "lab_overdue" || n.type === "lab_ready") onNavigate("lab");
      else if (n.type === "payment_due") onNavigate("billing");
    }
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} title="Notifications"
        style={{ position: "relative", border: "1px solid #334155", borderRadius: 10, padding: "6px 10px", background: "transparent", color: "#94A3B8", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>
        🔔
        {unread > 0 && (
          <span style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 9, background: "#EF4444", color: "#fff", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px #0F172A" }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 360, maxWidth: "90vw", background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,.25)", zIndex: 200, overflow: "hidden", color: "#0F172A" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #E2E8F0" }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Notifications</span>
            {unread > 0 && <button onClick={markAll} style={{ border: "none", background: "transparent", color: accent, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Mark all read</button>}
          </div>
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 30, textAlign: "center", color: "#64748B", fontSize: 13 }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>You're all caught up</div>
              </div>
            ) : items.map(n => (
              <button key={n.id} onClick={() => clickItem(n)}
                style={{ width: "100%", textAlign: "left", border: "none", borderBottom: "1px solid #F1F5F9", background: n.is_read ? "#fff" : "#F5F7FF", padding: "12px 16px", cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start", fontFamily: "inherit" }}>
                <span style={{ fontSize: 16, marginTop: 1 }}>{ICON[n.type] || "🔔"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: 4, background: PRIORITY[n.priority] || accent, flexShrink: 0 }} />}
                    <span style={{ fontWeight: n.is_read ? 600 : 800, fontSize: 13.5, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                  </div>
                  {n.message && <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2, lineHeight: 1.35 }}>{n.message}</div>}
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>{timeAgo(n.created_at)}{n.sender_name ? ` · ${n.sender_name}` : ""}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
