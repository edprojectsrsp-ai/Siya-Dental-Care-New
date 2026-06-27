"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ClickToChatLink from "@/components/ClickToChatLink";
import * as api from "@/lib/api";

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
import "@/app/public-site.css";

type SiteContent = {
  theme?: Record<string, string>;
  clinics?: Record<string, unknown>[];
  services?: Record<string, unknown>[];
  doctors?: Record<string, unknown>[];
  testimonials?: Record<string, unknown>[];
  videos?: Record<string, unknown>[];
  gallery?: Record<string, unknown>[];
};

const ASSETS = {
  hero: "/clinic-zip/src/assets/hero-clinic.jpg",
  smile: "/clinic-zip/src/assets/smile-portrait.jpg",
  operatory: "/clinic-zip/src/assets/operatory.jpg",
  doctorA: "/clinic-zip/src/assets/doctor-1.jpg",
  doctorB: "/clinic-zip/src/assets/doctor-2.jpg",
};

const TRUST_ITEMS = [
  { icon: "🛡️", label: "Sterile, single-use protocols" },
  { icon: "🩺", label: "Senior clinical team" },
  { icon: "💚", label: "Anxious-patient care" },
  { icon: "⏱️", label: "On-time appointments" },
];

const PHILOSOPHY = [
  { title: "Diagnose first, plan second", body: "Photos, scans, and a conversation before any procedure." },
  { title: "Transparent estimates", body: "Written, itemised plans — no surprise billing." },
  { title: "Senior hands, every chair", body: "Treatment led by experienced clinicians." },
  { title: "Follow-through", body: "Check-ins after major work so recovery stays on track." },
];

const JOURNEY = [
  { step: "1", title: "Send request", body: "Share name, phone, preferred date, and notes from this page." },
  { step: "2", title: "Confirm in hub", body: "Front desk accepts or adjusts the request in the appointment queue." },
  { step: "3", title: "Move to schedule", body: "Confirmed requests become appointments — no retyping." },
];

const DEFAULT_STATS = [
  { value: "12+", label: "Years" },
  { value: "4.9", label: "Rating" },
  { value: "2k+", label: "Patients" },
  { value: "28", label: "Services" },
];

const SMILE_EFFECTS = [
  { id: "whitening", label: "Whitening", icon: "✨" },
  { id: "braces", label: "Braces preview", icon: "😁" },
  { id: "veneers", label: "Veneers", icon: "💎" },
  { id: "alignment", label: "Alignment guide", icon: "📐" },
];

const USP_FEATURES = [
  {
    icon: "✨",
    title: "Smile Studio",
    body: "AR smile preview — whitening, braces, veneers, and alignment before your first visit.",
    href: "/public/smile",
    cta: "Try Smile Studio",
  },
  {
    icon: "🗺️",
    title: "3D Street View",
    body: "Walk up to the clinic virtually with embedded Google Street View from your doorstep.",
    href: "#map",
    cta: "Explore location",
  },
  {
    icon: "📞",
    title: "Phone Consult",
    body: "₹100 phone consultation with online payment — speak to the team before you visit.",
    href: "/public/consult",
    cta: "Book phone consult",
  },
  {
    icon: "📅",
    title: "Online booking",
    body: "Request an appointment from this site — confirmed directly in the clinic hub queue.",
    href: "#book",
    cta: "Request visit",
  },
  {
    icon: "🖼️",
    title: "Before & After",
    body: "Real treatment results and clinic gallery — updated from admin with patient consent.",
    href: "#gallery",
    cta: "See results",
  },
  {
    icon: "💬",
    title: "WhatsApp care",
    body: "One-tap WhatsApp to book, ask questions, or follow up after treatment.",
    href: "#contact",
    cta: "Chat now",
  },
];

