"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import * as api from "@/lib/api";
import "@/app/public-site.css";
import "@/app/public-site-pop.css";

// 3D hero tooth — client-only, loaded after the page settles so the static
// poster keeps its fast first paint. Skipped for reduced-motion users.
const HeroTooth3D = dynamic(() => import("@/components/HeroTooth3D"), { ssr: false });

function useHero3D() {
  const [mount3D, setMount3D] = useState(false);
  const [ready3D, setReady3D] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 560px)").matches) return;
    const start = () => setMount3D(true);
    const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: object) => number);
    if (ric) {
      const id = ric(start, { timeout: 1500 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(start, 600);
    return () => window.clearTimeout(t);
  }, []);
  return { mount3D, ready3D, setReady3D };
}

// ── Animated count-up for hero stats (0 → target, eased, slow) ──
function parseStat(v: string) {
  const mult = /k/i.test(v) ? 1000 : 1;
  const num = parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
  const target = num * mult;
  const decimals = v.includes(".") && mult === 1 ? 1 : 0;
  const suffix = v.replace(/[0-9.,kK]/g, "");   // keep trailing symbols like "+"
  return { target, decimals, suffix };
}
function CountUpStat({ value }: { value: string }) {
  const { target, decimals, suffix } = useMemo(() => parseStat(value), [value]);
  const [cur, setCur] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const DURATION = 3000; // slow, deliberate count-up
    const run = () => {
      if (started.current) return;
      started.current = true;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / DURATION);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        setCur(target * eased);
        if (p < 1) requestAnimationFrame(tick);
        else setCur(target);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(); io.disconnect(); } });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  const display = decimals ? cur.toFixed(1) : Math.round(cur).toLocaleString("en-IN");
  return <dt ref={ref}>{display}{suffix}</dt>;
}

// ── Draggable before/after image comparison ──
function BeforeAfterSlider({ before, after, beforeLabel = "Before", afterLabel = "After" }:
  { before: string; after: string; beforeLabel?: string; afterLabel?: string }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const move = (clientX: number) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  };
  useEffect(() => {
    const up = () => { dragging.current = false; };
    const mm = (e: MouseEvent) => dragging.current && move(e.clientX);
    const tm = (e: TouchEvent) => dragging.current && move(e.touches[0].clientX);
    window.addEventListener("mouseup", up); window.addEventListener("mousemove", mm);
    window.addEventListener("touchend", up); window.addEventListener("touchmove", tm, { passive: true });
    return () => { window.removeEventListener("mouseup", up); window.removeEventListener("mousemove", mm); window.removeEventListener("touchend", up); window.removeEventListener("touchmove", tm); };
  }, []);
  return (
    <div className="ps-ba" ref={ref}
      onMouseDown={(e) => { dragging.current = true; move(e.clientX); }}
      onTouchStart={(e) => { dragging.current = true; move(e.touches[0].clientX); }}>
      <Image className="ps-ba-img" src={after} alt={afterLabel} fill sizes="(max-width: 768px) 100vw, 50vw" draggable={false} />
      <Image className="ps-ba-img" src={before} alt={beforeLabel} fill sizes="(max-width: 768px) 100vw, 50vw" draggable={false}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <span className="ps-ba-tag ps-ba-tag-before" style={{ opacity: pos > 12 ? 1 : 0 }}>{beforeLabel}</span>
      <span className="ps-ba-tag ps-ba-tag-after" style={{ opacity: pos < 88 ? 1 : 0 }}>{afterLabel}</span>
      <div className="ps-ba-handle" style={{ left: `${pos}%` }}><span>‹ ›</span></div>
    </div>
  );
}

/** Full-bleed photo slideshow with card stack animation (clinic hero style) */
function PhotoCardSlideshow({
  photos,
  onOpen,
}: {
  photos: { src: string; title: string; caption?: string }[];
  onOpen?: (src: string, title: string) => void;
}) {
  const [i, setI] = useState(0);
  const n = photos.length;
  useEffect(() => {
    if (n < 2) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % n), 4500);
    return () => window.clearInterval(t);
  }, [n]);
  if (!n) return null;
  const active = photos[i];
  return (
    <div className="ps-photo-show">
      <div className="ps-photo-show-main">
        {photos.map((p, idx) => (
          <button
            key={p.src}
            type="button"
            className={`ps-photo-slide${idx === i ? " active" : ""}${idx === (i - 1 + n) % n ? " prev" : ""}`}
            onClick={() => onOpen?.(p.src, p.title)}
            aria-hidden={idx !== i}
            tabIndex={idx === i ? 0 : -1}
          >
            <Image src={p.src} alt={p.title} fill sizes="(max-width: 768px) 100vw, 640px" style={{ objectFit: "cover" }} priority={idx === 0} />
          </button>
        ))}
        <div className="ps-photo-show-overlay">
          <span className="ps-pill soft">{active.caption || "Our clinic"}</span>
          <strong>{active.title}</strong>
        </div>
        <div className="ps-photo-show-nav">
          <button type="button" aria-label="Previous photo" onClick={() => setI((x) => (x - 1 + n) % n)}>‹</button>
          <button type="button" aria-label="Next photo" onClick={() => setI((x) => (x + 1) % n)}>›</button>
        </div>
      </div>
      <div className="ps-photo-thumbs">
        {photos.map((p, idx) => (
          <button
            key={`t-${p.src}`}
            type="button"
            className={`ps-photo-thumb${idx === i ? " active" : ""}`}
            onClick={() => setI(idx)}
            aria-label={`Show ${p.title}`}
          >
            <Image src={p.src} alt="" fill sizes="72px" style={{ objectFit: "cover" }} />
          </button>
        ))}
      </div>
      <div className="ps-photo-progress" aria-hidden="true">
        <span key={i} style={{ animationDuration: "4.5s" }} />
      </div>
    </div>
  );
}

