"use client";
/**
 * Public rating submission page.
 * URL: /public/rating?token=<token>
 */

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import PublicChrome, {
  PublicAlert,
  PublicCard,
  PublicField,
  PublicStatus,
} from "@/components/PublicChrome";

const STAR_LABELS = ["Tap a star to rate", "Could be better", "OK", "Good", "Great", "Excellent!"];

export default function PublicRatingPage() {
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<any>(null);
  const [stage, setStage] = useState<"loading" | "form" | "done" | "already" | "error">("loading");
  const [error, setError] = useState("");

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("token") || "";
    setToken(t);
    if (!t) {
      setStage("error");
      setError("No rating token provided. Open the link sent by the clinic.");
      return;
    }
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
    if (rating < 1) {
      setError("Please pick at least 1 star");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const r = await api.publicRatingSubmit(token, rating, comment || undefined);
      setResult(r);
      setStage("done");
    } catch (e: any) {
      setError(e.message || "Could not save your rating.");
    } finally {
      setSubmitting(false);
    }
  };

  const active = hover || rating;

  if (stage === "loading") {
    return (
      <PublicChrome kicker="Feedback" title="Loading your visit…" maxWidth="sm">
        <PublicCard>
          <div className="ps-loading" style={{ minHeight: "12rem" }}>
            <div className="ps-loading-mark" aria-hidden="true">S</div>
            <p>Just a moment…</p>
          </div>
        </PublicCard>
      </PublicChrome>
    );
  }

  if (stage === "error") {
    return (
      <PublicChrome kicker="Feedback" title="Link not valid" maxWidth="sm">
        <PublicCard>
          <PublicStatus icon="!" title="We couldn’t open this link">
            <p>{error}</p>
            <div className="ps-smile-actions" style={{ marginTop: "1.25rem" }}>
              <a href="/" className="ps-btn-primary">Go to website</a>
            </div>
          </PublicStatus>
        </PublicCard>
      </PublicChrome>
    );
  }

  if (stage === "already") {
    return (
      <PublicChrome kicker="Feedback" title="Thanks again" maxWidth="sm">
        <PublicCard>
          <PublicStatus icon="✓" title="You already rated this visit">
            <p>
              You gave us <strong>{rating}</strong> {rating === 1 ? "star" : "stars"}.
            </p>
            <div className="ps-sub-stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`ps-sub-star${n <= rating ? " on" : ""}`}>
                  ★
                </span>
              ))}
            </div>
            {comment && (
              <blockquote className="ps-sub-tips" style={{ fontStyle: "italic" }}>
                “{comment}”
              </blockquote>
            )}
          </PublicStatus>
        </PublicCard>
      </PublicChrome>
    );
  }

  if (stage === "done") {
    return (
      <PublicChrome kicker="Feedback" title="Thank you" maxWidth="sm">
        <PublicCard>
          <PublicStatus icon="🎉" title="Rating received">
            <p>
              Your <strong>{result?.rating}-star</strong> rating has been recorded.
            </p>
            {result?.credit_amount > 0 && (
              <div className="ps-sub-reward">
                <div className="ps-sub-reward-label">Your reward</div>
                <div className="ps-sub-reward-amount">₹{result.credit_amount}</div>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", color: "var(--ps-ink)" }}>
                  Credit added for your next visit · valid 90 days
                </p>
              </div>
            )}
            <p style={{ marginTop: "1rem" }}>Made our day. We can&apos;t wait to see you again.</p>
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
      kicker="Feedback"
      title="How was your visit?"
      subtitle={
        info?.patient_name
          ? `Hi ${info.patient_name} — rate ${info?.clinic_name || "your visit"} in a few taps.`
          : `Rate ${info?.clinic_name || "your visit"} in a few taps.`
      }
      maxWidth="sm"
    >
      <PublicCard>
        <div className="ps-sub-form">
          <div
            className="ps-sub-stars"
            role="radiogroup"
            aria-label="Star rating"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`ps-sub-star${n <= active ? " on" : ""}`}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                aria-checked={rating === n}
                role="radio"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(0)}
              >
                ★
              </button>
            ))}
          </div>
          <div className="ps-sub-star-label">{STAR_LABELS[active] || STAR_LABELS[0]}</div>

          <PublicField label="Anything to add? (optional)">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like? What could we do better?"
              maxLength={500}
              rows={4}
            />
          </PublicField>

          {error && <PublicAlert tone="error">{error}</PublicAlert>}

          <button
            type="button"
            className="ps-sub-submit clay"
            onClick={submit}
            disabled={submitting || rating < 1}
          >
            {submitting ? "Submitting…" : "Submit rating"}
          </button>

          <p className="ps-sub-meta">
            🎁 Some visits include a small clinic credit after you rate — details appear if available.
          </p>
        </div>
      </PublicCard>
    </PublicChrome>
  );
}