const GALLERY_TABS = [
  { id: "all", label: "All" },
  { id: "before_after", label: "Before / After" },
  { id: "clinic", label: "Clinic" },
  { id: "treatment", label: "Treatments" },
  { id: "team", label: "Team" },
] as const;

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
  const allClinics = (content?.clinics || []).filter(Boolean) as Record<string, string>[];

  const primary = theme.primary_color || clinic.theme_color || "#0E7C7B";
  const siteTitle = theme.site_title || clinic.name || "Siya Dental Care";
  const tagline =
    theme.site_tagline ||
    clinic.tagline ||
    "Modern dentistry, gently delivered.";
  const phone = clinic.public_phone || clinic.phone || "";
  const whatsapp =
    clinic.whatsapp_link || (phone ? buildWhatsAppLink(phone, "") : "");
  const heroImage = clinic.hero_image_url || theme.hero_image_url || ASSETS.hero;
  const mapUrl = clinic.google_maps_embed_url || "";
  const streetViewUrl = clinic.street_view_embed_url || "";
  const directionsUrl = clinic.directions_url || "";
  const officeAddress = clinic.address || "Visit us for directions and hours.";
  const logo = theme.logo_url || clinic.logo_url || "";

  const [activeClinicId, setActiveClinicId] = useState(clinicId);
  const activeClinic = useMemo(() => {
    return (
      allClinics.find((c) => String(c.id) === String(activeClinicId)) ||
      clinic
    ) as Record<string, string>;
  }, [activeClinicId, allClinics, clinic]);

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [mapMode, setMapMode] = useState<"map" | "street">("map");
  const [galleryTab, setGalleryTab] = useState<(typeof GALLERY_TABS)[number]["id"]>("all");
  const [activeSmileEffect, setActiveSmileEffect] = useState("whitening");
  const [bookingState, setBookingState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [bookingNote, setBookingNote] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    preferredDate: "",
    service: "",
    message: "",
  });

  useEffect(() => {
    setActiveClinicId(clinicId);
  }, [clinicId]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!testimonials.length) return;
    const timer = window.setInterval(() => {
      setTestimonialIndex((current) => (current + 1) % testimonials.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [testimonials.length]);

  useEffect(() => {
    const first = services[0] as Record<string, string> | undefined;
    if (!form.service && first?.name) {
      setForm((current) => ({ ...current, service: first.name }));
    }
  }, [form.service, services]);

  const currentTestimonial = testimonials[testimonialIndex] as Record<string, string> | undefined;
  const activeAddress = activeClinic.address || officeAddress;
  const activeMapUrl = activeClinic.google_maps_embed_url || mapUrl;
  const activeStreetUrl = activeClinic.street_view_embed_url || streetViewUrl;
  const activeDirections = activeClinic.directions_url || directionsUrl;
  const mapQuery = encodeURIComponent(activeAddress || siteTitle);
  const mapEmbed = activeMapUrl || `https://www.google.com/maps?q=${mapQuery}&output=embed`;
  const streetEmbed =
    activeStreetUrl || `https://www.google.com/maps?q=${mapQuery}&layer=c&z=17&output=embed`;

  const heroVideo = videos.find((v) => (v as Record<string, string>).category === "hero") as
    | Record<string, string | boolean>
    | undefined;
  const tourVideos = videos.filter((v) => (v as Record<string, string>).category === "clinic_tour");
  const beforeAfter = gallery.filter((g) => (g as Record<string, string>).category === "before_after");
  const filteredGallery = gallery.filter((g) => {
    const cat = (g as Record<string, string>).category;
    return galleryTab === "all" ? true : cat === galleryTab;
  });
  const hasStreetView = Boolean(activeStreetUrl);

  const submitBookingRequest = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setBookingState("error");
      setBookingNote("Please enter your name and phone number.");
      return;
    }

    const payload = {
      patient_name: form.name.trim(),
      phone: form.phone.trim(),
      preferred_date: form.preferredDate || null,
      preferred_time: null,
      branch: clinic.short_name || clinic.name || siteTitle,
      message: form.message.trim() || null,
      clinic_id: clinicId,
      source: "public_site",
      service: form.service || null,
    };

    setBookingState("submitting");
    setBookingNote("");
    try {
      await api.publicAppointmentRequest(payload);
      setBookingState("success");
      setBookingNote("Request received. Open Appointments tab in the clinic app to confirm — it appears within 15 seconds.");
      setForm((current) => ({ ...current, preferredDate: "", message: "" }));
    } catch (error: unknown) {
      setBookingState("error");
      const msg = error instanceof Error ? error.message : "Could not submit online.";
      setBookingNote(msg);
      const fallbackMessage = [
        `Hi, I want to book an appointment at ${siteTitle}.`,
        form.name ? `Name: ${form.name}` : null,
        form.phone ? `Phone: ${form.phone}` : null,
        form.preferredDate ? `Preferred date: ${form.preferredDate}` : null,
        form.service ? `Service: ${form.service}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      const target = whatsapp || (phone ? buildWhatsAppLink(phone, fallbackMessage) : "");
      if (target) window.open(target, "_blank", "noopener,noreferrer");
    }
  };

  const navLinks = [
    ["Smile Studio", "#smile-studio"],
    ["Services", "#services"],
    ["Gallery", "#gallery"],
    ["Doctors", "#doctors"],
    ["3D Map", "#map"],
    ["Book", "#book"],
  ] as const;

  return (
    <div className="ps-root" style={{ ["--ps-teal" as string]: primary }}>
      <header className={`ps-header${scrolled ? " scrolled" : ""}`}>
        <div className="ps-container">
          <div className="ps-header-inner">
            <a href={`/site/${clinicId}`} className="ps-brand">
              {logo ? (
                <img src={logo} alt={siteTitle} style={{ height: 36, borderRadius: 10 }} />
              ) : (
                <span className="ps-brand-mark">s</span>
              )}
              <span className="ps-brand-name">{siteTitle}</span>
            </a>

            <nav className="ps-nav-desktop" aria-label="Main">
              {navLinks.map(([label, href]) => (
                <a key={href} href={href} className="ps-nav-link">{label}</a>
              ))}
            </nav>

            <div className="ps-nav-actions">
              {phone && (
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="ps-btn-ghost">{phone}</a>
              )}
              <a href="#book" className="ps-btn-primary">Book a visit</a>
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
              <a href="/public/smile" onClick={() => setMenuOpen(false)}>Smile Studio</a>
              <a href="/public/consult" onClick={() => setMenuOpen(false)}>Phone consult</a>
              <a href="#book" className="ps-btn-primary" style={{ marginTop: 8, justifyContent: "center" }} onClick={() => setMenuOpen(false)}>
                Book a visit
              </a>
            </nav>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="ps-hero ps-container">
        <div className="ps-hero-grid ps-fade-up">
          <div>
            <div className="ps-eyebrow">{clinic.short_name || clinic.city || "Siya Dental Care"}</div>
            <h1 className="ps-display">
              Modern dentistry,<br />
              <em style={{ color: primary, fontStyle: "italic" }}>gently</em> delivered.
            </h1>
            <p className="ps-hero-lead">{tagline}</p>
            <div className="ps-hero-actions">
              <a href="#book" className="ps-btn-primary">Book a visit →</a>
              <a href="#services" className="ps-btn-ghost">Explore our care</a>
              <a href="/public/smile" className="ps-btn-ghost">Smile preview</a>
            </div>
            <dl className="ps-hero-stats">
              {DEFAULT_STATS.map((stat) => (
                <div key={stat.label}>
                  <CountUpStat value={stat.value} />
                  <dd>{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="ps-hero-visual">
            <div className="ps-hero-image">
              <img src={heroImage} alt={`${siteTitle} clinic`} />
            </div>
            <div className="ps-card ps-hero-float">
              <div className="ps-hero-float-label">✨ Calm-care promise</div>
              <p>Every visit begins with a conversation. No procedure starts until you&apos;re ready.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="ps-trust">
        <div className="ps-container ps-trust-inner">
          {TRUST_ITEMS.map((item) => (
            <div key={item.label} className="ps-trust-item">
              <span className="ps-trust-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* USP highlights */}
      <section className="ps-section" id="usps">
        <div className="ps-container">
          <div className="ps-section-head center">
            <div className="ps-eyebrow">Why patients choose us</div>
            <h2 className="ps-display">Built-in tools that set Siya Dental apart.</h2>
            <p className="ps-section-sub">
              Smile preview, 3D maps, phone consults, and hub-connected booking — all live on your public site.
            </p>
          </div>
          <div className="ps-usp-grid">
            {USP_FEATURES.map((usp) => (
              <a key={usp.title} href={usp.href} className="ps-card ps-usp-card">
                <div className="ps-usp-icon">{usp.icon}</div>
                <h3>{usp.title}</h3>
                <p>{usp.body}</p>
                <span className="ps-usp-link">{usp.cta} →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Smile Studio — flagship USP */}
      <section className="ps-section ps-section-soft" id="smile-studio">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-eyebrow">Smile Studio · AR Preview</div>
            <h2 className="ps-display">See the smile before treatment starts.</h2>
            <p className="ps-section-sub">
              Upload a photo or use your camera. Preview whitening, braces, veneers, and alignment — powered by AR with a free fallback mode.
            </p>
          </div>
          <div className="ps-smile-grid">
            <div className="ps-smile-image">
              <img src={ASSETS.smile} alt="Smile preview portrait" />
            </div>
            <div className="ps-card" style={{ padding: "2rem", display: "grid", alignContent: "center", gap: "1.1rem" }}>
              <div className="ps-effect-row">
                {SMILE_EFFECTS.map((effect) => (
                  <button
                    key={effect.id}
                    type="button"
                    className={`ps-effect-pill${activeSmileEffect === effect.id ? " active" : ""}`}
                    onClick={() => setActiveSmileEffect(effect.id)}
                  >
                    {effect.icon} {effect.label}
                  </button>
                ))}
              </div>
              <p style={{ color: "var(--ps-muted)", lineHeight: 1.75, margin: 0 }}>
                {activeSmileEffect === "whitening" && "Adjustable teeth whitening preview — works instantly with camera or upload."}
                {activeSmileEffect === "braces" && "Visualise orthodontic braces before committing to treatment."}
                {activeSmileEffect === "veneers" && "See how veneer overlays could reshape your smile line."}
                {activeSmileEffect === "alignment" && "Smile-line alignment guide to discuss goals with your dentist."}
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--ps-muted)", fontSize: "0.875rem", lineHeight: 1.7 }}>
                <li>Banuba AR when configured in Settings → AR Preview</li>
                <li>Free face-api.js whitening fallback — always works</li>
                <li>Book consult straight from the smile page</li>
              </ul>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <a href="/public/smile" className="ps-btn-primary">Open Smile Studio</a>
                <a href="/public/consult" className="ps-btn-ghost">Phone consult ₹100</a>
                <a href="#book" className="ps-btn-ghost">Book visit</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero / tour video */}
      {heroVideo && (
        <section className="ps-section">
          <div className="ps-container">
            <div className="ps-section-head center">
              <div className="ps-eyebrow">Clinic film</div>
              <h2 className="ps-display">{String(heroVideo.title || "Welcome to our clinic")}</h2>
            </div>
            <div className="ps-hero-video">
              <div style={{ aspectRatio: "16/9", background: "#0F172A" }}>
                <iframe
                  src={
                    heroVideo.is_youtube && heroVideo.youtube_id
                      ? `https://www.youtube.com/embed/${heroVideo.youtube_id}`
                      : String(heroVideo.video_url || "")
                  }
                  title={String(heroVideo.title || "Clinic video")}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: 0 }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      <section className="ps-section ps-section-soft" id="services">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-eyebrow">What we do</div>
            <h2 className="ps-display">A complete dental home, without the upsell.</h2>
          </div>
          {services.length > 0 ? (
            <div className="ps-service-grid">
              {services.slice(0, 6).map((service) => {
                const s = service as Record<string, string | number>;
                return (
                  <a key={String(s.id)} href="#book" className="ps-service-item">
                    <div style={{ fontSize: "1.75rem" }}>{s.icon_emoji || "🦷"}</div>
                    <h3>{s.name}</h3>
                    <p>{s.short_description || s.full_description || "Patient care service."}</p>
                    <div className="ps-service-meta">
                      <span>{s.duration || "Flexible"}</span>
                      {s.price_starting_from ? (
                        <span>From ₹{Number(s.price_starting_from).toLocaleString("en-IN")}</span>
                      ) : null}
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <EmptyNote text="Services will appear here once published from Website Manager." />
          )}
        </div>
      </section>

      {/* Philosophy */}
      <section className="ps-section ps-section-dark">
        <div className="ps-container ps-philosophy-grid">
          <div className="ps-philosophy-image">
            <img src={ASSETS.operatory} alt="Treatment room" loading="lazy" />
          </div>
          <div>
            <div className="ps-eyebrow">Our philosophy</div>
            <h2 className="ps-display" style={{ marginTop: "1rem", fontSize: "clamp(2rem, 4vw, 3rem)" }}>
              Dentistry should feel like a conversation, not a transaction.
            </h2>
            <p className="ps-muted" style={{ marginTop: "1.25rem", maxWidth: "32rem", lineHeight: 1.75 }}>
              We show you what we see. We talk through every option, including doing nothing.
              Estimates are itemised before treatment begins.
            </p>
            <div className="ps-philosophy-points">
              {PHILOSOPHY.map((item) => (
                <div key={item.title}>
                  <h4>{item.title}</h4>
                  <p className="ps-muted" style={{ marginTop: "0.35rem", fontSize: "0.875rem", lineHeight: 1.65 }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Doctors */}
      <section className="ps-section" id="doctors">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-eyebrow">The team</div>
            <h2 className="ps-display">People you&apos;ll come to trust.</h2>
          </div>
          {doctors.length > 0 ? (
            <div className="ps-doctor-grid">
              {doctors.map((doctor, index) => {
                const d = doctor as Record<string, unknown>;
                const photo = String(d.photo_url || (index % 2 === 0 ? ASSETS.doctorA : ASSETS.doctorB));
                const name = String(d.display_name || d.name || "Doctor");
                return (
                  <article key={String(d.id)} className="ps-doctor-card">
                    <div className="ps-doctor-photo">
                      <img src={photo} alt={name} loading="lazy" />
                    </div>
                    <h3>{name}</h3>
                    <div className="ps-doctor-role">{String(d.designation || d.qualification || "Dentist")}</div>
                    <p style={{ marginTop: "0.65rem", color: "var(--ps-muted)", lineHeight: 1.65, fontSize: "0.9rem" }}>
                      {String(d.bio || "Clinical profile published from admin.")}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyNote text="Doctor profiles will appear once added in Website Manager." />
          )}
        </div>
      </section>

      {/* Gallery — before/after & clinic photos */}
      <section className="ps-section" id="gallery">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-eyebrow">Gallery</div>
            <h2 className="ps-display">Clinic space, team, and treatment results.</h2>
            {beforeAfter.length > 0 && (
              <p className="ps-section-sub">
                {beforeAfter.length} before/after result{beforeAfter.length > 1 ? "s" : ""} published with patient consent.
              </p>
            )}
          </div>
          <div className="ps-gallery-tabs">
            {GALLERY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`ps-map-tab${galleryTab === tab.id ? " active" : ""}`}
                onClick={() => setGalleryTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {filteredGallery.length > 0 ? (
            <div className="ps-gallery-grid">
              {filteredGallery.slice(0, 12).map((item, index) => {
                const g = item as Record<string, string>;
                const isBa = g.category === "before_after";
                return (
                  <figure
                    key={`${g.image_url}-${index}`}
                    className={`ps-gallery-item${isBa ? " featured" : ""}`}
                  >
                    <img src={g.image_url} alt={g.title || g.caption || "Clinic photo"} loading="lazy" />
                    {(g.title || g.caption) && (
                      <figcaption className="ps-gallery-cap">{g.title || g.caption}</figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          ) : (
            <div className="ps-gallery-grid">
              {[ASSETS.operatory, ASSETS.hero, ASSETS.smile].map((src, index) => (
                <figure key={src} className="ps-gallery-item">
                  <img src={src} alt={`Clinic preview ${index + 1}`} loading="lazy" />
                  <figcaption className="ps-gallery-cap">Upload photos in Gallery Manager to replace placeholders.</figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tour videos */}
      {tourVideos.length > 0 && (
        <section className="ps-section ps-section-soft" id="tour">
          <div className="ps-container">
            <div className="ps-section-head center">
              <div className="ps-eyebrow">Clinic tour</div>
              <h2 className="ps-display">A quick look inside.</h2>
            </div>
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {tourVideos.slice(0, 2).map((video) => {
                const v = video as Record<string, string | boolean>;
                const embedded =
                  v.is_youtube && v.youtube_id
                    ? `https://www.youtube.com/embed/${v.youtube_id}`
                    : String(v.video_url || "");
                if (!embedded) return null;
                return (
                  <article key={String(v.id)} className="ps-card" style={{ overflow: "hidden", padding: 0 }}>
                    <div style={{ aspectRatio: "16/9", background: "#0F172A" }}>
                      <iframe
                        src={embedded}
                        title={String(v.title || "Clinic video")}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ width: "100%", height: "100%", border: 0 }}
                      />
                    </div>
                    <div style={{ padding: "1.1rem" }}>
                      <h3 className="ps-display" style={{ fontSize: "1.2rem" }}>{String(v.title || "Clinic video")}</h3>
                      <p style={{ marginTop: "0.35rem", color: "var(--ps-muted)", fontSize: "0.875rem" }}>
                        {String(v.caption || "Watch a short look inside the clinic.")}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="ps-section ps-section-soft" id="reviews">
        <div className="ps-container ps-testimonial-grid">
          <div>
            <div className="ps-eyebrow">In their words</div>
            <h2 className="ps-display" style={{ marginTop: "0.75rem", fontSize: "clamp(2rem, 4vw, 3rem)" }}>
              Quiet praise from quiet people.
            </h2>
            <div className="ps-testimonial-side" style={{ marginTop: "2rem" }}>
              <img src={ASSETS.smile} alt="" loading="lazy" />
            </div>
          </div>
          {currentTestimonial ? (
            <figure className="ps-card ps-quote-card">
              <blockquote>
                &ldquo;{currentTestimonial.text || "Wonderful care and a smooth experience."}&rdquo;
              </blockquote>
              <figcaption>
                <strong>{currentTestimonial.patient_name || "Patient"}</strong>
                {currentTestimonial.treatment_type ? ` · ${currentTestimonial.treatment_type}` : ""}
              </figcaption>
              {testimonials.length > 1 && (
                <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                  <button type="button" className="ps-map-tab" onClick={() => setTestimonialIndex((i) => (i - 1 + testimonials.length) % testimonials.length)}>‹</button>
                  <button type="button" className="ps-map-tab active" onClick={() => setTestimonialIndex((i) => (i + 1) % testimonials.length)}>›</button>
                </div>
              )}
            </figure>
          ) : (
            <EmptyNote text="Testimonials appear once added from Website Manager." />
          )}
        </div>
      </section>

      {/* Booking */}
      <section className="ps-section" id="book">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-eyebrow">Book</div>
            <h2 className="ps-display">Hold a chair for you.</h2>
            <p className="ps-section-sub">
              Share a few details and we&apos;ll call to confirm. WhatsApp remains a friendly fallback.
            </p>
          </div>
          <div className="ps-book-grid">
            <form
              className="ps-card ps-form"
              onSubmit={(event) => {
                event.preventDefault();
                submitBookingRequest();
              }}
            >
              <FormField label="Your name" value={form.name} onChange={(v) => setForm((c) => ({ ...c, name: v }))} required />
              <FormField label="Phone" value={form.phone} onChange={(v) => setForm((c) => ({ ...c, phone: v }))} type="tel" required />
              <FormField label="Preferred date" value={form.preferredDate} onChange={(v) => setForm((c) => ({ ...c, preferredDate: v }))} type="date" />
              <FormField
                label="Service"
                value={form.service}
                onChange={(v) => setForm((c) => ({ ...c, service: v }))}
                placeholder="Cleaning, RCT, smile design…"
              />
              <FormField
                label="Anything we should know?"
                value={form.message}
                onChange={(v) => setForm((c) => ({ ...c, message: v }))}
                multiline
                placeholder="Nervous about needles, prefer morning slots, etc."
              />
              {bookingState === "success" && (
                <div className="ps-success">
                  <strong>Request received.</strong> {bookingNote}
                </div>
              )}
              {bookingState === "error" && bookingNote && (
                <div style={{ color: "#B45309", fontSize: "0.875rem" }}>{bookingNote}</div>
              )}
              <button type="submit" className="ps-btn-primary" disabled={bookingState === "submitting"} style={{ height: "3rem", justifyContent: "center" }}>
                {bookingState === "submitting" ? "Sending…" : "Request appointment"}
              </button>
            </form>

            <aside>
              <div className="ps-card ps-aside-card">
                <div className="ps-eyebrow">First visit</div>
                <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: 1.65, color: "var(--ps-muted)" }}>
                  Photos, scans, and a written plan. No pressure to proceed on the same day.
                </p>
              </div>
              <div className="ps-card ps-aside-card">
                <div className="ps-eyebrow">What happens next</div>
                <ol style={{ marginTop: "0.75rem", paddingLeft: "1.1rem", color: "var(--ps-muted)", fontSize: "0.875rem", lineHeight: 1.7 }}>
                  {JOURNEY.map((step) => (
                    <li key={step.title} style={{ marginBottom: "0.35rem" }}>{step.title}</li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Map + 3D Street View */}
      <section className="ps-section ps-section-soft" id="map">
        <div className="ps-container">
          <div className="ps-section-head">
            <div className="ps-eyebrow">Visit us</div>
            <h2 className="ps-display">Maps & 3D Street View.</h2>
            <p className="ps-section-sub">
              Toggle between the clinic map and immersive Street View — configured per branch in Website Manager.
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
                <p style={{ fontSize: "0.8rem", color: "var(--ps-muted)", marginBottom: "0.65rem" }}>
                  Add a Street View embed URL in Website Manager → Clinics for the full 3D experience.
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
            <div className="ps-card" style={{ overflow: "hidden", padding: 0 }}>
              <img
                src={activeClinic.hero_image_url || ASSETS.hero}
                alt={activeClinic.short_name || "Clinic exterior"}
                style={{ width: "100%", height: 220, objectFit: "cover" }}
              />
              <div style={{ padding: "1.25rem" }}>
                <h3 className="ps-display" style={{ fontSize: "1.25rem" }}>
                  {activeClinic.short_name || activeClinic.name || siteTitle}
                </h3>
                <p style={{ marginTop: "0.5rem", color: "var(--ps-muted)", lineHeight: 1.65 }}>{activeAddress}</p>
                {(activeClinic.public_phone || activeClinic.phone || phone) && (
                  <p style={{ marginTop: "0.5rem", fontWeight: 700 }}>
                    {activeClinic.public_phone || activeClinic.phone || phone}
                  </p>
                )}
                {activeClinic.tagline && (
                  <p style={{ marginTop: "0.65rem", fontSize: "0.875rem", color: "var(--ps-teal)", fontStyle: "italic" }}>
                    {activeClinic.tagline}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-card ps-cta-inner">
            <div className="ps-cta-main">
              <div className="ps-eyebrow">Ready when you are</div>
              <h2 className="ps-display" style={{ marginTop: "1rem", fontSize: "clamp(2rem, 4vw, 2.75rem)" }}>Book a first visit.</h2>
              <p style={{ marginTop: "1rem", color: "var(--ps-muted)", lineHeight: 1.7, maxWidth: "28rem" }}>
                A calm consultation with photos, scans, and a written plan — no pressure to proceed.
              </p>
              <div style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <a href="#book" className="ps-btn-primary ps-btn-clay">Book online →</a>
                {phone && <a href={`tel:${phone.replace(/\s/g, "")}`} className="ps-btn-ghost">Call {phone}</a>}
              </div>
            </div>
            <div className="ps-cta-side">
              <div className="ps-eyebrow">Also available</div>
              <ul style={{ marginTop: "1rem", listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
                <li><a href="/public/consult" className="ps-nav-link" style={{ paddingLeft: 0 }}>₹100 phone consultation</a></li>
                <li><a href="/public/smile" className="ps-nav-link" style={{ paddingLeft: 0 }}>AR smile preview</a></li>
                {whatsapp && (
                  <li>
                    {phone ? (
                      <ClickToChatLink phone={phone} compact label="WhatsApp the clinic" />
                    ) : (
                      <a href={whatsapp} target="_blank" rel="noreferrer" className="ps-nav-link" style={{ paddingLeft: 0 }}>WhatsApp</a>
                    )}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="ps-section ps-section-soft" id="contact">
        <div className="ps-container" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <div className="ps-card" style={{ padding: "1.5rem" }}>
            <div className="ps-eyebrow">Clinic</div>
            <p style={{ marginTop: "0.75rem", lineHeight: 1.7 }}>{officeAddress}</p>
            {directionsUrl && (
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="ps-btn-ghost" style={{ marginTop: "1rem" }}>
                Get directions
              </a>
            )}
          </div>
          <div className="ps-card" style={{ padding: "1.5rem" }}>
            <div className="ps-eyebrow">Connect</div>
            <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
              {phone && <a href={`tel:${phone.replace(/\s/g, "")}`} className="ps-nav-link" style={{ paddingLeft: 0 }}>Call now</a>}
              {whatsapp && phone && <ClickToChatLink phone={phone} label="WhatsApp the clinic" />}
            </div>
          </div>
        </div>
      </section>

      <footer className="ps-footer">
        <div className="ps-container ps-footer-grid">
          <div>
            <div className="ps-brand-name" style={{ fontSize: "1.5rem" }}>{siteTitle}</div>
            <p style={{ marginTop: "0.75rem", color: "var(--ps-muted)", lineHeight: 1.65, maxWidth: "24rem" }}>{tagline}</p>
            <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>{officeAddress}</p>
          </div>
          <div>
            <div className="ps-eyebrow">Explore</div>
            <ul style={{ marginTop: "1rem", listStyle: "none", padding: 0, display: "grid", gap: "0.4rem", fontSize: "0.875rem" }}>
              <li><a href="#smile-studio" className="ps-nav-link" style={{ paddingLeft: 0 }}>Smile Studio</a></li>
              <li><a href="#gallery" className="ps-nav-link" style={{ paddingLeft: 0 }}>Gallery</a></li>
              <li><a href="#map" className="ps-nav-link" style={{ paddingLeft: 0 }}>3D Maps</a></li>
              <li><a href="#services" className="ps-nav-link" style={{ paddingLeft: 0 }}>Services</a></li>
              <li><a href="#doctors" className="ps-nav-link" style={{ paddingLeft: 0 }}>Doctors</a></li>
            </ul>
          </div>
          <div>
            <div className="ps-eyebrow">Patient tools</div>
            <ul style={{ marginTop: "1rem", listStyle: "none", padding: 0, display: "grid", gap: "0.4rem", fontSize: "0.875rem" }}>
              <li><a href="#book" className="ps-nav-link" style={{ paddingLeft: 0 }}>Book online</a></li>
              <li><a href="/public/consult" className="ps-nav-link" style={{ paddingLeft: 0 }}>Phone consult</a></li>
              <li><a href="/public/rating" className="ps-nav-link" style={{ paddingLeft: 0 }}>Leave a review</a></li>
            </ul>
          </div>
        </div>
        <div className="ps-container ps-footer-bottom">
          <span>© {new Date().getFullYear()} {siteTitle}. All rights reserved.</span>
          <span>Clinical Calm · Siya Dental Care</span>
        </div>
      </footer>

      {(phone || whatsapp) && (
        <a
          href={whatsapp || buildWhatsAppLink(phone, "Hi, I would like to book an appointment.")}
          target="_blank"
          rel="noreferrer"
          className="ps-fab-wa"
        >
          💬 WhatsApp
        </a>
      )}
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
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
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
            required={required}
          />
        )}
      </label>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="ps-card" style={{ padding: "1.5rem", textAlign: "center", color: "var(--ps-muted)" }}>
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