"use client";
/**
 * app/public/rating/page.tsx — Bundle Q+
 *
 * Public rating submission page.
 * URL format: /public/rating?token=<token>
 *
 * Reads token from URL, looks up the rating row, lets the patient pick 1–5
 * stars and add an optional comment. On submit, the backend auto-creates a
 * ₹100 credit (if settings say so) and the patient sees a thank-you screen.
 */

import { useEffect, useState } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const BG  = "#F8FAFC";
const GOLD = "#F59E0B";

export default function PublicRatingPage() {
  const [token, setToken] = useState<string>("");
  const [info, setInfo] = useState<any>(null);
  const [stage, setStage] = useState<"loading" | "form" | "done" | "already" | "error">("loading");
  const [error, setError] = useState<string>("");

  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Read token + lookup
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("token") || "";
    setToken(t);
    if (!t) { setStage("error"); setError("No rating token provided."); return; }
    (async () => {
      try {
        const d = await api.publicRatingGet(t);
        setInfo(d);
        if (d.already_submitted) {
          setStage("already");
          setRating(d.rating || 0);
          setComment(d.comment || "");
        } else {
          setStage("form");
        }
      } catch (e: any) {
        setError(e.message || "Invalid or expired link.");
        setStage("error");
      }
    })();
  }, []);

  const submit = async () => {
    if (rating < 1) { setError("Please pick at least 1 star"); return; }
    setError(""); setSubmitting(true);
    try {
      const r = await api.publicRatingSubmit(token, rating, comment || undefined);
      setResult(r);
      setStage("done");
    } catch (e: any) {
      setError(e.message || "Could not save your rating.");
    } finally { setSubmitting(false); }
  };

  if (stage === "loading") {
    return <Shell><Card><div style={loadingStyle}>⏳ Loading…</div></Card></Shell>;
  }

  if (stage === "error") {
    return (
      <Shell>
        <Card>
          <div style={{ padding: 30, textAlign: "center" as const }}>
            <div style={{ fontSize: 48 }}>⚠</div>
            <h2 style={{ marginTop: 6 }}>Link not valid</h2>
            <p style={{ color: MUTE, fontSize: 14 }}>{error}</p>
          </div>
        </Card>
      </Shell>
    );
  }

  if (stage === "already") {
    return (
      <Shell>
        <Card>
          <div style={{ padding: 30, textAlign: "center" as const }}>
            <div style={{ fontSize: 48 }}>✓</div>
            <h2 style={{ marginTop: 6, color: A }}>Thanks for rating!</h2>
            <p style={{ color: MUTE, fontSize: 14 }}>You already gave us <b>{rating} {rating === 1 ? "star" : "stars"}</b>.</p>
            <div style={{ marginTop: 14 }}>
              {[1,2,3,4,5].map(n => (
                <span key={n} style={{ fontSize: 30, color: n <= rating ? GOLD : LINE }}>★</span>
              ))}
            </div>
            {comment && (
              <div style={{ marginTop: 14, padding: 12, background: BG, borderRadius: 10, fontSize: 13, color: INK, fontStyle: "italic" as const }}>
                "{comment}"
              </div>
            )}
          </div>
        </Card>
      </Shell>
    );
  }

  if (stage === "done") {
    return (
      <Shell>
        <Card>
          <div style={{ padding: 30, textAlign: "center" as const }}>
            <div style={{ fontSize: 60 }}>🎉</div>
            <h1 style={{ margin: "8px 0 4px", color: A, fontSize: 26 }}>Thank you!</h1>
            <p style={{ fontSize: 15, color: INK, lineHeight: 1.6 }}>
              Your <b>{result?.rating}-star</b> rating has been recorded.
            </p>
            {result?.credit_amount > 0 && (
              <div style={{
                marginTop: 14, padding: 16,
                background: `linear-gradient(135deg, ${A}22, ${GOLD}22)`,
                borderRadius: 14, border: `1px solid ${A}55`,
              }}>
                <div style={{ fontSize: 14, color: MUTE, fontWeight: 700, letterSpacing: 0.5 }}>YOUR REWARD</div>
                <div style={{ fontSize: 38, fontWeight: 900, color: A, marginTop: 4 }}>₹{result.credit_amount}</div>
                <div style={{ fontSize: 13, color: INK, marginTop: 6 }}>
                  Credit added! Use it on your next visit. Valid for 90 days.
                </div>
              </div>
            )}
            <div style={{ fontSize: 12, color: MUTE, marginTop: 18 }}>
              Made our day. We can't wait to see you again! 💚
            </div>
          </div>
        </Card>
      </Shell>
    );
  }

  // ─── form ───
  return (
    <Shell>
      <Card>
        <div style={{ padding: 26 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, color: INK }}>
            How was your visit?
          </h1>
          <p style={{ marginTop: 0, fontSize: 14, color: MUTE, lineHeight: 1.5 }}>
            {info?.patient_name && <>Hi <b>{info.patient_name}</b>! </>}
            Help us by rating <b>{info?.clinic_name || "your visit"}</b>.
          </p>

          {/* Star picker */}
          <div style={{
            display: "flex", justifyContent: "center" as const, gap: 8,
            margin: "26px 0", fontSize: 50, cursor: "pointer",
          }}>
            {[1,2,3,4,5].map(n => (
              <span key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                style={{
                  color: n <= (hover || rating) ? GOLD : LINE,
                  transition: "transform 0.15s",
                  transform: n <= (hover || rating) ? "scale(1.1)" : "scale(1)",
                }}
              >★</span>
            ))}
          </div>

          <div style={{ textAlign: "center" as const, fontSize: 13, color: MUTE, marginBottom: 20, height: 16 }}>
            {(hover || rating) > 0 && (
              ["Tap a star to rate", "Could be better", "OK", "Good", "Great", "Excellent!"][hover || rating]
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 5 }}>Anything to add? (optional)</div>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="What did you like? What could we do better?"
              maxLength={500}
              style={{
                width: "100%", minHeight: 80, padding: "11px 13px", borderRadius: 10,
                border: `1.5px solid ${LINE}`, fontSize: 14, fontFamily: "inherit",
                resize: "vertical" as const, outline: "none", boxSizing: "border-box" as const,
              }} />
          </div>

          {error && (
            <div style={{
              padding: 10, marginBottom: 10, background: "#FEE2E2",
              border: "1px solid #FCA5A5", borderRadius: 10, fontSize: 13, color: "#991B1B",
            }}>{error}</div>
          )}

          <button onClick={submit} disabled={submitting || rating < 1}
            style={{
              width: "100%", background: rating >= 1 ? A : LINE, color: "#fff",
              border: "none", padding: 14, borderRadius: 12, fontSize: 16, fontWeight: 800,
              cursor: rating >= 1 ? "pointer" : "not-allowed", fontFamily: "inherit",
              opacity: submitting ? 0.6 : 1,
            }}>
            {submitting ? "Submitting…" : "Submit & get ₹100 reward 🎁"}
          </button>

          <div style={{ marginTop: 12, fontSize: 11, color: MUTE, textAlign: "center" as const }}>
            🎁 Rate us to receive ₹100 credit toward your next visit
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
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <div style={{ textAlign: "center" as const, marginBottom: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: A }}>Siya Dental Care</div>
        </div>
        {children}
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
const loadingStyle: any = {
  padding: 40, textAlign: "center" as const, color: MUTE, fontSize: 14,
};
