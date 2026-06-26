"use client";

import { useEffect, useState } from "react";
import SpecialistModule from "@/components/SpecialistModule";
import * as api from "@/lib/api";

const TEAL = "#0E7C7B";
const LINE = "#E2E8F0";
const BG = "#F8FAFC";
const INK = "#0F172A";
const MUTE = "#64748B";

export default function SpecialistPage() {
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const show = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await api.apiFetch("/auth/me");
        if (!me || me.role !== "specialist") {
          window.location.href = "/";
          return;
        }
        setStaff({
          ...me,
          staff_id: me.staff_id || me.id,
        });
      } catch {
        window.location.href = "/";
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !staff) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: BG, color: MUTE, fontWeight: 800 }}>
        Loading specialist practice…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "system-ui, sans-serif" }}>
      <header style={{
        background: "#fff",
        borderBottom: `1px solid ${LINE}`,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: TEAL }}>My Practice</div>
          <div style={{ fontSize: 12, color: MUTE }}>Dr. {staff.name} · Specialist</div>
        </div>
        <button
          onClick={() => { api.logout(); window.location.href = "/"; }}
          style={{
            border: `1.5px solid ${LINE}`,
            background: "#fff",
            color: INK,
            borderRadius: 10,
            padding: "8px 14px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        <SpecialistModule staff={staff} accent={TEAL} show={show} />
      </main>

      {toast && (
        <div style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          background: INK,
          color: "#fff",
          padding: "10px 18px",
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 700,
          zIndex: 200,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