/** Before/after — slow auto-rotate; stops permanently once user picks a treatment */
function BeforeAfterCardShow({
  pairs,
}: {
  pairs: { id: string; label: string; before: string; after: string; note: string }[];
}) {
  const [active, setActive] = useState(0);
  const [userLocked, setUserLocked] = useState(false);
  useEffect(() => {
    if (userLocked || pairs.length < 2) return;
    const t = window.setInterval(() => setActive((i) => (i + 1) % pairs.length), 12000);
    return () => window.clearInterval(t);
  }, [pairs.length, userLocked]);
  const select = (i: number) => {
    setActive(i);
    setUserLocked(true);
  };
  const p = pairs[active] || pairs[0];
  if (!p) return null;
  return (
    <div className="ps-ba-showcase">
      <div className="ps-ba-tabs" role="tablist" aria-label="Treatment previews">
        {pairs.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`ps-ba-tab${i === active ? " active" : ""}`}
            onClick={() => select(i)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="ps-ba-stage" key={p.id}>
        <div className="ps-ba-stage-slider">
          <BeforeAfterSlider before={p.before} after={p.after} beforeLabel="Before" afterLabel="After" />
        </div>
        <div className="ps-ba-stage-copy">
          <div className="ps-eyebrow">Smile transformation</div>
          <h3 className="ps-display ps-ba-heading-anim" key={`h-${p.id}`}>{p.label}</h3>
          <p className="ps-ba-body-anim" key={`b-${p.id}`}>{p.note}</p>
          <p className="ps-ba-hint">
            Drag the slider
            {userLocked ? " · autoplay paused" : " · autoplay is slow — pick a tab to lock"}
          </p>
          <div className="ps-ai-actions">
            <a href="#book" className="ps-btn-primary">Book a consult</a>
            <a href="#reviews" className="ps-btn-ghost">Read reviews</a>
          </div>
        </div>
      </div>
      <div className="ps-ba-mini-row">
        {pairs.map((item, i) => (
          <button key={item.id} type="button" className={`ps-ba-mini${i === active ? " on" : ""}`} onClick={() => select(i)}>
            <Image src={item.after} alt="" width={140} height={105} style={{ width: "100%", height: "auto" }} sizes="140px" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ratingWord(rating: string) {
  const n = parseFloat(rating) || 0;
  if (n >= 4.5) return "EXCELLENT";
  if (n >= 4) return "GOOD";
  if (n >= 3) return "AVERAGE";
  return "RATED";
}

function GoogleLogo() {
  return (
    <span className="ps-glogo" aria-label="Google">
      <span style={{ color: "#4285F4" }}>G</span>
      <span style={{ color: "#EA4335" }}>o</span>
      <span style={{ color: "#FBBC05" }}>o</span>
      <span style={{ color: "#4285F4" }}>g</span>
      <span style={{ color: "#34A853" }}>l</span>
      <span style={{ color: "#EA4335" }}>e</span>
    </span>
  );
}

function reviewDate(value?: string) {
  if (!value) return "Google review";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Google review";
  return `Google review · ${date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })}`;
}

function ReviewAvatar({ photo, name }: { photo?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase();
  if (!photo || failed) {
    return <span className="ps-gcard-avatar letter" aria-hidden="true">{initial}</span>;
  }
  return (
    <img
      className="ps-gcard-avatar"
      src={photo}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

/** One Google review card (reused in the endless loop track). */
function GoogleReviewCard({
  item,
  googleUrl,
}: {
  item: Record<string, string>;
  googleUrl: string;
}) {
  const s = Math.min(5, Math.max(1, Number(item.rating) || 5));
  const name = item.patient_name || "Patient";
  const photo = item.patient_photo_url;
  return (
    <article className="ps-gcard">
      <header className="ps-gcard-head">
        <div className="ps-gcard-who">
          <ReviewAvatar photo={photo} name={name} />
          <div>
            {item.google_author_url ? (
              <a
                className="ps-gcard-name"
                href={item.google_author_url}
                target="_blank"
                rel="noreferrer"
              >
                {name}
              </a>
            ) : (
              <div className="ps-gcard-name">{name}</div>
            )}
            <div className="ps-gcard-when">{reviewDate(item.google_publish_time)}</div>
          </div>
        </div>
        <span className="ps-gcard-g" aria-hidden="true">
          <span style={{ color: "#4285F4" }}>G</span>
        </span>
      </header>
      <div className="ps-gcard-stars" aria-label={`${s} stars`}>
        {Array.from({ length: 5 }).map((_, k) => (
          <span key={k} className={k < s ? "on" : ""}>★</span>
        ))}
        <span className="ps-gcard-verified" title="Google review" aria-hidden="true">✓</span>
      </div>
      <p className="ps-gcard-text">{item.text}</p>
      <div className="ps-gcard-actions">
        <a
          href={item.google_review_url || googleUrl}
          target="_blank"
          rel="noreferrer"
          className="ps-gcard-link"
          aria-label={`View ${name}'s review on Google`}
        >
          View on Google <span aria-hidden="true">↗</span>
        </a>
        {item.google_flag_url && (
          <a
            href={item.google_flag_url}
            target="_blank"
            rel="noreferrer"
            className="ps-gcard-report"
          >
            Report
          </a>
        )}
      </div>
    </article>
  );
}

/**
 * Google multi-card reviews — seamless endless marquee.
 * Places API only returns ~5 review texts per location, so we loop the real
 * reviews (never invent fake Google patients). Hover / focus / arrows pause.
 */
function GoogleReviewsCarousel({
  reviews,
  rating,
  count,
  googleUrl,
}: {
  reviews: Record<string, string>[];
  rating: string;
  count: string;
  googleUrl: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const pauseUntil = useRef(0);

  // Triple the real set so scroll can wrap mid-track without a visual jump.
  const looped = useMemo(() => {
    if (!reviews.length) return [] as { item: Record<string, string>; loopKey: string }[];
    const out: { item: Record<string, string>; loopKey: string }[] = [];
    for (let copy = 0; copy < 3; copy++) {
      reviews.forEach((item, idx) => {
        out.push({ item, loopKey: `${copy}-${String(item.id || idx)}` });
      });
    }
    return out;
  }, [reviews]);

  const nudge = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    setPaused(true);
    pauseUntil.current = performance.now() + 4200;
    const card = el.querySelector(".ps-gcard") as HTMLElement | null;
    const step = card ? card.offsetWidth + 18 : 300;
    el.scrollLeft += dir * step;
    // Keep scroll inside the middle copy for seamless looping
    const oneSet = el.scrollWidth / 3;
    if (oneSet > 0) {
      if (el.scrollLeft >= oneSet * 2) el.scrollLeft -= oneSet;
      if (el.scrollLeft < oneSet * 0.15) el.scrollLeft += oneSet;
    }
    window.setTimeout(() => {
      if (performance.now() >= pauseUntil.current) setPaused(false);
    }, 4300);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el || reviews.length < 1) return;
    // Start on the middle copy so user can scroll either direction endlessly
    const placeMiddle = () => {
      const oneSet = el.scrollWidth / 3;
      if (oneSet > 0) el.scrollLeft = oneSet;
    };
    placeMiddle();
    // Re-place after layout (fonts/images)
    const t = window.setTimeout(placeMiddle, 120);
    return () => window.clearTimeout(t);
  }, [reviews.length, looped.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || reviews.length < 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last = performance.now();
    const SPEED = 42; // px per second — slightly quicker without feeling rushed

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const softPaused = paused || now < pauseUntil.current;
      if (!softPaused) {
        el.scrollLeft += SPEED * dt;
        const oneSet = el.scrollWidth / 3;
        if (oneSet > 0 && el.scrollLeft >= oneSet * 2) {
          el.scrollLeft -= oneSet;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, reviews.length]);

  if (!reviews.length) return null;
  const word = ratingWord(rating);
  const fullStars = Math.min(5, Math.round(parseFloat(rating) || 5));

  return (
    <div className="ps-greviews">
      <div className="ps-greviews-head">
        <p className="ps-greviews-kicker">GOOGLE REVIEWS</p>
        <h2 className="ps-greviews-title">Our patients&apos; most valuable words</h2>
        <div className="ps-greviews-score">
          <div className="ps-greviews-word">{word}</div>
          <div className="ps-greviews-stars" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, s) => (
              <span key={s} className={s < fullStars ? "on" : ""}>★</span>
            ))}
          </div>
          <p className="ps-greviews-based">Based on {count.replace(/\+$/, "") || "53"} reviews</p>
          <GoogleLogo />
        </div>
      </div>

      <div
        className="ps-greviews-carousel ps-greviews-endless"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onPointerDown={() => {
          setPaused(true);
          pauseUntil.current = performance.now() + 5000;
        }}
        onPointerUp={() => {
          pauseUntil.current = performance.now() + 2800;
          window.setTimeout(() => {
            if (performance.now() >= pauseUntil.current) setPaused(false);
          }, 2900);
        }}
      >
        <button type="button" className="ps-greviews-arrow prev" aria-label="Previous reviews" onClick={() => nudge(-1)}>
          ‹
        </button>
        <div
          className="ps-greviews-track ps-greviews-track-endless"
          ref={trackRef}
          role="region"
          aria-label="Google reviews — continuous scroll of real patient reviews"
        >
          {looped.map(({ item, loopKey }) => (
            <GoogleReviewCard key={loopKey} item={item} googleUrl={googleUrl} />
          ))}
        </div>
        <button type="button" className="ps-greviews-arrow next" aria-label="Next reviews" onClick={() => nudge(1)}>
          ›
        </button>
      </div>

      <div className="ps-greviews-foot">
        <a href={googleUrl} target="_blank" rel="noreferrer" className="ps-btn-primary">
          Read all reviews on Google →
        </a>
        <p className="ps-greviews-disclosure">
          Real Google reviews (4★+) from our Rourkela listing — including recent posts and long-time
          patients. The strip loops so it never runs dry. Full set of {count || "53"} lives on Google.
        </p>
      </div>
    </div>
  );
}

/** Cinematic YouTube short / film — poster first, click to play in a theater frame */
function CinematicFilm({
  youtubeId,
  title,
  caption,
  watchUrl,
}: {
  youtubeId: string;
  title: string;
  caption: string;
  watchUrl?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const poster =
    `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  const embed = `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&autoplay=1&playsinline=1`;
  const openUrl = watchUrl || `https://youtube.com/shorts/${youtubeId}`;

  return (
    <div className="ps-cinema">
      <div className="ps-cinema-ambient" aria-hidden="true">
        <span className="ps-cinema-glow a" />
        <span className="ps-cinema-glow b" />
        <span className="ps-cinema-grain" />
      </div>
      <div className="ps-cinema-stage">
        <div className="ps-cinema-letterbox top" aria-hidden="true" />
        <div className="ps-cinema-frame">
          <div className="ps-cinema-screen">
            {playing ? (
              <iframe
                src={embed}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                className="ps-cinema-poster"
                onClick={() => setPlaying(true)}
                aria-label={`Play ${title}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster} alt="" className="ps-cinema-poster-img" />
                <span className="ps-cinema-poster-veil" aria-hidden="true" />
                <span className="ps-cinema-play" aria-hidden="true">
                  <span className="ps-cinema-play-ring" />
                  <span className="ps-cinema-play-tri">▶</span>
                </span>
                <span className="ps-cinema-now">NOW SHOWING</span>
              </button>
            )}
          </div>
          <div className="ps-cinema-meta">
            <div>
              <p className="ps-cinema-kicker">Siya Dental Care · On film</p>
              <h3 className="ps-cinema-title">{title}</h3>
              <p className="ps-cinema-caption">{caption}</p>
            </div>
            <div className="ps-cinema-actions">
              {!playing && (
                <button type="button" className="ps-btn-primary" onClick={() => setPlaying(true)}>
                  Play film →
                </button>
              )}
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="ps-btn-ghost ps-cinema-yt"
              >
                Open on YouTube
              </a>
            </div>
          </div>
        </div>
        <div className="ps-cinema-letterbox bottom" aria-hidden="true" />
      </div>
    </div>
  );
}

// ── Reveal-on-scroll: add .ps-reveal to a section, it animates in once visible ──
function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".ps-reveal"));
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("ps-revealed"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("ps-revealed");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => {
      // Re-trigger animation if already revealed from a prior mount
      if (!el.classList.contains("ps-revealed")) io.observe(el);
    });
    // Fallback: reveal anything still hidden after 1.2s (e.g. above-fold)
    const fallback = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".ps-reveal:not(.ps-revealed)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.95) el.classList.add("ps-revealed");
      });
    }, 400);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const GOOGLE_STAR = "★";

type SiteContent = {
  theme?: Record<string, string>;
  clinics?: Record<string, unknown>[];
  services?: Record<string, unknown>[];
  doctors?: Record<string, unknown>[];
  testimonials?: Record<string, unknown>[];
  videos?: Record<string, unknown>[];
  gallery?: Record<string, unknown>[];
  visitors?: { total?: number; today?: number };
};

const ASSETS = {
  hero: "/brand/dr-monika-hero.jpg",
  tooth: "/hero-tooth.webp",
  toothFallback: "/hero-tooth.png",
  operatory: "/clinic-zip/src/assets/operatory.jpg",
  doctorA: "/brand/dr-monika-portrait.jpg",
  doctorB: "/brand/dr-monika-portrait.jpg",
  logo: "/brand/logo-header.png",
  logoMark: "/brand/logo-transparent.png",
  /** High-contrast lockup for the frosted header plate */
  logoOnWhite: "/brand/logo-on-white.png",
};

const TRUST_ITEMS = [
  { icon: "01", label: "Sterile protocols" },
  { icon: "02", label: "Senior clinical care" },
  { icon: "03", label: "Anxious-patient friendly" },
  { icon: "04", label: "Planned appointments" },
];

const PHILOSOPHY = [
  { title: "Diagnose first, plan second", body: "Photos, scans, and a conversation before any procedure." },
  { title: "Transparent estimates", body: "Written, itemised plans — no surprise billing." },
  { title: "Senior hands, every chair", body: "Treatment led by experienced clinicians." },
  { title: "Follow-through", body: "Check-ins after major work so recovery stays on track." },
];

const JOURNEY = [
  { step: "1", title: "Request online", body: "Share name, phone, preferred date, and what is bothering you." },
  { step: "2", title: "We call to confirm", body: "Front desk confirms the slot and answers first questions." },
  { step: "3", title: "Calm clinic visit", body: "Exam, photos if needed, and a clear written plan — no pressure." },
];

const PUBLIC_CLINIC_TIMINGS = "Mon-Sat: 09:00 AM - 1:00 PM, 5:00 PM - 8:00 PM";

function formatTimings(raw: unknown): string {
  if (!raw) return PUBLIC_CLINIC_TIMINGS;
  if (typeof raw === "string") {
    try {
      return formatTimings(JSON.parse(raw));
    } catch {
      return PUBLIC_CLINIC_TIMINGS;
    }
  }
  if (typeof raw === "object" && raw) {
    const t = raw as Record<string, string>;
    const sun = t.sun || t.sunday;
    const parts = [PUBLIC_CLINIC_TIMINGS, sun ? `Sun: ${sun}` : null].filter(Boolean);
    return parts.join(" · ");
  }
  return PUBLIC_CLINIC_TIMINGS;
}

function mapEmbedForClinic(clinic: Record<string, string>, fallbackAddress: string, siteTitle: string) {
  const latitude = Number(clinic.latitude);
  const longitude = Number(clinic.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps?q=${latitude},${longitude}&z=17&output=embed`;
  }
  const address = clinic.address || fallbackAddress || siteTitle;
  const label = clinic.short_name || clinic.name || "Siya Dental Care";
  return `https://www.google.com/maps?q=${encodeURIComponent(`${label}, ${address}`)}&output=embed`;
}

function distanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusKm = 6371;
  const deltaLat = radians(toLat - fromLat);
  const deltaLng = radians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(fromLat)) *
      Math.cos(radians(toLat)) *
      Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function treatmentVisualKind(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("implant")) return "implant";
  if (normalized.includes("ortho") || normalized.includes("brace") || normalized.includes("align")) return "align";
  if (normalized.includes("root") || normalized.includes("canal")) return "root";
  if (normalized.includes("white") || normalized.includes("bleach")) return "whitening";
  if (normalized.includes("pediatric") || normalized.includes("child")) return "pediatric";
  if (normalized.includes("surgery") || normalized.includes("extraction")) return "surgery";
  return "cosmetic";
}

function TreatmentVisual({ name }: { name: string }) {
  const kind = treatmentVisualKind(name);
  const diagrams = {
    cosmetic: (
      <>
        <path className="ps-treatment-line ps-treatment-main" d="M20 44c13 18 27 26 40 26s27-8 40-26" />
        <path className="ps-treatment-line" d="M30 43v10m15-6v13m15-11v14m15-16v13m15-17v10" />
        <path className="ps-treatment-accent ps-treatment-pulse" d="m91 17 2.5 6.5L100 26l-6.5 2.5L91 35l-2.5-6.5L82 26l6.5-2.5Z" />
      </>
    ),
    whitening: (
      <>
        <path className="ps-treatment-line ps-treatment-main" d="M42 13c-13 0-21 9-19 23 1 8 6 14 8 25 2 10 5 16 10 16 7 0 6-18 14-18s7 18 14 18c5 0 8-6 10-16 2-11 7-17 8-25 2-14-6-23-19-23-6 0-8 4-13 4s-7-4-13-4Z" />
        <path className="ps-treatment-accent ps-treatment-pulse" d="m91 13 2.5 6.5L100 22l-6.5 2.5L91 31l-2.5-6.5L82 22l6.5-2.5Z" />
        <path className="ps-treatment-accent" d="m24 19 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" />
      </>
    ),
    root: (
      <>
        <path className="ps-treatment-line ps-treatment-main" d="M42 12c-13 0-21 9-19 23 1 8 6 14 8 25 2 11 5 17 10 17 7 0 6-19 14-19s7 19 14 19c5 0 8-6 10-17 2-11 7-17 8-25 2-14-6-23-19-23-6 0-8 4-13 4s-7-4-13-4Z" />
        <path className="ps-treatment-accent ps-treatment-scan" d="M55 23v24c-8 7-10 15-11 24m11-24c8 7 10 15 11 24" />
        <circle className="ps-treatment-dot" cx="55" cy="23" r="3" />
      </>
    ),
    implant: (
      <>
        <path className="ps-treatment-line ps-treatment-main" d="M38 13h34c5 0 9 4 9 9v12c0 7-6 13-13 13H42c-7 0-13-6-13-13V22c0-5 4-9 9-9Z" />
        <path className="ps-treatment-accent ps-treatment-set" d="M49 48h12v8H49zm2 8h8v24h-8zM47 61h16m-16 7h16m-15 7h14" />
        <path className="ps-treatment-line" d="M36 29h38" />
      </>
    ),
    align: (
      <>
        <path className="ps-treatment-line ps-treatment-main" d="M14 48c10 16 25 24 41 24s31-8 41-24" />
        <path className="ps-treatment-line" d="M22 40h14v18H22zm17 5h14v18H39zm17 0h14v18H56zm17-5h14v18H73z" />
        <path className="ps-treatment-accent ps-treatment-wire" d="M18 50c19 8 55 8 74 0" />
        <path className="ps-treatment-accent" d="M27 47v7m19-5v8m17-8v8m19-10v7" />
      </>
    ),
    pediatric: (
      <>
        <path className="ps-treatment-line ps-treatment-main" d="M42 13c-13 0-21 9-19 23 1 8 6 14 8 25 2 10 5 16 10 16 7 0 6-18 14-18s7 18 14 18c5 0 8-6 10-16 2-11 7-17 8-25 2-14-6-23-19-23-6 0-8 4-13 4s-7-4-13-4Z" />
        <circle className="ps-treatment-dot" cx="44" cy="37" r="2.5" />
        <circle className="ps-treatment-dot" cx="66" cy="37" r="2.5" />
        <path className="ps-treatment-accent ps-treatment-smile-line" d="M43 47c6 7 18 7 24 0" />
        <path className="ps-treatment-accent ps-treatment-pulse" d="m92 17 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
      </>
    ),
    surgery: (
      <>
        <path className="ps-treatment-line ps-treatment-main" d="M37 15c-12 2-18 12-14 25 2 8 8 13 11 23 3 10 7 15 12 14 7-1 4-19 12-20 8-2 10 16 17 14 5-1 7-8 7-19 0-11 4-18 3-26-1-14-11-21-23-18-6 1-7 5-12 6-5 1-8-2-13 1Z" />
        <path className="ps-treatment-accent ps-treatment-tool-line" d="m80 17 21 18m-16-23 20 18M73 31l18 15" />
        <path className="ps-treatment-accent" d="m72 29 7-8m-3 12 8-8" />
      </>
    ),
  } as const;
  const labels = {
    cosmetic: "Smile design",
    whitening: "Whitening",
    root: "Root canal",
    implant: "Dental implant",
    align: "Alignment",
    pediatric: "Children’s care",
    surgery: "Oral surgery",
  } as const;

  return (
    <div className={`ps-treatment-visual is-${kind}`} aria-hidden="true">
      <svg className="ps-treatment-diagram" viewBox="0 0 120 90" role="img">
        {diagrams[kind]}
      </svg>
      <span className="ps-treatment-label">{labels[kind]}</span>
    </div>
  );
}

export default function PublicMarketingSite({
  clinicId,
  content,
}: {
  clinicId: string;
  content: SiteContent;
}) {
  const clinic = useMemo(() => {
    const clinics = content?.clinics || [];
    return (
      clinics.find((item) => String(item.id) === String(clinicId)) ||
      clinics[0] ||
      {}
    ) as Record<string, string>;
  }, [content?.clinics, clinicId]);

  const theme = content?.theme || {};
  const services = (content?.services || []).filter(Boolean);
  const doctors = (content?.doctors || []).filter(Boolean);
  const testimonials = (content?.testimonials || []).filter(Boolean);
  const videos = (content?.videos || []).filter(Boolean);
  const gallery = (content?.gallery || []).filter(Boolean);
  const initialVisitors = Number(content?.visitors?.total || 0);
  const allClinics = (content?.clinics || []).filter(Boolean) as Record<string, string>[];

  // Locked brand primary (logo cyan) — CMS may tint accents but site identity stays Siya.
  const primary = "#0EA5B5";
  const siteTitle = theme.site_title || clinic.name || "Siya Dental Care";
  const tagline =
    theme.site_tagline ||
    clinic.tagline ||
    "Your smile, our priority — healthy smile, confident you.";
  const phone = clinic.public_phone || clinic.phone || clinic.whatsapp_number || "";
  const whatsapp =
    clinic.whatsapp_link ||
    (clinic.whatsapp_number ? buildWhatsAppLink(String(clinic.whatsapp_number), "") : "") ||
    (phone ? buildWhatsAppLink(phone, "") : "");
  const streetViewUrl = clinic.street_view_embed_url || "";
  const directionsUrl = clinic.directions_url || "";
  const officeAddress = clinic.address || "Visit us for directions and hours.";
  const logo = theme.logo_url || clinic.logo_url || ASSETS.logo;
  const clinicTimings = formatTimings(clinic.timings);

  const [activeClinicId, setActiveClinicId] = useState(clinicId);
  const activeClinic = useMemo(() => {
    return (
      allClinics.find((c) => String(c.id) === String(activeClinicId)) ||
      clinic
    ) as Record<string, string>;
  }, [activeClinicId, allClinics, clinic]);

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapMode, setMapMode] = useState<"map" | "street">("map");
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);
  const [bookingState, setBookingState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [bookingNote, setBookingNote] = useState("");
  const [clinicLocator, setClinicLocator] = useState<{
    state: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ state: "idle", message: "" });
  const [visitorCount, setVisitorCount] = useState(initialVisitors);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    preferredDate: "",
    service: "",
    clinicId: "",
    message: "",
    website: "", // honeypot — real visitors never see or fill this field
  });

  const selectedBookingClinic = useMemo(() => {
    if (!form.clinicId) return null;
    return (
      allClinics.find((item) => String(item.id) === String(form.clinicId)) ||
      null
    ) as Record<string, string> | null;
  }, [allClinics, form.clinicId]);

  useEffect(() => {
    setActiveClinicId(clinicId);
  }, [clinicId]);

  useEffect(() => {
    try {
      const storageKey = "siya_public_visitor_id";
      let visitorId = window.localStorage.getItem(storageKey);
      if (!visitorId) {
        visitorId = window.crypto.randomUUID();
        window.localStorage.setItem(storageKey, visitorId);
      }
      fetch("/api/site-2026/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitor_id: visitorId }),
        keepalive: true,
      })
        .then((response) => response.ok ? response.json() : null)
        .then((stats) => {
          if (stats?.total != null) setVisitorCount(Number(stats.total));
        })
        .catch(() => undefined);
    } catch {
      // Visitor counting is optional and must never affect the public experience.
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useScrollReveal([services.length, gallery.length, testimonials.length, doctors.length, videos.length]);
  const { mount3D, ready3D, setReady3D } = useHero3D();

  const findNearestClinic = () => {
    if (!navigator.geolocation) {
      setClinicLocator({
        state: "error",
        message: "Location is not available in this browser. Please choose a clinic below.",
      });
      return;
    }

    setClinicLocator({ state: "loading", message: "Checking nearby clinics..." });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const candidates = (allClinics.length ? allClinics : [clinic])
          .map((candidate) => {
            const latitude = Number(candidate.latitude);
            const longitude = Number(candidate.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
            return {
              clinic: candidate,
              distance: distanceKm(coords.latitude, coords.longitude, latitude, longitude),
            };
          })
          .filter(Boolean) as { clinic: Record<string, string>; distance: number }[];

        candidates.sort((a, b) => a.distance - b.distance);
        const nearest = candidates[0];
        if (!nearest) {
          setClinicLocator({
            state: "error",
            message: "Clinic coordinates are unavailable. Please choose a clinic below.",
          });
          return;
        }

        const nearestId = String(nearest.clinic.id);
        setForm((current) => ({ ...current, clinicId: nearestId }));
        setActiveClinicId(nearestId);
        setBookingState("idle");
        setBookingNote("");
        setClinicLocator({
          state: "success",
          message: `${nearest.clinic.short_name || nearest.clinic.name} is closest, approximately ${nearest.distance.toFixed(1)} km away.`,
        });
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        setClinicLocator({
          state: "error",
          message: denied
            ? "Location access was not allowed. Your privacy is respected; please choose a clinic manually."
            : "We could not determine your location. Please choose a clinic manually.",
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  // Google reviews — filled by `python scripts/sync_google_places.py` once Places API (New) is enabled.
  const googleRating = String(theme.google_rating || "4.9");
  const googleCount = String(theme.google_review_count || "—");
  const googleUrl =
    theme.google_reviews_url ||
    activeClinic.google_maps_link ||
    `https://www.google.com/search?q=${encodeURIComponent(siteTitle + " " + (activeClinic.address || "Rourkela") + " reviews")}`;

  // Hero stats — clinics stay; services count is not shown here (services section has the list).
  const heroStats = [
    { value: "8000+", label: "Patients" },
    { value: googleRating, label: "Google rating" },
    { value: String(allClinics.length || 2), label: "Clinics" },
  ];

  const activeAddress = activeClinic.address || officeAddress;
  const activeStreetUrl = activeClinic.street_view_embed_url || streetViewUrl;
  const activeDirections = activeClinic.directions_url || directionsUrl;
  const mapQuery = encodeURIComponent(activeAddress || siteTitle);
  const mapEmbed = mapEmbedForClinic(activeClinic, officeAddress, siteTitle);
  const streetEmbed =
    activeStreetUrl || `https://www.google.com/maps?q=${mapQuery}&layer=c&z=17&output=embed`;

  // All media from backend CMS (`/api/site-2026/content` → gallery + videos).
  const galleryList = useMemo(() => {
    return gallery
      .map((g) => g as Record<string, string>)
      .filter((g) => Boolean(g.image_url));
  }, [gallery]);

  const clinicPhoto =
    galleryList.find((g) => /clinic|treatment|hero/i.test(String(g.category || "")))?.image_url ||
    galleryList[0]?.image_url ||
    ASSETS.operatory;
  const philosophyPhoto =
    galleryList.find((g) => String(g.image_url).includes("daily-market-2"))?.image_url ||
    galleryList.find((g) => /treatment suite|operatory|clinic/i.test(String(g.title || "")))?.image_url ||
    clinicPhoto;
  const hasStreetView = Boolean(activeStreetUrl);

  const reviewCards = (testimonials as Record<string, string>[]).filter(
      (review) => Number(review.rating || 0) >= 4 && String(review.text || "").trim().length > 0,
    );

  /** Clinic tour slideshow — only images staff uploaded to gallery (clinic / treatment / hero). */
  const clinicPhotos = useMemo(() => {
    const allowed = new Set(["clinic", "treatment", "hero"]);
    const fromCms = galleryList.filter((g) => allowed.has(String(g.category || "clinic").toLowerCase()));
    const source = fromCms.length ? fromCms : galleryList.filter((g) => g.category !== "before_after");

    return source.map((g) => {
      const isJhir = String(g.image_url || "").includes("jhirpani");
      let title = (g.title || "").replace(/photo\s*\d+/i, "").trim();
      if (!title || (/^daily market/i.test(title) && /photo/i.test(title))) {
        title = "Clinic interior";
      }
      return {
        src: g.image_url,
        title,
        caption: g.caption || (isJhir ? "Jhirpani clinic" : "Daily Market clinic"),
      };
    });
  }, [galleryList]);

  /**
   * Before/after pairs from gallery category `before_after`.
   * Pair by matching `title` (treatment name); caption is `before|note` or `after|note`.
   * Managed in /clinic → Website → Gallery.
   */
  const baPairs = useMemo(() => {
    const items = galleryList.filter((g) => String(g.category || "").toLowerCase() === "before_after");
    const byTitle = new Map<string, { before?: string; after?: string; note?: string; order: number }>();
    items.forEach((g, idx) => {
      const title = (g.title || `Result ${idx + 1}`).trim();
      const cap = String(g.caption || "");
      const [sideRaw, ...noteParts] = cap.split("|");
      const side = sideRaw.trim().toLowerCase();
      const note = noteParts.join("|").trim();
      const entry = byTitle.get(title) || { order: idx };
      if (side === "after" || /after/i.test(cap) && side !== "before") {
        entry.after = g.image_url;
      } else if (side === "before" || /before/i.test(cap)) {
        entry.before = g.image_url;
      } else {
        // Fallback: even index = before, odd = after within same title
        if (!entry.before) entry.before = g.image_url;
        else entry.after = g.image_url;
      }
      if (note) entry.note = note;
      byTitle.set(title, entry);
    });

    const pairs = Array.from(byTitle.entries())
      .map(([label, v], i) => ({
        id: `ba-${i}-${label.slice(0, 24)}`,
        label,
        before: v.before || "",
        after: v.after || "",
        note: v.note || "Smile transformation from our care library.",
        order: v.order,
      }))
      .filter((p) => p.before && p.after)
      .sort((a, b) => a.order - b.order);

    return pairs;
  }, [galleryList]);

  const submitBookingRequest = async () => {
    if (form.website.trim()) return; // honeypot tripped — silently drop
    if (!selectedBookingClinic) {
      setBookingState("error");
      setBookingNote("Please select the clinic you would like to visit.");
      return;
    }
    if (!form.name.trim() || !form.phone.trim()) {
      setBookingState("error");
      setBookingNote("Please enter your name and phone number.");
      return;
    }

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setBookingState("error");
      setBookingNote("Enter a valid 10-digit mobile number so we can call you back.");
      return;
    }

    const payload = {
      patient_name: form.name.trim(),
      phone: form.phone.trim(),
      preferred_date: form.preferredDate || null,
      preferred_time: null,
      branch: selectedBookingClinic.short_name || selectedBookingClinic.name || siteTitle,
      message: form.message.trim() || null,
      clinic_id: String(selectedBookingClinic.id),
      source: "public_site",
      service: form.service || null,
    };

    setBookingState("submitting");
    setBookingNote("");
    try {
      const result = await api.publicAppointmentRequest(payload);
      setBookingState("success");
      // Server returns a clear message for new vs already-pending (same phone) requests.
      setBookingNote(
        result?.message ||
          "Request received. The clinic will call to confirm your slot."
      );
      setForm((current) => ({ ...current, preferredDate: "", message: "" }));
    } catch (error: unknown) {
      setBookingState("error");
      const msg = error instanceof Error ? error.message : "Could not submit online.";
      setBookingNote(msg);
      // Only fall back to WhatsApp for real failures — not for validation/rate-limit
      // messages that patients should fix and retry.
      const softFail = /too many|valid phone|required|try again/i.test(msg);
      if (!softFail) {
        const fallbackMessage = [
          `Hi, I want to book an appointment at ${selectedBookingClinic.short_name || siteTitle}.`,
          form.name ? `Name: ${form.name}` : null,
          form.phone ? `Phone: ${form.phone}` : null,
          form.preferredDate ? `Preferred date: ${form.preferredDate}` : null,
          form.service ? `Service: ${form.service}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        const selectedPhone = String(
          selectedBookingClinic.whatsapp_number ||
          selectedBookingClinic.public_phone ||
          selectedBookingClinic.phone ||
          phone ||
          "",
        );
        const target =
          selectedBookingClinic.whatsapp_link ||
          (selectedPhone ? buildWhatsAppLink(selectedPhone, fallbackMessage) : whatsapp);
        if (target) window.open(target, "_blank", "noopener,noreferrer");
      }
    }
  };

  const navLinks = [
    ["Clinic", "#clinic-photos"],
    ["Results", "#ai-results"],
    ["Services", "#services"],
    ["Reviews", "#reviews"],
    ["Doctors", "#doctors"],
    ["Locations", "#locations"],
    ["Book", "#book"],
  ] as const;

  return (
    <div className="ps-root ps-modern">
      <header className={`ps-header${scrolled ? " scrolled" : ""}`}>
        <div className="ps-container">
          <div className="ps-header-inner">
            <a href="/" className="ps-brand ps-brand-premium" aria-label={`${siteTitle} home`}>
              <span className="ps-brand-plate">
                <Image
                  src={ASSETS.logoOnWhite || logo || ASSETS.logo}
                  alt={siteTitle}
                  className="ps-brand-logo"
                  width={280}
                  height={100}
                  priority
                  quality={100}
                  sizes="(max-width: 768px) 168px, 210px"
                />
              </span>
            </a>

            <nav className="ps-nav-desktop" aria-label="Main">
              {navLinks.map(([label, href]) => (
                <a key={href} href={href} className="ps-nav-link">{label}</a>
              ))}
            </nav>

            <div className="ps-nav-actions">
              <a href="#locations" className="ps-btn-ghost ps-header-clinic">
                <span aria-hidden="true">⌖</span> Choose clinic
              </a>
              <a href="#book" className="ps-btn-primary ps-header-book">
                Book appointment <span aria-hidden="true">→</span>
              </a>
            </div>

            <button
              type="button"
              className="ps-menu-toggle"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>

          {menuOpen && (
            <nav className="ps-nav-mobile" aria-label="Mobile">
              {navLinks.map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
              ))}
              <a href="/public/consult" onClick={() => setMenuOpen(false)}>Phone consult</a>
              <a href="#locations" onClick={() => setMenuOpen(false)}>Choose a clinic to call</a>
              <a href="#book" className="ps-btn-primary" style={{ marginTop: 8, justifyContent: "center" }} onClick={() => setMenuOpen(false)}>
                Book appointment
              </a>
            </nav>
          )}
        </div>
      </header>

      {/* Hero — modern clinic of the future */}
      <section className="ps-hero ps-container ps-pop" id="top">
        <div className="ps-hero-panel ps-fade-up">
          <div className="ps-hero-glow ps-hero-glow-one" aria-hidden="true" />
          <div className="ps-hero-glow ps-hero-glow-two" aria-hidden="true" />
          <div className="ps-hero-grid">
            <div>
              <div className="ps-brand-lockup">
                <Image src={logo || ASSETS.logo} alt="" className="ps-brand-lockup-logo" width={72} height={52} priority />
                <div>
                  <div className="ps-brand-lockup-name">Siya Dental Care</div>
                  <div className="ps-brand-lockup-sub">Dr. Monika Tejawat · Rourkela</div>
                </div>
              </div>
              <div className="ps-hero-chip-row">
                <span className="ps-pill soft">Daily Market · Jhirpani</span>
                <span className="ps-pill soft">{googleRating}★ Google · {googleCount}</span>
                <span className="ps-pill soft">8000+ patients</span>
              </div>
              <h1 className="ps-display">
                Siya Dental Care<br />
                <em>your smile, our priority.</em>
              </h1>
              <p className="ps-hero-lead">{tagline}</p>
              <div className="ps-hero-actions">
                <a href="#book" className="ps-btn-primary">Book a visit →</a>
                <a href="#clinic-photos" className="ps-btn-ghost">See the clinic</a>
                <a href="#reviews" className="ps-btn-ghost">Patient reviews</a>
              </div>
              <dl className="ps-hero-stats">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="ps-stat-tile">
                    <CountUpStat value={stat.value} />
                    <dd>{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="ps-hero-visual ps-hero-stage" aria-label="Siya brand visual">
              <div className="ps-hero-orb ps-hero-orb-a" aria-hidden="true" />
              <div className="ps-hero-orb ps-hero-orb-b" aria-hidden="true" />
              <div className="ps-hero-orb ps-hero-orb-c" aria-hidden="true" />
              <div className="ps-visual-ring ps-ring-one" aria-hidden="true" />
              <div className="ps-visual-ring ps-ring-two" aria-hidden="true" />
              <div className="ps-visual-ring ps-ring-glow" aria-hidden="true" />
              {/* Reduced-motion users (who never get the 3D scene) still see a crisp
                  ceramic tooth. Everyone else gets the live 3D visual below. */}
              {!mount3D && (
                <div className="ps-hero-tooth-fallback" aria-hidden="true">🦷</div>
              )}
              {mount3D && (
                <div className={`ps-hero-3d${ready3D ? " on" : ""}`} aria-hidden="true">
                  <HeroTooth3D onReady={() => setReady3D(true)} />
                </div>
              )}
              <div className="ps-float-chip ps-float-care">
                <span className="ps-float-icon" aria-hidden="true">✦</span>
                <div>
                  <small>SIYA DENTAL CARE</small>
                  <strong>Dr. Monika Tejawat</strong>
                </div>
              </div>
              <div className="ps-float-chip ps-float-clinics">
                <span className="ps-status-dot" aria-hidden="true" />
                <div>
                  <small>ROURKELA</small>
                  <strong>Daily Market · Jhirpani</strong>
                </div>
              </div>
              <p className="ps-visual-caption">
                <span>SIYA DENTAL CARE</span>
                Care that feels as good as it looks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / care strip */}
      <section className="ps-trust ps-pop" id="trust" aria-label="Care promise">
        <div className="ps-container ps-trust-inner ps-care-strip">
          {TRUST_ITEMS.map((item, index) => (
            <div key={item.label} className="ps-trust-item">
              {index > 0 && <span className="ps-care-sep" aria-hidden="true">✦</span>}
              <span className="ps-trust-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Cinematic films — driven only by CMS `site_videos` (Website Manager → Videos) */}
      {(() => {
        const list = (videos || [])
          .map((v) => v as Record<string, string | boolean>)
          .filter((v) => String(v.youtube_id || v.video_url || "").trim());
        if (!list.length) return null;
        const multi = list.length > 1;
        return (
          <section className="ps-section ps-film-section ps-reveal ps-pop" id="film">
            <div className="ps-container">
              <div className="ps-section-head center ps-film-head">
                <div className="ps-eyebrow ps-film-eyebrow">Feature presentation</div>
                <h2 className="ps-display ps-film-display">
                  {multi ? "Watch the clinic on film." : "Watch the clinic story."}
                </h2>
                <p className="ps-section-sub ps-film-sub">
                  {multi
                    ? "Dim the lights. Short films from Siya Dental Care — press play on any reel."
                    : "Dim the lights. A short film from Siya Dental Care — press play when you\u2019re ready."}
                </p>
              </div>
              <div className={`ps-cinema-reels${multi ? " multi" : ""}`}>
                {list.map((v) => {
                  const ytId = String(v.youtube_id || "");
                  const watch = ytId
                    ? `https://youtube.com/shorts/${ytId}`
                    : String(v.video_url || "#");
                  return (
                    <CinematicFilm
                      key={String(v.id || ytId || v.video_url)}
                      youtubeId={ytId}
                      title={String(v.title || "Siya Dental Care")}
                      caption={String(v.caption || "Siya Dental Care · Rourkela")}
                      watchUrl={watch}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Clinic photo slideshow */}
      {clinicPhotos.length > 0 && (
        <section className="ps-section ps-reveal ps-pop" id="clinic-photos">
          <div className="ps-container">
            <div className="ps-section-head center">
              <div className="ps-eyebrow">Our clinic</div>
              <h2 className="ps-display">Step inside Siya Dental Care.</h2>
              <p className="ps-section-sub">
                A calm look through our treatment and consultation spaces. The slideshow advances automatically, or use the arrows.
              </p>
            </div>
            <div className="ps-clinic-slideshow">
              <PhotoCardSlideshow
                photos={clinicPhotos}
                onOpen={(src, title) => setLightbox({ src, title })}
              />
            </div>
          </div>
        </section>
      )}

      {/* Before / after — from CMS gallery category before_after */}
      {baPairs.length > 0 && (
        <section className="ps-section ps-section-soft ps-reveal ps-pop" id="ai-results">
          <div className="ps-container">
            <div className="ps-section-head center">
              <div className="ps-eyebrow">Smile transformations</div>
              <h2 className="ps-display">Whitening. Alignment. New smile.</h2>
              <p className="ps-section-sub">
                Drag each slider. Results are managed from the clinic website gallery.
              </p>
            </div>
            <BeforeAfterCardShow pairs={baPairs} />
          </div>
        </section>
      )}

      {/* Services */}
      <section className="ps-section ps-section-soft ps-reveal ps-pop" id="services">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-eyebrow">What we do</div>
            <h2 className="ps-display">A complete dental home, without the upsell.</h2>
            <p className="ps-mobile-swipe-hint">Swipe to explore treatments →</p>
          </div>
          {services.length > 0 ? (
            <div className="ps-service-grid">
              {services.slice(0, 6).map((service) => {
                const s = service as Record<string, string | number>;
                return (
                  <a key={String(s.id)} href="#book" className="ps-service-item">
                    <TreatmentVisual name={String(s.name || "")} />
                    <h3>{s.name}</h3>
                    <p>{s.short_description || s.full_description || "Gentle, carefully planned care."}</p>
                    <div className="ps-service-meta">
                      <span>
                        {s.duration_minutes
                          ? `${s.duration_minutes} min`
                          : s.duration || "By plan"}
                      </span>
                      {s.price_starting_from ? (
                        <span>From ₹{Number(s.price_starting_from).toLocaleString("en-IN")}</span>
                      ) : (
                        <span>Ask for estimate</span>
                      )}
                    </div>
                    <span className="ps-service-cta">Ask about this <span aria-hidden="true">↗</span></span>
                  </a>
                );
              })}
            </div>
          ) : (
            <EmptyNote text="Our full care menu is being updated. Book a visit and we’ll guide you through options." />
          )}
        </div>
      </section>

      {/* Philosophy */}
      <section className="ps-section ps-section-dark ps-reveal ps-pop" id="philosophy">
        <div className="ps-container ps-philosophy-grid">
          <div className="ps-philosophy-image">
            <Image src={philosophyPhoto} alt="Siya Dental Care treatment suite" fill sizes="(max-width: 900px) 100vw, 480px" style={{ objectFit: "cover" }} />
          </div>
          <div>
            <div className="ps-eyebrow">Our philosophy</div>
            <h2 className="ps-display ps-display-lg">
              Dentistry should feel like a conversation, not a transaction.
            </h2>
            <p className="ps-muted ps-lede">
              We show you what we see. We talk through every option, including doing nothing.
              Estimates are itemised before treatment begins.
            </p>
            <div className="ps-philosophy-points">
              {PHILOSOPHY.map((item) => (
                <div key={item.title}>
                  <h4>{item.title}</h4>
                  <p className="ps-muted ps-point-copy">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Doctors */}
      <section className="ps-section ps-reveal ps-pop" id="doctors">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-eyebrow">The team</div>
            <h2 className="ps-display">People you&apos;ll come to trust.</h2>
            <p className="ps-section-sub">
              Experienced clinicians, calm chairside manner, and clear explanations at every step.
            </p>
          </div>
          {(() => {
            const list = doctors.length
              ? doctors
              : [
                  {
                    id: "fallback",
                    display_name: "Dr. Monika Tejawat",
                    designation: "Lead Dentist",
                    qualification: "BDS",
                    bio: "Founder of Siya Dental Care. Expert care, advanced technology, and a gentle approach at Daily Market and Jhirpani clinics in Rourkela.",
                    photo_url: ASSETS.doctorA,
                  },
                ];
            return (
              <div className={`ps-doctor-feature${list.length === 1 ? " single" : ""}`}>
                {list.map((doctor, index) => {
                  const d = doctor as Record<string, unknown>;
                  const photo = String(d.photo_url || (index % 2 === 0 ? ASSETS.doctorA : ASSETS.doctorB));
                  const name = String(d.display_name || d.name || "Doctor");
                  return (
                    <article key={String(d.id || index)} className="ps-card ps-doctor-feature-card">
                      <div className="ps-doctor-feature-photo">
                        <Image src={photo} alt={name} fill sizes="(max-width: 768px) 100vw, 360px" style={{ objectFit: "cover", objectPosition: "top center" }} />
                      </div>
                      <div className="ps-doctor-feature-copy">
                        <div className="ps-eyebrow">Lead clinician</div>
                        <h3 className="ps-display">{name}</h3>
                        <div className="ps-doctor-role">
                          {String(d.designation || "Dentist")}
                          {d.qualification ? ` · ${String(d.qualification)}` : ""}
                        </div>
                        <p className="ps-doctor-bio">
                          {String(d.bio || "Clinical profile published from admin.")}
                        </p>
                        <div className="ps-doctor-pills">
                          <span>Gentle care</span>
                          <span>Advanced tech</span>
                          <span>Rourkela</span>
                        </div>
                        <div className="ps-location-actions">
                          <a href="#book" className="ps-btn-primary">Book with us</a>
                          <a href="/public/consult" className="ps-btn-ghost">Phone consult</a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </section>

      {/* Google reviews — multi-card carousel like premium clinic sites */}
      <section className="ps-section ps-greviews-section ps-reveal ps-pop" id="reviews">
        <div className="ps-container">
          {reviewCards.length > 0 ? (
            <GoogleReviewsCarousel
              reviews={reviewCards}
              rating={googleRating}
              count={googleCount}
              googleUrl={googleUrl}
            />
          ) : (
            <EmptyNote text="Reviews will appear after Google sync." />
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="ps-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightbox(null)}
        >
          <button type="button" className="ps-lightbox-close" aria-label="Close" onClick={() => setLightbox(null)}>
            ✕
          </button>
          <img src={lightbox.src} alt={lightbox.title} onClick={(e) => e.stopPropagation()} />
          <p>{lightbox.title}</p>
        </div>
      )}

      {/* Booking */}
      <section className="ps-section ps-reveal ps-pop" id="book">
        <div className="ps-container">
          <div className="ps-section-head center">
            <div className="ps-eyebrow">Private appointment request</div>
            <h2 className="ps-display">Your visit, thoughtfully arranged.</h2>
            <p className="ps-section-sub">
              Choose your clinic and share a few details. No account or online payment is required;
              our team will call to personally confirm your appointment.
            </p>
          </div>
          <div className="ps-book-grid">
            <form
              className="ps-card ps-form ps-booking-form"
              onSubmit={(event) => {
                event.preventDefault();
                submitBookingRequest();
              }}
            >
              <div className="ps-booking-form-head">
                <span className="ps-booking-step">01</span>
                <div>
                  <div className="ps-eyebrow">Choose your clinic</div>
                  <h3 className="ps-display">Where would you like to visit?</h3>
                </div>
                <button
                  type="button"
                  className="ps-nearest-btn"
                  onClick={findNearestClinic}
                  disabled={clinicLocator.state === "loading"}
                >
                  <span aria-hidden="true">⌖</span>
                  {clinicLocator.state === "loading" ? "Finding nearest..." : "Find nearest clinic"}
                </button>
              </div>

              <div className="ps-booking-clinics" role="radiogroup" aria-label="Select clinic">
                {(allClinics.length ? allClinics : [clinic]).map((candidate, index) => {
                  const candidateId = String(candidate.id || clinicId);
                  const checked = String(form.clinicId) === candidateId;
                  return (
                    <label key={candidateId} className={`ps-booking-clinic${checked ? " selected" : ""}`}>
                      <input
                        type="radio"
                        name="clinic"
                        value={candidateId}
                        checked={checked}
                        onChange={() => {
                          setForm((current) => ({ ...current, clinicId: candidateId }));
                          setActiveClinicId(candidateId);
                          setClinicLocator({ state: "idle", message: "" });
                          setBookingState("idle");
                          setBookingNote("");
                        }}
                      />
                      <span className="ps-booking-clinic-index">0{index + 1}</span>
                      <span className="ps-booking-clinic-copy">
                        <strong>{candidate.short_name || candidate.name}</strong>
                        <small>{candidate.address}</small>
                      </span>
                      <span className="ps-booking-clinic-check" aria-hidden="true">{checked ? "✓" : ""}</span>
                    </label>
                  );
                })}
              </div>

              {clinicLocator.message && (
                <div className={`ps-locator-note ${clinicLocator.state}`} role="status">
                  <span aria-hidden="true">{clinicLocator.state === "success" ? "✓" : "i"}</span>
                  <div>
                    <strong>
                      {clinicLocator.state === "success"
                        ? "Nearest clinic selected"
                        : clinicLocator.state === "loading"
                          ? "Checking distance"
                          : "Choose manually"}
                    </strong>
                    <p>{clinicLocator.message}</p>
                    {clinicLocator.state === "success" && <small>Straight-line estimate; road distance may vary.</small>}
                  </div>
                </div>
              )}

              <div className="ps-booking-divider">
                <span className="ps-booking-step">02</span>
                <div>
                  <div className="ps-eyebrow">Your details</div>
                  <h3 className="ps-display">How can we help?</h3>
                </div>
              </div>

              <input
                type="text"
                name="website"
                value={form.website}
                onChange={(e) => setForm((c) => ({ ...c, website: e.target.value }))}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              />
              <div className="ps-booking-row">
                <FormField
                  label="Your name"
                  value={form.name}
                  onChange={(v) => setForm((c) => ({ ...c, name: v }))}
                  placeholder="Full name"
                  autoComplete="name"
                  required
                />
                <FormField
                  label="Mobile number"
                  value={form.phone}
                  onChange={(v) => setForm((c) => ({ ...c, phone: v }))}
                  type="tel"
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  required
                />
              </div>
              <div className="ps-booking-row">
                <FormField
                  label="Preferred date"
                  value={form.preferredDate}
                  onChange={(v) => setForm((c) => ({ ...c, preferredDate: v }))}
                  type="date"
                  min={new Date().toLocaleDateString("en-CA")}
                />
                <div className="ps-field">
                  <label>
                    <span>Treatment or concern</span>
                    <select
                      value={form.service}
                      onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))}
                    >
                      <option value="">Not sure yet</option>
                      {services.map((service, index) => {
                        const item = service as Record<string, string>;
                        return <option key={String(item.id || index)} value={item.name}>{item.name}</option>;
                      })}
                    </select>
                  </label>
                </div>
              </div>
              <FormField
                label="Anything you would like us to know?"
                value={form.message}
                onChange={(v) => setForm((c) => ({ ...c, message: v }))}
                multiline
                placeholder="Tell us what is bothering you, whether you feel anxious, or which time of day works best."
              />
              {bookingState === "success" && (
                <div className="ps-success">
                  <strong>Request received.</strong> {bookingNote}
                </div>
              )}
              {bookingState === "error" && bookingNote && (
                <div className="ps-booking-error">{bookingNote}</div>
              )}
              <div className="ps-booking-submit">
                <p><span aria-hidden="true">◇</span> Your details are used only to arrange this appointment.</p>
                <button type="submit" className="ps-btn-primary" disabled={bookingState === "submitting"}>
                  {bookingState === "submitting" ? "Sending request..." : "Request appointment"}
                  {bookingState !== "submitting" && <span aria-hidden="true">→</span>}
                </button>
              </div>
            </form>

            <aside className="ps-booking-aside">
              <div className={`ps-card ps-aside-card ps-selected-clinic-card${selectedBookingClinic ? "" : " empty"}`}>
                <div className="ps-selected-clinic-top">
                  <span className="ps-selected-clinic-mark">{selectedBookingClinic ? "S" : "?"}</span>
                  <div>
                    <div className="ps-eyebrow">{selectedBookingClinic ? "Your selected clinic" : "Clinic not selected"}</div>
                    <h3 className="ps-display">
                      {selectedBookingClinic
                        ? selectedBookingClinic.short_name || selectedBookingClinic.name
                        : "Choose where to visit"}
                    </h3>
                  </div>
                </div>
                {selectedBookingClinic ? (
                  <>
                    <p className="ps-aside-copy">{selectedBookingClinic.address || officeAddress}</p>
                    <div className="ps-selected-clinic-meta">
                      <span><b>Hours</b>{formatTimings(selectedBookingClinic.timings)}</span>
                      {(selectedBookingClinic.public_phone || selectedBookingClinic.phone) && (
                        <a href={`tel:${String(selectedBookingClinic.public_phone || selectedBookingClinic.phone).replace(/\s/g, "")}`}>
                          Call {selectedBookingClinic.public_phone || selectedBookingClinic.phone}
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="ps-aside-copy">
                    Select Daily Market or Jhirpani above, or let us find the clinic closest to you.
                  </p>
                )}
              </div>
              <div className="ps-card ps-aside-card">
                <div className="ps-eyebrow">Simple and personal</div>
                <h3 className="ps-booking-aside-title">What happens next</h3>
                <ol className="ps-journey-list">
                  {JOURNEY.map((step) => (
                    <li key={step.title}>
                      <span className="ps-journey-number">{step.step}</span>
                      <div>
                        <strong>{step.title}</strong>
                        <span>{step.body}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Locations, map + 3D Street View */}
      <section className="ps-section ps-section-soft ps-reveal ps-pop" id="locations">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-eyebrow">Two Rourkela clinics</div>
            <h2 className="ps-display">Choose a clinic and get directions.</h2>
            <p className="ps-section-sub">
              Select Daily Market or Jhirpani, then explore the map or Street View. Timings: {clinicTimings}.
            </p>
          </div>

          {allClinics.length > 1 && (
            <div className="ps-clinic-tabs">
              {allClinics.map((c) => (
                <button
                  key={String(c.id)}
                  type="button"
                  className={`ps-clinic-tab${String(c.id) === String(activeClinicId) ? " active" : ""}`}
                  onClick={() => {
                    setActiveClinicId(String(c.id));
                    setMapMode("map");
                  }}
                >
                  {c.short_name || c.name}
                </button>
              ))}
            </div>
          )}

          <div className="ps-map-grid">
            <div className="ps-card" style={{ padding: "1rem" }}>
              <div className="ps-map-badge">
                {mapMode === "street" ? "🧭 3D Street View" : "📍 Google Maps"}
                {hasStreetView && mapMode === "street" ? " · Admin embed" : ""}
              </div>
              <div className="ps-map-tabs">
                <button type="button" className={`ps-map-tab${mapMode === "map" ? " active" : ""}`} onClick={() => setMapMode("map")}>
                  Map
                </button>
                <button type="button" className={`ps-map-tab${mapMode === "street" ? " active" : ""}`} onClick={() => setMapMode("street")}>
                  3D Street View
                </button>
                {activeDirections && (
                  <a href={activeDirections} target="_blank" rel="noreferrer" className="ps-btn-ghost" style={{ marginLeft: "auto", height: "2.25rem" }}>
                    Get directions
                  </a>
                )}
              </div>
              {!hasStreetView && mapMode === "street" && (
                <p className="ps-map-hint">
                  Street View is loading from the area map. Exact entrance view will appear once the clinic pin is linked.
                </p>
              )}
              <iframe
                title={mapMode === "street" ? "3D Street View" : "Clinic map"}
                src={mapMode === "map" ? mapEmbed : streetEmbed}
                loading="lazy"
                className="ps-map-frame"
                allowFullScreen
              />
            </div>
            <div className="ps-location-directory" aria-label="Clinic addresses">
              {(allClinics.length ? allClinics : [clinic]).map((c, index) => {
                const cPhone = String(c.public_phone || c.phone || "");
                const isActive = String(c.id) === String(activeClinicId);
                return (
                  <article key={String(c.id || index)} className={`ps-location-compact${isActive ? " active" : ""}`}>
                    <div className="ps-location-compact-head">
                      <span className="ps-location-number">0{index + 1}</span>
                      <div>
                        <div className="ps-eyebrow">Siya Dental Care</div>
                        <h3>{c.short_name || c.name || `Clinic ${index + 1}`}</h3>
                      </div>
                    </div>
                    <p>{c.address || "Address available on request."}</p>
                    <div className="ps-location-compact-meta">
                      <span>{formatTimings(c.timings)}</span>
                      {cPhone && <a href={`tel:${cPhone.replace(/\s/g, "")}`}>{cPhone}</a>}
                    </div>
                    <div className="ps-location-compact-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveClinicId(String(c.id || clinicId));
                          setMapMode("map");
                        }}
                      >
                        {isActive ? "Showing on map" : "View on map"}
                      </button>
                      {c.directions_url && (
                        <a href={c.directions_url} target="_blank" rel="noreferrer">Directions ↗</a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="ps-footer">
        <div className="ps-container">
          <div className="ps-footer-cta">
            <div>
              <div className="ps-eyebrow">Ready when you are</div>
              <h2 className="ps-display">Let&apos;s make your next visit feel easy.</h2>
              <p>Book online in under a minute. Our team will call to confirm your preferred clinic and time.</p>
            </div>
            <div className="ps-footer-cta-actions">
              <a href="#book" className="ps-btn-primary">Book appointment</a>
              <a href="#locations" className="ps-btn-ghost">Choose clinic</a>
            </div>
          </div>
        </div>
        <div className="ps-container ps-footer-grid">
          <div className="ps-footer-brand">
            <Image src={logo || ASSETS.logo} alt={siteTitle} className="ps-footer-logo" width={160} height={52} />
            <p>{tagline}</p>
            <strong>Dr. Monika Tejawat</strong>
          </div>
          {(allClinics.length ? allClinics : [clinic]).map((c, index) => {
            const cPhone = String(c.public_phone || c.phone || "");
            return (
              <div className="ps-footer-clinic" key={String(c.id || index)}>
                <div className="ps-eyebrow">{c.short_name || `Clinic ${index + 1}`}</div>
                <p>{c.address}</p>
                <span>{formatTimings(c.timings)}</span>
                {cPhone && <a href={`tel:${cPhone.replace(/\s/g, "")}`}>{cPhone}</a>}
                {c.directions_url && <a href={c.directions_url} target="_blank" rel="noreferrer">Get directions ↗</a>}
              </div>
            );
          })}
          <div className="ps-footer-links">
            <div className="ps-eyebrow">Quick links</div>
            <ul>
              <li><a href="#book" className="ps-nav-link" style={{ paddingLeft: 0 }}>Book online</a></li>
              <li><a href="#services" className="ps-nav-link" style={{ paddingLeft: 0 }}>Treatments</a></li>
              <li><a href="#reviews" className="ps-nav-link" style={{ paddingLeft: 0 }}>Google reviews</a></li>
              <li><a href="/public/consult" className="ps-nav-link" style={{ paddingLeft: 0 }}>₹100 phone consult</a></li>
            </ul>
          </div>
        </div>
        <div className="ps-container ps-footer-bottom">
          <span>© {new Date().getFullYear()} {siteTitle}. All rights reserved.</span>
          <span className="ps-footer-meta">
            {visitorCount > 0 && (
              <>
                <span className="ps-visitor-count" title="Privacy-friendly unique browser count">
                  <span aria-hidden="true">◉</span> {visitorCount.toLocaleString("en-IN")} website {visitorCount === 1 ? "visitor" : "visitors"}
                </span>
                <span aria-hidden="true"> · </span>
              </>
            )}
            <a href="/clinic" className="ps-staff-login" title="Doctors, nurses, specialists & admin">
              Staff login
            </a>
            <span aria-hidden="true"> · </span>
            Clinical Calm · Siya Dental Care
          </span>
        </div>
      </footer>

      {/* Sticky mobile call-to-action bar */}
      <div className="ps-mobile-cta">
        <a className="ps-mcta-clinic" href="#locations">
          <span aria-hidden="true">⌖</span> Choose clinic
        </a>
        <a className="ps-mcta-book" href="#book">
          Book appointment <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
  placeholder,
  autoComplete,
  min,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
  autoComplete?: string;
  min?: string;
  required?: boolean;
}) {
  return (
    <div className="ps-field">
      <label>
        <span>{label}</span>
        {multiline ? (
          <textarea
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            min={min}
            required={required}
          />
        )}
      </label>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="ps-card ps-empty-note">
      {text}
    </div>
  );
}

function buildWhatsAppLink(phone: string, message: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return normalized
    ? `https://wa.me/${normalized}${message ? `?text=${encodeURIComponent(message)}` : ""}`
    : "";
}
