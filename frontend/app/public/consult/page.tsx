"use client";
/**
 * app/public/consult/page.tsx — Bundle Q+
 *
 * Public ₹100 phone consultation booking page.
 * Embed link on the public website (e.g. www.siyadental.com/consult).
 *
 * Flow:
 *   1. Patient fills form
 *   2. publicPhoneConsultCreate() → creates row + Razorpay order
 *   3. Open Razorpay Checkout (loads checkout.razorpay.com/v1/checkout.js)
 *   4. On payment success, publicPhoneConsultVerify() with signature
 *   5. Show "Doctor will call in X minutes" thank-you screen
 *
 * Clinic ID is read from ?clinic= query param OR an env var. Configure
 * in your public site link e.g. /public/consult?clinic=<UUID>
 */

import { useEffect, useState } from "react";
import * as api from "@/lib/api";

declare global {
  interface Window { Razorpay: any; }
}

const A = "#0E7C7B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const BG  = "#F8FAFC";

export default function PublicConsultPage() {
  const [clinicId, setClinicId] = useState<string>("");
  const [stage, setStage] = useState<"form" | "paying" | "done" | "offline">("form");
  const [error, setError] = useState<string>("");
  const [duration, setDuration] = useState<number>(10);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [complaint, setComplaint] = useState("");
  const [duration_complaint, setDC] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Read clinic id from query
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setClinicId(sp.get("clinic") || process.env.NEXT_PUBLIC_DEFAULT_CLINIC_ID || "");
  }, []);

  // Load Razorpay checkout.js
  useEffect(() => {
    if (document.querySelector('script[src*="checkout.razorpay.com"]')) return;
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const submit = async () => {
    if (!clinicId) { setError("Clinic not specified. Please use the original link."); return; }
    if (!name.trim() || !phone.trim() || !complaint.trim()) {
      setError("Please fill name, phone, and your concern.");
      return;
    }
    setError(""); setSubmitting(true);

    try {
      const r = await api.publicPhoneConsultCreate({
        clinic_id: clinicId,
        patient_name: name.trim(),
        patient_phone: phone.trim(),
        patient_age: age ? parseInt(age) : undefined,
        patient_gender: gender || undefined,
        complaint: complaint.trim(),
        duration_complaint: duration_complaint || undefined,
      });
      setDuration(r.duration_minutes || 10);

      // Offline path — Razorpay not configured
      if (r.status === "pending_offline" || !r.razorpay_order_id || !r.razorpay_key_id) {
        setStage("offline");
        setSubmitting(false);
        return;
      }

      setStage("paying");

      // Wait for Razorpay script if still loading
      const waitForRzp = () => new Promise<void>(res => {
        if (window.Razorpay) return res();
        const i = setInterval(() => {
          if (window.Razorpay) { clearInterval(i); res(); }
        }, 100);
      });
      await waitForRzp();

      const rzp = new window.Razorpay({
        key: r.razorpay_key_id,
        amount: r.amount_paise,
        currency: r.currency || "INR",
        name: "Dental Phone Consultation",
        description: `₹${r.amount} consultation with the doctor`,
        order_id: r.razorpay_order_id,
        prefill: {
          name: name.trim(),
          contact: phone.trim(),
        },
        theme: { color: A },
        handler: async (resp: any) => {
          try {
            await api.publicPhoneConsultVerify({
              consult_id: r.consult_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            setStage("done");
          } catch (e: any) {
            setError("Payment received but verification failed. Contact the clinic. (" + e.message + ")");
            setStage("form");
          }
        },
        modal: {
          ondismiss: () => { setStage("form"); setSubmitting(false); },
        },
      });
      rzp.open();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setStage("form");
    } finally { setSubmitting(false); }
  };

  // ─── Done screen ───
  if (stage === "done") {
    return (
      <Shell>
        <Card>
          <div style={{ textAlign: "center" as const, padding: 30 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>✓</div>
            <h1 style={{ margin: "0 0 6px", color: A, fontSize: 26 }}>Booked!</h1>
            <p style={{ fontSize: 15, color: INK, lineHeight: 1.6 }}>
              Payment received. The doctor will call you on <b>{phone}</b> within the next <b>{duration} minutes</b>.
              <br /><br />
              Your prescription will be sent via WhatsApp after the call.
            </p>
            <div style={{ marginTop: 14, padding: 14, background: BG, borderRadius: 12, fontSize: 13, color: MUTE }}>
              📞 Keep your phone nearby<br />
              💬 WhatsApp will receive your Rx<br />
              ⏱ Average wait: under {duration} min
            </div>
          </div>
        </Card>
      </Shell>
    );
  }

  // ─── Offline / Razorpay-not-configured screen ───
  if (stage === "offline") {
    return (
      <Shell>
        <Card>
          <div style={{ padding: 24 }}>
            <h1 style={{ marginTop: 0, color: A }}>Booked! ✓</h1>
            <p style={{ fontSize: 14, color: INK, lineHeight: 1.6 }}>
              Your consultation has been booked. Online payment is currently not enabled — the doctor will contact you on <b>{phone}</b> shortly to confirm and arrange ₹100 payment.
            </p>
          </div>
        </Card>
      </Shell>
    );
  }

  // ─── Form screen ───
  return (
    <Shell>
      <Card>
        <div style={{ padding: 24 }}>
          <h1 style={{ margin: "0 0 4px", color: INK, fontSize: 24 }}>Talk to a dentist now</h1>
          <p style={{ marginTop: 0, fontSize: 14, color: MUTE, lineHeight: 1.5 }}>
            ₹100 phone consultation · Doctor calls within {duration} minutes · Prescription via WhatsApp
          </p>

          {error && (
            <div style={{
              padding: 11, marginBottom: 12, background: "#FEE2E2",
              border: "1px solid #FCA5A5", borderRadius: 10, fontSize: 13, color: "#991B1B",
            }}>⚠ {error}</div>
          )}

          <Field label="Your name *">
            <Input value={name} onChange={setName} placeholder="Full name" />
          </Field>
          <Field label="WhatsApp number *">
            <Input value={phone} onChange={setPhone} placeholder="10-digit number" type="tel" />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Age">
              <Input value={age} onChange={setAge} placeholder="e.g. 32" type="number" />
            </Field>
            <Field label="Gender">
              <select value={gender} onChange={e => setGender(e.target.value)} style={inputStyle}>
                <option value="">Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>

          <Field label="What is your concern? *">
            <textarea value={complaint} onChange={e => setComplaint(e.target.value)}
              placeholder="e.g. Tooth pain on the lower right side, getting worse at night"
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" as const, fontFamily: "inherit" }} />
          </Field>

          <Field label="How long have you had this?">
            <Input value={duration_complaint} onChange={setDC} placeholder="e.g. 3 days, 1 week" />
          </Field>

          <button onClick={submit} disabled={submitting}
            style={{
              width: "100%", background: A, color: "#fff", border: "none",
              padding: 14, borderRadius: 12, fontSize: 16, fontWeight: 800,
              cursor: "pointer", marginTop: 8, fontFamily: "inherit",
              opacity: submitting ? 0.6 : 1,
            }}>
            {submitting ? "Processing…" : "Pay ₹100 & Book Call"}
          </button>

          <div style={{ marginTop: 14, fontSize: 11, color: MUTE, lineHeight: 1.5, textAlign: "center" as const }}>
            🔒 Secure payment via Razorpay · No data stored beyond your consultation
          </div>
        </div>
      </Card>
    </Shell>
  );
}

function Shell({ children }: any) {
  return (
    <div style={{
      minHeight: "100vh", background: `linear-gradient(135deg, ${A}11 0%, ${BG} 100%)`,
      padding: "30px 16px", fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ textAlign: "center" as const, marginBottom: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: A }}>Siya Dental Care</div>
          <div style={{ fontSize: 13, color: MUTE, marginTop: 2 }}>Dr. Madhu Edward · Rourkela</div>
        </div>
        {children}
        <div style={{ textAlign: "center" as const, marginTop: 14, fontSize: 11, color: MUTE }}>
          Powered by Siya Dental Care
        </div>
      </div>
    </div>
  );
}
function Card({ children }: any) {
  return (
    <div style={{
      background: "#fff", borderRadius: 18,
      boxShadow: "0 4px 24px #0f172a14", overflow: "hidden" as const,
    }}>{children}</div>
  );
}
function Field({ label, children }: any) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}
function Input({ value, onChange, type = "text", placeholder }: any) {
  return (
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} style={inputStyle} />
  );
}
const inputStyle: any = {
  width: "100%", padding: "11px 13px", borderRadius: 10,
  border: `1.5px solid ${LINE}`, fontSize: 14, outline: "none",
  boxSizing: "border-box" as const, fontFamily: "inherit", background: "#fff",
};
