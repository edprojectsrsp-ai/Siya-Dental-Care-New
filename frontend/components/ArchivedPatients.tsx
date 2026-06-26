/**
 * ArchivedPatients — Bundle X Pass 2
 *
 * Lists patients whose ALL treatment plans are completed/closed AND fully paid.
 * Accessible from the Patients module as a sub-tab or filter.
 */
import React, { useEffect, useState } from "react";
import { Archive, Search, User } from "lucide-react";
import * as api from "@/lib/api";

const TEAL = "#0E7C7B";
const LINE = "#E2E8F0";
const INK = "#1F2937";
const MUTE = "#64748B";
const SOFT = "#F8FAFC";
const GREEN = "#059669";
const BLUE = "#2563EB";

const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

export default function ArchivedPatients({
  clinicId,
  accent = TEAL,
  onReopened,
  show,
}: {
  clinicId?: string;
  accent?: string;
  onReopened?: (patient: any) => void;
  show?: (msg: string) => void;
}) {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.archivedPatients(clinicId, q || undefined);
      setPatients(Array.isArray(data) ? data : []);
    } catch { setPatients([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [clinicId]); // eslint-disable-line
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  const reopen = async (patient: any) => {
    if (busyId) return;
    setBusyId(patient.id);
    try {
      await api.reopenArchivedPatient(patient.id, clinicId);
      show?.(`${patient.name} reopened`);
      await load();
      onReopened?.(patient);
    } catch (e: any) {
      show?.("Error reopening patient: " + e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Archive size={22} color={accent} />
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: INK }}>
          Archived Patients <span style={{ color: MUTE, fontSize: 15, fontWeight: 600 }}>({patients.length})</span>
        </h2>
      </div>
      <div style={{ fontSize: 13, color: MUTE, marginBottom: 14 }}>
        Treatment completed &amp; payment settled. These patients have no active treatment plans.
      </div>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: 13, color: MUTE }} />
        <input
          style={{
            width: "100%", padding: "11px 14px 11px 38px", borderRadius: 12,
            border: `1.5px solid ${LINE}`, fontSize: 14, fontFamily: "inherit",
            background: "#fff", color: INK, outline: "none", boxSizing: "border-box",
          }}
          placeholder="Search by name or phone…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: MUTE }}>Loading…</div>
      ) : patients.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: MUTE, background: SOFT, borderRadius: 14, border: `1.5px dashed ${LINE}` }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          {q ? "No archived patients match your search." : "No archived patients yet."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {patients.map(p => (
            <div key={p.id} style={{
              background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 14, padding: 14,
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, background: GREEN + "18",
                color: GREEN, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800,
              }}><User size={20} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: INK, fontSize: 15 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: MUTE, marginTop: 2 }}>
                  {p.phone} · {p.gender || ""}{p.age ? `, ${p.age}y` : ""}
                  {p.completed_plans ? ` · ${p.completed_plans} plan(s) completed` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: GREEN }}>{fmt(p.total_paid)}</div>
                <div style={{ fontSize: 10.5, color: MUTE }}>Total paid</div>
              </div>
              <button
                onClick={() => reopen(p)}
                disabled={busyId === p.id}
                style={{
                  border: "none", borderRadius: 10, padding: "10px 14px",
                  background: BLUE, color: "#fff", cursor: "pointer",
                  fontWeight: 800, fontSize: 12, fontFamily: "inherit",
                  opacity: busyId === p.id ? 0.7 : 1,
                }}
              >
                {busyId === p.id ? "Reopening..." : "Reopen"}
              </button>
              {p.last_plan_date && (
                <div style={{ fontSize: 11, color: MUTE, minWidth: 80, textAlign: "right" }}>
                  Last: {p.last_plan_date.slice(0, 10)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
