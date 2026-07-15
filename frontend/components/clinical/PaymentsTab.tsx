"use client";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";
const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const dmy = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const card: React.CSSProperties = { background: "#fff", borderRadius: 20, padding: 22, boxShadow: SHADOW };
const inp: React.CSSProperties = {
  width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "13px 16px",
  fontSize: 15, boxSizing: "border-box", outline: "none", fontFamily: "inherit", background: "#fff",
};
const chipGhost = (c: string): React.CSSProperties => ({
  background: c + "0D", color: c, border: `1.5px solid ${c}44`, padding: "6px 14px",
  borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});
const lbl: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 800, marginTop: 14, marginBottom: 7,
  color: "#475569", textTransform: "uppercase", letterSpacing: 0.5,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 800, fontSize: 14.5, color: INK, marginBottom: 8 }}>{children}</div>;
}

const ADJ_REASONS = ["Senior discount", "Package deal", "Staff discount", "Insurance", "Goodwill", "Other"];

export function PaymentsTab({
  W, fin, accent, collectToday, setCollectToday, adjAmt, setAdjAmt, adjReason, setAdjReason,
  billingReady, billingBlockers, onGoToPlan,
}: {
  W: any;
  fin: any;
  accent: string;
  collectToday: string;
  setCollectToday: (v: string) => void;
  adjAmt: string;
  setAdjAmt: (v: string) => void;
  adjReason: string;
  setAdjReason: (v: string) => void;
  billingReady: boolean;
  billingBlockers: { treatment_name: string; reason: string }[];
  onGoToPlan: () => void;
}) {
  const labOrders = W?.lab_orders || [];
  const specialistCases = W?.specialist_cases || [];
  const labOutstanding = labOrders.reduce((s: number, o: any) => s + Math.max(0, (o.cost || 0) - (o.paid_amount || 0)), 0);
  const patientOutstanding = fin.outstanding || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!billingReady && (
        <div style={{
          background: "linear-gradient(135deg,#FEF3C7,#FFFBEB)", border: "2px solid #FCD34D",
          borderRadius: 16, padding: "14px 18px",
        }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "#92400E", marginBottom: 6 }}>
            ⚠️ Confirm treatment rates before billing
          </div>
          <div style={{ fontSize: 13, color: "#78350F", lineHeight: 1.5, marginBottom: 10 }}>
            Every plan item needs a <b>non-zero rate</b> and <b>Confirm ✓</b> on the Treatment Plan tab.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {billingBlockers.slice(0, 6).map((b, i) => (
              <span key={i} style={{
                background: "#fff", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700,
                color: b.reason === "zero_rate" ? "#B45309" : "#C2410C", border: "1px solid #FDE68A",
              }}>
                {b.treatment_name}{b.reason === "zero_rate" ? " · set rate" : " · confirm"}
              </span>
            ))}
          </div>
          <button type="button" onClick={onGoToPlan}
            style={{ border: "none", background: accent, color: "#fff", borderRadius: 10, padding: "9px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Go to Treatment Plan →
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        {[
          ["Patient due", patientOutstanding, patientOutstanding > 0 ? "#DC2626" : "#059669"],
          ["Lab due", fin.lab_due || labOutstanding, "#D97706"],
          ["Specialist due", fin.specialist_due || 0, "#7C3AED"],
          ["Plan value", fin.total_value || 0, accent],
        ].map(([l, v, c]) => (
          <div key={String(l)} style={{ ...card, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c},${c}55)` }} />
            <div style={{ fontSize: 10.5, fontWeight: 800, color: MUTE, letterSpacing: 0.4 }}>{String(l).toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: c as string, marginTop: 4 }}>{fmt(v as number)}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <SectionTitle>👤 Patient — collect today</SectionTitle>
        <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 10 }}>
          Amount nurse collects when you close the visit. Treatment rates must be confirmed on the plan first.
        </div>
        <input type="number" value={collectToday} onChange={e => setCollectToday(e.target.value)} placeholder="0"
          disabled={!billingReady}
          style={{ ...inp, fontSize: 28, fontWeight: 900, textAlign: "center", borderColor: accent, borderWidth: 2, opacity: billingReady ? 1 : 0.55 }} />
        <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
          {[fin.today_added, fin.outstanding].filter((v: number, i: number, a: number[]) => v > 0 && a.indexOf(v) === i).map((v: number) => (
            <button key={v} type="button" disabled={!billingReady} onClick={() => setCollectToday(String(v))} style={chipGhost(accent)}>
              {v === fin.outstanding ? "Full outstanding" : "Today's value"} {fmt(v)}
            </button>
          ))}
        </div>
        <label style={lbl}>Final adjustment (optional)</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input type="number" value={adjAmt} onChange={e => setAdjAmt(e.target.value)} placeholder="₹ 0" style={inp} disabled={!billingReady} />
          <select value={adjReason} onChange={e => setAdjReason(e.target.value)} style={inp} disabled={!billingReady}>
            <option value="">Reason…</option>
            {ADJ_REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ marginTop: 14, padding: 0, overflow: "hidden", borderRadius: 14, border: `1px solid ${LINE}` }}>
          <div style={{ padding: "12px 16px", background: SOFT, fontWeight: 800, fontSize: 13 }}>📒 Patient payment history</div>
          {(fin.ledger || []).length === 0 ? (
            <div style={{ padding: "12px 16px", fontSize: 13, color: MUTE }}>No payments recorded yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: SOFT }}>
                  {["Date", "Amount", "Mode", "Balance"].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 800, color: MUTE }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(fin.ledger || []).map((r: any, i: number) => (
                  <tr key={i} style={{ borderTop: `1px solid ${SOFT}` }}>
                    <td style={{ padding: "8px 14px", fontWeight: 700 }}>{dmy(r.date)}</td>
                    <td style={{ padding: "8px 14px", fontWeight: 900, color: "#059669" }}>{fmt(r.amount)}</td>
                    <td style={{ padding: "8px 14px" }}>{r.mode}</td>
                    <td style={{ padding: "8px 14px", fontWeight: 800, color: r.balance_after > 0 ? "#DC2626" : "#059669" }}>{fmt(r.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
        <div style={card}>
          <SectionTitle>🧪 Lab payments</SectionTitle>
          {labOrders.length === 0 ? (
            <div style={{ fontSize: 13, color: MUTE }}>No lab orders for this patient.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {labOrders.map((o: any) => {
                const due = Math.max(0, (o.cost || 0) - (o.paid_amount || 0));
                return (
                  <div key={o.id} style={{ padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${LINE}`, background: SOFT }}>
                    <div style={{ fontWeight: 900, fontSize: 14, color: INK }}>{o.work_type || "Lab work"}</div>
                    <div style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>{o.vendor_name || "Lab"} · {o.status}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, fontWeight: 800 }}>
                      <span>Cost {fmt(o.cost || 0)}</span>
                      <span style={{ color: due > 0 ? "#D97706" : "#059669" }}>{due > 0 ? `Due ${fmt(due)}` : "Paid"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={card}>
          <SectionTitle>👨‍⚕️ Specialist payments</SectionTitle>
          {specialistCases.length === 0 ? (
            <div style={{ fontSize: 13, color: MUTE }}>No specialist referrals for this patient.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {specialistCases.map((c: any) => (
                <div key={c.appointment_id} style={{ padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${LINE}`, background: SOFT }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: INK }}>{c.specialist_name || "Specialist"}</div>
                  <div style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>{c.specialization || "Referral"} · {c.specialist_session_status || c.specialist_confirmation_status}</div>
                  {c.scheduled_date && <div style={{ fontSize: 12, color: MUTE, marginTop: 4 }}>Scheduled {dmy(c.scheduled_date)}</div>}
                </div>
              ))}
            </div>
          )}
          {(fin.specialist_due || 0) > 0 && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#F5F3FF", borderRadius: 10, fontWeight: 800, color: "#5B21B6", fontSize: 13 }}>
              Total specialist payable: {fmt(fin.specialist_due)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}