"use client";
/**
 * components/PublicSitePage.tsx — Bundle V (Sprint T+6)
 *
 * Renders the public clinic website from clinic_pages + clinic_page_sections.
 * No auth — uses /api/cms/pages/{slug}?clinic_id=...
 *
 * Used by route: app/site/[clinicId]/[[...slug]]/page.tsx
 */

import { useEffect, useState } from "react";
import PublicMarketingSite from "@/components/PublicMarketingSite";

const TEAL = "#0E7C7B";
const TEAL_DEEP = "#0A5C5B";
const INK = "#0F172A";
const MUTE = "#64748B";
const API_BASE = "";  // same origin

export default function PublicSitePage({ clinicId, slug = "home" }: { clinicId: string; slug?: string }) {
  const [pages, setPages] = useState<any[]>([]);
  const [page, setPage] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/cms/pages?clinic_id=${clinicId}`).then(r => r.json()).catch(() => ({ pages: [] })),
      fetch(`${API_BASE}/api/cms/pages/${slug}?clinic_id=${clinicId}`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/site-2026/content`).then(r => r.json()).catch(() => null),
    ]).then(([allPages, pageData, publicContent]) => {
      setPages(allPages?.pages || []);
      if (pageData) { setPage(pageData.page); setSections(pageData.sections || []); }
      setContent(publicContent);
    }).finally(() => setLoading(false));
  }, [clinicId, slug]);

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "'Outfit',system-ui,sans-serif", color: MUTE }}>
      Loading…
    </div>;
  }
  if (page && slug === "home" && sections.length === 0 && content) {
    return <PublicMarketingSite clinicId={clinicId} content={content} />;
  }
  if (!page) {
    if (slug === "home" && content) {
      return <PublicMarketingSite clinicId={clinicId} content={content} />;
    }
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "'Outfit',system-ui,sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>🦷</div>
        <h1 style={{ color: INK }}>Page not found</h1>
        <a href={`/site/${clinicId}`} style={{ color: TEAL }}>Back to home</a>
      </div>
    </div>;
  }

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Outfit',system-ui,sans-serif", color: INK, background: "#fff" }}>
      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "12px 24px",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto", display: "flex",
          justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
        }}>
          <a href={`/site/${clinicId}`} style={{ fontWeight: 900, fontSize: 18, color: TEAL_DEEP, textDecoration: "none" }}>
            🦷 Siya Dental
          </a>
          <div style={{ display: "flex", gap: 18 }}>
            {pages.map(p => (
              <a key={p.slug}
                 href={`/site/${clinicId}/${p.slug === "home" ? "" : p.slug}`}
                 style={{
                   fontSize: 13, color: slug === p.slug ? TEAL_DEEP : MUTE,
                   fontWeight: slug === p.slug ? 800 : 600, textDecoration: "none",
                   textTransform: "capitalize",
                 }}>
                {p.slug === "home" ? "Home" : p.slug}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Sections */}
      {sections.map(s => <SectionRenderer key={s.id} section={s} />)}

      {/* Footer */}
      <footer style={{ background: INK, color: "#CBD5E1", padding: "30px 20px", textAlign: "center", fontSize: 12, marginTop: 60 }}>
        © {new Date().getFullYear()} Siya Dental Care · Dr. Madhu Edward
      </footer>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Section renderers
// ────────────────────────────────────────────────────────────

function SectionRenderer({ section }: { section: any }) {
  const c = section.content || {};
  const bg = (url: string) => url?.startsWith("/") ? url : url;

  switch (section.section_type) {
    case "hero":
      return (
        <section style={{
          background: c.background_image
            ? `linear-gradient(rgba(10,92,91,.65), rgba(14,124,123,.65)), url(${bg(c.background_image)})`
            : `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`,
          backgroundSize: "cover", backgroundPosition: "center",
          color: "#fff", padding: "80px 24px", textAlign: "center",
        }}>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, maxWidth: 800, margin: "0 auto 16px" }}>
            {c.headline}
          </h1>
          {c.subheadline && (
            <p style={{ fontSize: "clamp(14px, 2vw, 18px)", opacity: 0.95, maxWidth: 600, margin: "0 auto 24px" }}>
              {c.subheadline}
            </p>
          )}
          {c.cta_text && (
            <a href={c.cta_link} style={{
              display: "inline-block", padding: "14px 32px", borderRadius: 10,
              background: "#fff", color: TEAL_DEEP,
              fontWeight: 800, textDecoration: "none", fontSize: 15,
            }}>{c.cta_text}</a>
          )}
        </section>
      );

    case "slideshow":
      return <Slideshow slides={c.slides || []} autoplay={c.autoplay !== false} interval={c.interval || 5000} />;

    case "video_embed":
      if (!c.url) return null;
      return (
        <Section>
          <div style={{
            position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden",
            borderRadius: 12, maxWidth: 900, margin: "0 auto",
          }}>
            <iframe src={c.url} title={c.caption || "Video"}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              allowFullScreen />
          </div>
          {c.caption && <p style={{ textAlign: "center", color: MUTE, marginTop: 12 }}>{c.caption}</p>}
        </Section>
      );

    case "service_grid":
      return (
        <Section>
          {c.title && <H2>{c.title}</H2>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {(c.services || []).map((svc: any, i: number) => (
              <div key={i} style={{
                padding: 22, borderRadius: 12, background: "#fff",
                border: "1px solid #E2E8F0", textAlign: "center",
              }}>
                <div style={{ fontSize: 36 }}>{svc.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: "10px 0 4px", color: INK }}>{svc.name}</h3>
                <p style={{ fontSize: 13, color: MUTE, margin: 0 }}>{svc.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      );

    case "doctor_card":
      return (
        <Section>
          <div style={{
            display: "grid", gridTemplateColumns: c.image ? "auto 1fr" : "1fr",
            gap: 30, maxWidth: 900, margin: "0 auto", alignItems: "center",
          }}>
            {c.image && (
              <img src={bg(c.image)} alt={c.name}
                   style={{ width: 170, height: 170, borderRadius: "50%", objectFit: "cover",
                            border: `4px solid ${TEAL}` }} />
            )}
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: INK }}>{c.name}</h2>
              <div style={{ fontSize: 14, color: TEAL_DEEP, fontWeight: 700, marginBottom: 10 }}>
                {c.credentials}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#475569" }}>{c.bio}</p>
            </div>
          </div>
        </Section>
      );

    case "testimonial":
      return (
        <section style={{ background: "#F8FAFC", padding: "60px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            {c.title && <H2>{c.title}</H2>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {(c.items || []).map((t: any, i: number) => (
                <div key={i} style={{
                  padding: 20, borderRadius: 12, background: "#fff",
                  border: "1px solid #E2E8F0",
                }}>
                  <div style={{ color: "#FCC419" }}>{"★".repeat(t.rating || 5)}</div>
                  <p style={{ fontStyle: "italic", color: "#475569", margin: "10px 0" }}>&ldquo;{t.text}&rdquo;</p>
                  <div style={{ fontWeight: 800, color: TEAL_DEEP }}>— {t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case "cta_block":
      return (
        <section style={{
          background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`,
          color: "#fff", padding: "60px 24px", textAlign: "center",
        }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 10px" }}>{c.headline}</h2>
          {c.subheadline && <p style={{ fontSize: 16, opacity: 0.95, marginBottom: 24 }}>{c.subheadline}</p>}
          {c.cta_text && (
            <a href={c.cta_link} style={{
              display: "inline-block", padding: "14px 32px", borderRadius: 10,
              background: "#fff", color: TEAL_DEEP, fontWeight: 800, textDecoration: "none", fontSize: 15,
            }}>{c.cta_text}</a>
          )}
        </section>
      );

    case "map":
      return (
        <Section>
          <h3 style={{ fontSize: 20, color: TEAL_DEEP, margin: "0 0 6px" }}>📍 Find us</h3>
          <p style={{ color: "#475569", margin: "0 0 16px" }}>{c.address}</p>
          {c.embed_url && (
            <iframe src={c.embed_url} title="Map" loading="lazy"
                    style={{ width: "100%", height: 400, border: 0, borderRadius: 12 }}
                    allowFullScreen />
          )}
        </Section>
      );

    case "rich_text":
      return (
        <Section>
          <div style={{ maxWidth: 800, margin: "0 auto", fontSize: 15, color: "#475569", lineHeight: 1.8 }}
               dangerouslySetInnerHTML={{ __html: c.text || "" }} />
        </Section>
      );

    case "image_grid":
      return (
        <Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {(c.images || []).map((url: string, i: number) => (
              <img key={i} src={bg(url)} alt=""
                   style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8 }} />
            ))}
          </div>
        </Section>
      );
  }
  return null;
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ padding: "60px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</div>
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 28, fontWeight: 900, color: TEAL_DEEP, textAlign: "center", marginBottom: 24 }}>{children}</h2>;
}

function Slideshow({ slides, autoplay, interval }: { slides: any[]; autoplay: boolean; interval: number }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const t = setInterval(() => setIdx(p => (p + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [autoplay, interval, slides.length]);

  if (slides.length === 0) return null;

  return (
    <Section>
      <div style={{ position: "relative", height: 400, borderRadius: 12, overflow: "hidden", background: "#0F172A" }}>
        {slides.map((s, i) => (
          <img key={i} src={s.url?.startsWith("/") ? s.url : s.url} alt=""
               style={{
                 position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
                 opacity: idx === i ? 1 : 0, transition: "opacity .5s ease",
               }} />
        ))}
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 6,
        }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{
              width: 10, height: 10, borderRadius: "50%", border: "none", cursor: "pointer",
              background: idx === i ? "#fff" : "rgba(255,255,255,0.5)",
            }} />
          ))}
        </div>
      </div>
    </Section>
  );
}
