"use client";
/**
 * Public ₹100 phone consultation booking page.
 * Route: /public/consult?clinic=<UUID>
 */

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import PublicChrome, {
  PublicAlert,
  PublicCard,
  PublicField,
  PublicStatus,
} from "@/components/PublicChrome";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PublicConsultPage() {
  const [clinicId, setClinicId] = useState("");
  const [stage, setStage] = useState<"form" | "paying" | "done" | "offline">("form");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(10);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [complaint, setComplaint] = useState("");
  const [duration_complaint, setDC] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setClinicId(sp.get("clinic") || process.env.NEXT_PUBLIC_DEFAULT_CLINIC_ID || "");
  }, []);

  useEffect(() => {
    if (document.querySelector('script[src*="checkout.razorpay.com"]')) return;
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const submit = async () => {
    if (!clinicId) {
      setError("Clinic not specified. Please use the original link from the clinic.");
      return;
    }
    if (!name.trim() || !phone.trim() || !complaint.trim()) {
      setError("Please fill name, phone, and your concern.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const r = await api.publicPhoneConsultCreate({
        clinic_id: clinicId,
        patient_name: name.trim(),
        patient_phone: phone.trim(),
        patient_age: age ? parseInt(age, 10) : undefined,
        patient_gender: gender || undefined,
        complaint: complaint.trim(),
        duration_complaint: duration_complaint || undefined,
      });
      setDuration(r.duration_minutes || 10);

      if (r.status === "pending_offline" || !r.razorpay_order_id || !r.razorpay_key_id) {
        setStage("offline");
        setSubmitting(false);
        return;
      }

      setStage("paying");

      const waitForRzp = () =>
        new Promise<void>((res) => {
          if (window.Razorpay) return res();
          const i = setInterval(() => {
            if (window.Razorpay) {
              clearInterval(i);
              res();
            }
          }, 100);
        });
      await waitForRzp();

      const rzp = new window.Razorpay({
        key: r.razorpay_key_id,
        amount: r.amount_paise,
        currency: r.currency || "INR",
        name: "Siya Dental Care",
        description: `₹${r.amount} phone consultation`,
        order_id: r.razorpay_order_id,
        prefill: {
          name: name.trim(),
          contact: phone.trim(),
        },
        theme: { color: "#0E7C7B" },
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
            setError(
              "Payment received but verification failed. Please contact the clinic. (" +
                (e.message || "error") +
                ")"
            );
            setStage("form");
          }
        },
        modal: {
          ondismiss: () => {
            setStage("form");
            setSubmitting(false);
          },
        },
      });
      rzp.open();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setStage("form");
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === "done") {
    return (
      <PublicChrome
        kicker="Phone consult"
        title="You're booked"
        subtitle="Payment received — keep your phone nearby."
        maxWidth="sm"
      >
        <PublicCard>
          <PublicStatus icon="✓" title="Doctor will call soon">
            <p>
              We&apos;ll call <strong>{phone}</strong> within the next{" "}
              <strong>{duration} minutes</strong>. Your prescription can be sent on WhatsApp after the call.
            </p>
            <div className="ps-sub-tips">
              <div>📞 Keep your phone nearby</div>
              <div>💬 WhatsApp will receive your Rx when ready</div>
              <div>⏱ Average wait: under {duration} min</div>
            </div>
            <div className="ps-smile-actions" style={{ marginTop: "1.25rem" }}>
              <a href="/" className="ps-btn-primary">Back to website</a>
            </div>
          </PublicStatus>
        </PublicCard>
      </PublicChrome>
    );
  }

  if (stage === "offline") {
    return (
      <PublicChrome
        kicker="Phone consult"
        title="Request received"
        subtitle="Online payment isn’t enabled right now."
        maxWidth="sm"
      >
        <PublicCard>
          <PublicStatus icon="✓" title="We’ll confirm shortly">
            <p>
              Your consultation is booked. The clinic will contact you on <strong>{phone}</strong> to confirm and arrange the ₹100 fee.
            </p>
            <div className="ps-smile-actions" style={{ marginTop: "1.25rem" }}>
              <a href="/" className="ps-btn-primary">Back to website</a>
            </div>
          </PublicStatus>
        </PublicCard>
      </PublicChrome>
    );
  }

  return (
    <PublicChrome
      kicker="Phone consult · ₹100"
      title="Talk to a dentist now"
      subtitle={`Secure online payment · Doctor calls within ${duration} minutes · Rx via WhatsApp`}
      maxWidth="sm"
    >
      <PublicCard>
        <div className="ps-sub-form">
          {error && <PublicAlert tone="error">⚠ {error}</PublicAlert>}
          {stage === "paying" && (
            <PublicAlert tone="info">Opening secure payment… complete the Razorpay window to finish.</PublicAlert>
          )}

          <PublicField label="Your name *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
            />
          </PublicField>

          <PublicField label="WhatsApp number *" hint="We’ll call this number and can send Rx here.">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
          </PublicField>

          <div className="ps-sub-form-row two">
            <PublicField label="Age">
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 32"
                type="number"
                min={1}
                max={120}
              />
            </PublicField>
            <PublicField label="Gender">
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </PublicField>
          </div>

          <PublicField label="What is your concern? *">
            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. Tooth pain on the lower right, worse at night"
              rows={4}
            />
          </PublicField>

          <PublicField label="How long have you had this?">
            <input
              value={duration_complaint}
              onChange={(e) => setDC(e.target.value)}
              placeholder="e.g. 3 days, 1 week"
            />
          </PublicField>

          <button
            type="button"
            className="ps-sub-submit"
            onClick={submit}
            disabled={submitting || stage === "paying"}
          >
            {submitting || stage === "paying" ? "Processing…" : "Pay ₹100 & book call"}
          </button>

          <p className="ps-sub-meta">
            🔒 Secure payment via Razorpay · Details used only for this consultation
          </p>
        </div>
      </PublicCard>
    </PublicChrome>
  );
}
