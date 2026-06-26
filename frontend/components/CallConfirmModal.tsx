/**
 * CallConfirmModal
 *
 * Patient mode:
 * - confirm
 * - refused
 * - no_answer
 * - call_back_later
 * - change_date
 * - change_time
 *
 * Specialist mode:
 * - confirmed
 * - declined
 */
import React, { useState } from "react";
import { X, Check, XCircle, Calendar, Clock, Phone, MessageSquare } from "lucide-react";
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: `1.5px solid ${LINE}`,
  fontSize: 14,
  fontFamily: "inherit",
  background: "#fff",
  color: INK,
  outline: "none",
  boxSizing: "border-box",
};

type Props = {
  appointmentId: string;
  patientName: string;
  currentDate?: string;
  currentTime?: string;
  mode?: "patient" | "specialist";
  specialistName?: string;
  onClose: () => void;
  onDone: (result: { action: string; newDate?: string; newTime?: string }) => void;
};

export default function CallConfirmModal({
  appointmentId,
  patientName,
  currentDate,
  currentTime,
  mode = "patient",
  specialistName,
  onClose,
  onDone,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [newDate, setNewDate] = useState(currentDate || "");
  const [newTime, setNewTime] = useState(currentTime || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!selected) {
      alert("Pick an action");
      return;
    }
    if (selected === "change_date" && !newDate) {
      alert("Enter the new date");
      return;
    }
    if (selected === "change_time" && !newTime) {
      alert("Enter the new time");
      return;
    }
    setSaving(true);
    try {
      if (mode === "specialist") {
        await api.specialistCallConfirm(appointmentId, { action: selected, notes });
      } else {
        await api.callConfirm(appointmentId, {
          action: selected,
          new_date: selected === "change_date" ? newDate : undefined,
          new_time: selected === "change_time" ? newTime : undefined,
          notes,
        });
      }
      onDone({ action: selected, newDate, newTime });
      onClose();
    } catch (e: any) {
      alert(e?.message || e);
    } finally {
      setSaving(false);
    }
  };

  const patientActions = [
    { id: "confirm", icon: <Check size={20} />, label: "Confirmed", desc: "Patient confirmed appointment", color: GREEN, bg: "#D1FAE5" },
    { id: "refused", icon: <XCircle size={20} />, label: "Refused", desc: "Patient declined and appointment is cancelled", color: RED, bg: "#FEE2E2" },
    { id: "no_answer", icon: <Phone size={20} />, label: "No Answer", desc: "Call not received or unreachable", color: AMBER, bg: "#FEF3C7" },
    { id: "call_back_later", icon: <MessageSquare size={20} />, label: "Call Back Later", desc: "Patient asked to be called again", color: AMBER, bg: "#FFF7ED" },
    { id: "change_date", icon: <Calendar size={20} />, label: "Change Date", desc: "Patient requested a different date", color: AMBER, bg: "#FEF3C7" },
    { id: "change_time", icon: <Clock size={20} />, label: "Change Time", desc: "Patient requested a different time", color: AMBER, bg: "#FEF3C7" },
  ];

  const specialistActions = [
    { id: "confirmed", icon: <Check size={20} />, label: "Confirmed", desc: "Specialist confirmed availability", color: GREEN, bg: "#D1FAE5" },
    { id: "declined", icon: <XCircle size={20} />, label: "Declined", desc: "Specialist is not available", color: RED, bg: "#FEE2E2" },
  ];

  const actions = mode === "specialist" ? specialistActions : patientActions;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "min(560px, 100%)",
          boxShadow: "0 20px 60px rgba(15,23,42,0.3)",
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
            padding: "16px 22px",
            color: "#fff",
            borderRadius: "18px 18px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>
              {mode === "specialist" ? "Call Specialist" : "Call & Confirm"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              {mode === "specialist" ? (
                <>Specialist: <b>{specialistName}</b> · Patient: <b>{patientName}</b></>
              ) : (
                <><b>{patientName}</b> · {currentDate} {currentTime}</>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => setSelected(action.id)}
                style={{
                  border: selected === action.id ? `2.5px solid ${action.color}` : `1.5px solid ${LINE}`,
                  background: selected === action.id ? action.bg : "#fff",
                  borderRadius: 14,
                  padding: 16,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all .15s",
                }}
              >
                <div style={{ color: action.color, marginBottom: 6, display: "flex", justifyContent: "center" }}>{action.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: selected === action.id ? action.color : INK }}>{action.label}</div>
                <div style={{ fontSize: 11.5, color: MUTE, marginTop: 4 }}>{action.desc}</div>
              </button>
            ))}
          </div>

          {selected === "change_date" && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: MUTE, marginBottom: 4 }}>NEW DATE</div>
              <input style={inputStyle} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
          )}

          {selected === "change_time" && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: MUTE, marginBottom: 4 }}>NEW TIME</div>
              <input style={inputStyle} type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            </div>
          )}

          <textarea
            style={{ ...inputStyle, minHeight: 56, resize: "vertical" }}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div
          style={{
            padding: "14px 22px",
            borderTop: `1.5px solid ${LINE}`,
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            background: SOFT,
            borderRadius: "0 0 18px 18px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              border: `1.5px solid ${LINE}`,
              background: "#fff",
              color: MUTE,
              borderRadius: 12,
              padding: "11px 20px",
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !selected}
            style={{
              border: "none",
              background: `linear-gradient(135deg,${TEAL},${TEAL_DEEP})`,
              color: "#fff",
              borderRadius: 12,
              padding: "11px 22px",
              fontWeight: 800,
              fontSize: 13.5,
              cursor: saving ? "wait" : "pointer",
              opacity: selected ? 1 : 0.5,
              boxShadow: `0 4px 12px ${TEAL}44`,
            }}
          >
            {saving ? "Saving..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
