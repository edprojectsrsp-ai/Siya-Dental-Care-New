/**
 * RevenueDashboard — Bundle X Pass 3
 *
 * 30-day revenue chart (stacked bars): treatment collected, outstanding.
 * Summary cards: patient outstanding, specialist outstanding, lab outstanding, net position.
 * Drill-down: click a card → opens the relevant Workshop tracker.
 *
 * GET /api/revenue/full?clinic_id=&days=30
 */
import React, { useEffect, useState } from "react";
import { TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import * as api from "@/lib/api";

const TEAL = "#0E7C7B";
const TEAL_DEEP = "#0A5C5B";
const LINE = "#E2E8F0";
const INK = "#1F2937";
const MUTE = "#64748B";
const SOFT = "#F8FAFC";
const GREEN = "#059669";
const RED = "#DC2626";
const AMBER = "#F59E0B";

const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

export default function RevenueDashboard({ clinicId, accent = TEAL, onDrillDown }: {
  clinicId?: string;
  accent?: string;
  onDrillDown?: (target: "lab_pay" | "spec_pay") => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    api.revenueFull(clinicId, 30)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [clinicId]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: MUTE }}>Loading revenue data…</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: MUTE }}>No revenue data available.</div>;

  const daily: { day: string; collected: number }[] = data.daily || [];
  const maxVal = Math.max(...daily.map(d => d.collected), 1);

  return (
    <div>
      <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 800, color: INK }}>
        <TrendingUp size={22} style={{ verticalAlign: "middle", marginRight: 8, color: accent }} />
        Revenue Overview (30 Days)
      </h2>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <SummaryCard label="Total Collected" value={fmt(data.total_collected)} color={GREEN} icon="💰" />
        <SummaryCard label="Patient Outstanding" value={fmt(data.patient_outstanding)} color={data.patient_outstanding > 0 ? RED : GREEN} icon="⏳" />
        <SummaryCard
          label="Specialist Due"
          value={fmt(data.specialist_outstanding)}
          color={data.specialist_outstanding > 0 ? AMBER : GREEN}
          icon="👨‍⚕️"
          onClick={() => onDrillDown?.("spec_pay")}
        />
        <SummaryCard
          label="Lab Due"
          value={fmt(data.lab_outstanding)}
          color={data.lab_outstanding > 0 ? AMBER : GREEN}
          icon="🧪"
          onClick={() => onDrillDown?.("lab_pay")}
        />
        <SummaryCard
          label="Net Position"
          value={fmt(data.net_position)}
          color={data.net_position >= 0 ? GREEN : RED}
          icon={data.net_position >= 0 ? "📈" : "📉"}
        />
      </div>

      {/* Bar chart */}
      <div style={{
        background: "#fff", borderRadius: 14, border: `1.5px solid ${LINE}`,
        padding: 16, overflow: "hidden",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: MUTE, marginBottom: 12 }}>Daily Collection</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 160 }}>
          {daily.map((d, i) => {
            const pct = (d.collected / maxVal) * 100;
            const dayLabel = d.day.slice(8, 10);  // DD
            const isToday = i === daily.length - 1;
            return (
              <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                <div style={{ fontSize: 9, color: MUTE, marginBottom: 2 }}>
                  {d.collected > 0 ? `${(d.collected / 1000).toFixed(1)}k` : ""}
                </div>
                <div style={{
                  width: "100%", maxWidth: 28,
                  height: `${Math.max(pct, 2)}%`,
                  background: isToday
                    ? `linear-gradient(180deg,${accent},${accent}BB)`
                    : d.collected > 0 ? `${accent}55` : `${LINE}`,
                  borderRadius: "4px 4px 0 0",
                  transition: "height .3s",
                }} title={`${d.day}: ${fmt(d.collected)}`} />
                <div style={{
                  fontSize: 9, color: isToday ? accent : MUTE,
                  fontWeight: isToday ? 800 : 400, marginTop: 4,
                }}>{dayLabel}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drill-down hint */}
      {onDrillDown && (
        <div style={{ fontSize: 12, color: MUTE, marginTop: 10, textAlign: "center" }}>
          Click "Specialist Due" or "Lab Due" cards to see detailed payables.
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, icon, onClick }: {
  label: string; value: string; color: string; icon: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff", borderRadius: 14, border: `1.5px solid ${LINE}`,
        padding: 16, cursor: onClick ? "pointer" : "default",
        transition: "box-shadow .15s, border-color .15s",
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 12px ${color}22`; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = LINE; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 11.5, color: MUTE, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, marginTop: 4 }}>{value}</div>
      {onClick && <div style={{ fontSize: 10, color: MUTE, marginTop: 4 }}>Click to view details →</div>}
    </div>
  );
}
