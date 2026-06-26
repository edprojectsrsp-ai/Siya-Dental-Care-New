"use client";
/**
 * components/SiteCMSEditor.tsx — Bundle V (Sprint T+6)
 *
 * Page-section editor backed by clinic_pages + clinic_page_sections.
 * 10 section types (hero, slideshow, video, services, doctor, testimonials,
 * cta, map, rich text, image grid), each with inline form.
 *
 * Goes into SettingsHub as the "Website" tab.
 */

import { useEffect, useState, useCallback } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const BG_SOFT = "#F8FAFC";

const SECTION_TYPES = [
  { key: "hero",         label: "Hero banner",  icon: "🎯" },
  { key: "slideshow",    label: "Slideshow",    icon: "🎞" },
  { key: "video_embed",  label: "Video",        icon: "📹" },
  { key: "service_grid", label: "Service grid", icon: "⚕️" },
  { key: "doctor_card",  label: "Doctor card",  icon: "👨‍⚕️" },
  { key: "testimonial",  label: "Testimonials", icon: "💬" },
  { key: "cta_block",    label: "Call-to-action", icon: "📢" },
  { key: "map",          label: "Map",          icon: "🗺" },
  { key: "rich_text",    label: "Text block",   icon: "📝" },
  { key: "image_grid",   label: "Image grid",   icon: "🖼" },
];

export default function SiteCMSEditor({
  clinicId, accent = A, show,
}: { clinicId: string; accent?: string; show: (m: string) => void }) {
  const [pages, setPages] = useState<any[]>([]);
  const [slug, setSlug] = useState("home");
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const loadPages = useCallback(async () => {
    try {
      const d = await api.cmsPagesList(clinicId);
      setPages(d?.pages || []);
    } catch (e: any) { show("Pages load failed: " + e.message); }
  }, [clinicId, show]);

  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.cmsPageGet(clinicId, slug);
      setSections(d?.sections || []);
    } catch (e: any) {
      show("Sections load failed: " + e.message);
      setSections([]);
    } finally { setLoading(false); }
  }, [clinicId, slug, show]);

  useEffect(() => { loadPages(); }, [loadPages]);
  useEffect(() => { loadSections(); }, [loadSections]);

  const updateSection = async (s: any, content: any) => {
    try {
      await api.cmsSectionUpdate(s.id, { content });
      setSections(prev => prev.map(x => x.id === s.id ? { ...x, content } : x));
      show("✓ Section saved");
    } catch (e: any) { show("Update failed: " + e.message); }
  };

  const toggleVisible = async (s: any) => {
    try {
      await api.cmsSectionUpdate(s.id, { content: s.content, is_visible: !s.is_visible });
      setSections(prev => prev.map(x => x.id === s.id ? { ...x, is_visible: !s.is_visible } : x));
    } catch (e: any) { show("Toggle failed: " + e.message); }
  };

  const move = async (s: any, dir: -1 | 1) => {
    const idx = sections.findIndex(x => x.id === s.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const other = sections[newIdx];
    try {
      await Promise.all([
        api.cmsSectionUpdate(s.id, { content: s.content, display_order: other.display_order }),
        api.cmsSectionUpdate(other.id, { content: other.content, display_order: s.display_order }),
      ]);
      loadSections();
    } catch (e: any) { show("Reorder failed: " + e.message); }
  };

  const removeSection = async (s: any) => {
    if (!confirm("Remove this section?")) return;
    try {
      await api.cmsSectionDelete(s.id);
      setSections(prev => prev.filter(x => x.id !== s.id));
      show("Removed");
    } catch (e: any) { show("Delete failed: " + e.message); }
  };

  const addSection = async (type: string) => {
    const page = pages.find(p => p.slug === slug);
    if (!page) return;
    try {
      await api.cmsSectionCreate({
        page_id: page.id, section_type: type,
        content: defaultContent(type),
        display_order: sections.length + 1,
      });
      setAdding(false);
      loadSections();
    } catch (e: any) { show("Add failed: " + e.message); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: INK }}>🌐 Public website</h3>
        <a href={`/site/${clinicId}`} target="_blank" rel="noreferrer" style={{
          padding: "6px 12px", borderRadius: 8, border: `1px solid ${accent}`,
          background: "#fff", color: accent, fontSize: 12, fontWeight: 700, textDecoration: "none",
        }}>👁 Preview live ↗</a>
      </div>

      {/* Page tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {pages.map(p => (
          <button key={p.slug} onClick={() => setSlug(p.slug)} style={{
            border: slug === p.slug ? `2px solid ${accent}` : `1px solid ${LINE}`,
            background: slug === p.slug ? `${accent}14` : "#fff",
            color: slug === p.slug ? accent : MUTE, padding: "8px 14px", borderRadius: 8,
            fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            textTransform: "capitalize",
          }}>{p.slug}</button>
        ))}
      </div>

      {loading ? <div style={{ padding: 30, color: MUTE, textAlign: "center" }}>Loading…</div> :
       sections.length === 0 ? (
        <div style={{
          padding: 30, textAlign: "center", color: MUTE,
          border: `2px dashed ${LINE}`, borderRadius: 12,
        }}>
          No sections yet on this page. Use <b>+ Add section</b> below.
        </div>
       ) :
       sections.map((s, i) => (
        <SectionEditor key={s.id} section={s} accent={accent}
          onUpdate={c => updateSection(s, c)}
          onToggle={() => toggleVisible(s)}
          onRemove={() => removeSection(s)}
          onMoveUp={i > 0 ? () => move(s, -1) : undefined}
          onMoveDown={i < sections.length - 1 ? () => move(s, 1) : undefined}
        />
      ))}

      {!adding ? (
        <button onClick={() => setAdding(true)} style={{
          marginTop: 12, padding: "12px 16px", border: `2px dashed ${accent}`,
          background: "#fff", color: accent, borderRadius: 12, width: "100%",
          fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
        }}>+ Add section</button>
      ) : (
        <div style={{
          padding: 14, borderRadius: 12, background: BG_SOFT, marginTop: 12,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: INK, marginBottom: 8 }}>Pick a section type</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
            {SECTION_TYPES.map(t => (
              <button key={t.key} onClick={() => addSection(t.key)} style={{
                padding: 10, borderRadius: 8, border: `1px solid ${LINE}`,
                background: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "center",
              }}>
                <div style={{ fontSize: 22 }}>{t.icon}</div>
                <div style={{ fontSize: 11, color: INK, marginTop: 4 }}>{t.label}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setAdding(false)} style={{
            marginTop: 8, padding: "5px 12px", border: `1px solid ${LINE}`,
            background: "#fff", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: MUTE,
          }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Section editor with collapsible body
// ────────────────────────────────────────────────────────────

function SectionEditor({
  section, accent, onUpdate, onToggle, onRemove, onMoveUp, onMoveDown,
}: any) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(section.content || {});
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setDraft(section.content || {}); setDirty(false); }, [section.id, section.content]);

  const meta = SECTION_TYPES.find(t => t.key === section.section_type) || { icon: "•", label: section.section_type };
  const update = (k: string, v: any) => { setDraft((p: any) => ({ ...p, [k]: v })); setDirty(true); };

  return (
    <div style={{
      marginBottom: 8, borderRadius: 12, border: `1px solid ${LINE}`,
      background: section.is_visible ? "#fff" : BG_SOFT,
      opacity: section.is_visible ? 1 : 0.7, overflow: "hidden",
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{
        padding: "12px 14px", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{meta.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{meta.label}</div>
            <div style={{ fontSize: 11, color: MUTE }}>{summarize(section)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={e => e.stopPropagation()}>
          {onMoveUp && <IconBtn onClick={onMoveUp} title="Move up">↑</IconBtn>}
          {onMoveDown && <IconBtn onClick={onMoveDown} title="Move down">↓</IconBtn>}
          <button onClick={onToggle} style={{
            padding: "4px 10px", borderRadius: 6, border: `1px solid ${LINE}`,
            background: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            color: section.is_visible ? "#065F46" : MUTE,
          }}>{section.is_visible ? "👁 Visible" : "🚫 Hidden"}</button>
          <button onClick={onRemove} style={{
            padding: "4px 10px", borderRadius: 6, border: "1px solid #FCA5A5",
            background: "#fff", color: "#9F1239", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
          }}>✕</button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 14, borderTop: `1px solid ${LINE}`, background: BG_SOFT }}>
          {renderEditor(section.section_type, draft, update)}
          {dirty && (
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button onClick={() => { onUpdate(draft); setDirty(false); }} style={{
                padding: "8px 14px", border: "none", background: accent, color: "#fff",
                borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>✓ Save section</button>
              <button onClick={() => { setDraft(section.content || {}); setDirty(false); }} style={{
                padding: "8px 12px", border: `1px solid ${LINE}`,
                background: "#fff", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: MUTE,
              }}>Revert</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title }: any) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 28, height: 28, borderRadius: 6, border: `1px solid ${LINE}`,
      background: "#fff", cursor: "pointer", fontFamily: "inherit", color: MUTE, fontSize: 14,
    }}>{children}</button>
  );
}

function summarize(s: any): string {
  const c = s.content || {};
  switch (s.section_type) {
    case "hero":         return c.headline || "(no headline)";
    case "slideshow":    return `${(c.slides || []).length} slides`;
    case "video_embed":  return c.url || "(no URL)";
    case "service_grid": return `${(c.services || []).length} services`;
    case "doctor_card":  return c.name || "(no name)";
    case "testimonial":  return `${(c.items || []).length} testimonials`;
    case "cta_block":    return c.headline || "(no headline)";
    case "map":          return c.address || "(no address)";
    case "rich_text":    return (c.text || "").slice(0, 60);
    case "image_grid":   return `${(c.images || []).length} images`;
  }
  return "";
}

function defaultContent(type: string): any {
  switch (type) {
    case "hero":         return { headline: "Welcome", subheadline: "", cta_text: "Book", cta_link: "#", background_image: "" };
    case "slideshow":    return { slides: [], autoplay: true, interval: 5000 };
    case "video_embed":  return { url: "", caption: "" };
    case "service_grid": return { title: "Services", services: [{ name: "", icon: "🦷", desc: "" }] };
    case "doctor_card":  return { name: "", credentials: "", bio: "", image: "" };
    case "testimonial":  return { title: "Testimonials", items: [{ name: "", text: "", rating: 5 }] };
    case "cta_block":    return { headline: "", subheadline: "", cta_text: "", cta_link: "" };
    case "map":          return { address: "", embed_url: "" };
    case "rich_text":    return { text: "" };
    case "image_grid":   return { images: [] };
  }
  return {};
}

// ────────────────────────────────────────────────────────────
// Per-type editors
// ────────────────────────────────────────────────────────────

function renderEditor(type: string, draft: any, update: (k: string, v: any) => void) {
  switch (type) {
    case "hero":         return <HeroEditor draft={draft} update={update} />;
    case "slideshow":    return <SlideshowEditor draft={draft} update={update} />;
    case "video_embed":  return <VideoEditor draft={draft} update={update} />;
    case "service_grid": return <ServiceGridEditor draft={draft} update={update} />;
    case "doctor_card":  return <DoctorCardEditor draft={draft} update={update} />;
    case "testimonial":  return <TestimonialEditor draft={draft} update={update} />;
    case "cta_block":    return <CtaEditor draft={draft} update={update} />;
    case "map":          return <MapEditor draft={draft} update={update} />;
    case "rich_text":    return <RichTextEditor draft={draft} update={update} />;
    case "image_grid":   return <ImageGridEditor draft={draft} update={update} />;
  }
  return <div>No editor for {type}</div>;
}

function HeroEditor({ draft, update }: any) {
  return (
    <>
      <Field label="Headline"><Input v={draft.headline} on={v => update("headline", v)} /></Field>
      <Field label="Subheadline"><Input v={draft.subheadline} on={v => update("subheadline", v)} /></Field>
      <Field label="CTA text"><Input v={draft.cta_text} on={v => update("cta_text", v)} /></Field>
      <Field label="CTA link"><Input v={draft.cta_link} on={v => update("cta_link", v)} /></Field>
      <ImageField label="Background image" v={draft.background_image} on={v => update("background_image", v)} />
    </>
  );
}

function SlideshowEditor({ draft, update }: any) {
  const slides = draft.slides || [];
  return (
    <>
      <div style={miniLabel}>Slides ({slides.length})</div>
      {slides.map((s: any, i: number) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
          {s.url && <img src={s.url.startsWith("/") ? s.url : s.url} alt=""
                         style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, border: `1px solid ${LINE}` }} />}
          <Input v={s.url || ""} on={v => {
            const next = [...slides]; next[i] = { ...s, url: v }; update("slides", next);
          }} placeholder="Image URL or upload below" />
          <RemoveBtn onClick={() => update("slides", slides.filter((_: any, x: number) => x !== i))} />
        </div>
      ))}
      <ImageField label="Add slide" v="" on={v => update("slides", [...slides, { url: v }])} />
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: INK, marginTop: 8 }}>
        <input type="checkbox" checked={draft.autoplay !== false} onChange={e => update("autoplay", e.target.checked)} />
        Autoplay
      </label>
    </>
  );
}

function VideoEditor({ draft, update }: any) {
  return (
    <>
      <Field label="Video URL (YouTube/Vimeo embed)">
        <Input v={draft.url} on={v => update("url", v)} placeholder="https://www.youtube.com/embed/abc123" />
      </Field>
      <Field label="Caption"><Input v={draft.caption} on={v => update("caption", v)} /></Field>
    </>
  );
}

function ServiceGridEditor({ draft, update }: any) {
  const services = draft.services || [];
  return (
    <>
      <Field label="Title"><Input v={draft.title} on={v => update("title", v)} /></Field>
      <div style={miniLabel}>Services</div>
      {services.map((svc: any, i: number) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 2fr auto", gap: 6, marginBottom: 6 }}>
          <Input v={svc.icon} on={v => { const n = [...services]; n[i] = { ...svc, icon: v }; update("services", n); }} placeholder="🦷" />
          <Input v={svc.name} on={v => { const n = [...services]; n[i] = { ...svc, name: v }; update("services", n); }} placeholder="Name" />
          <Input v={svc.desc} on={v => { const n = [...services]; n[i] = { ...svc, desc: v }; update("services", n); }} placeholder="Description" />
          <RemoveBtn onClick={() => update("services", services.filter((_: any, x: number) => x !== i))} />
        </div>
      ))}
      <AddBtn onClick={() => update("services", [...services, { icon: "🦷", name: "", desc: "" }])}>+ Add service</AddBtn>
    </>
  );
}

function DoctorCardEditor({ draft, update }: any) {
  return (
    <>
      <Field label="Name"><Input v={draft.name} on={v => update("name", v)} /></Field>
      <Field label="Credentials"><Input v={draft.credentials} on={v => update("credentials", v)} /></Field>
      <Field label="Bio">
        <textarea value={draft.bio || ""} onChange={e => update("bio", e.target.value)}
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical", fontFamily: "inherit" }} />
      </Field>
      <ImageField label="Photo" v={draft.image} on={v => update("image", v)} />
    </>
  );
}

function TestimonialEditor({ draft, update }: any) {
  const items = draft.items || [];
  return (
    <>
      <Field label="Title"><Input v={draft.title} on={v => update("title", v)} /></Field>
      {items.map((t: any, i: number) => (
        <div key={i} style={{ padding: 8, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, marginBottom: 6 }}>
          <Input v={t.name} on={v => { const n = [...items]; n[i] = { ...t, name: v }; update("items", n); }} placeholder="Patient name" />
          <textarea value={t.text || ""}
                    onChange={e => { const n = [...items]; n[i] = { ...t, text: e.target.value }; update("items", n); }}
                    style={{ ...inputStyle, minHeight: 60, marginTop: 4, fontFamily: "inherit" }}
                    placeholder="Testimonial text" />
          <RemoveBtn onClick={() => update("items", items.filter((_: any, x: number) => x !== i))} />
        </div>
      ))}
      <AddBtn onClick={() => update("items", [...items, { name: "", text: "", rating: 5 }])}>+ Add testimonial</AddBtn>
    </>
  );
}

function CtaEditor({ draft, update }: any) {
  return (
    <>
      <Field label="Headline"><Input v={draft.headline} on={v => update("headline", v)} /></Field>
      <Field label="Subheadline"><Input v={draft.subheadline} on={v => update("subheadline", v)} /></Field>
      <Field label="Button text"><Input v={draft.cta_text} on={v => update("cta_text", v)} /></Field>
      <Field label="Button link"><Input v={draft.cta_link} on={v => update("cta_link", v)} /></Field>
    </>
  );
}

function MapEditor({ draft, update }: any) {
  return (
    <>
      <Field label="Address"><Input v={draft.address} on={v => update("address", v)} /></Field>
      <Field label="Google Maps embed URL">
        <Input v={draft.embed_url} on={v => update("embed_url", v)} placeholder="https://www.google.com/maps/embed?…" />
      </Field>
    </>
  );
}

function RichTextEditor({ draft, update }: any) {
  return (
    <Field label="Content (HTML supported)">
      <textarea value={draft.text || ""} onChange={e => update("text", e.target.value)}
                style={{ ...inputStyle, minHeight: 120, resize: "vertical", fontFamily: "inherit" }} />
    </Field>
  );
}

function ImageGridEditor({ draft, update }: any) {
  const images = draft.images || [];
  return (
    <>
      <div style={miniLabel}>Images ({images.length})</div>
      {images.map((url: string, i: number) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
          {url && <img src={url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }} />}
          <Input v={url} on={v => { const n = [...images]; n[i] = v; update("images", n); }} />
          <RemoveBtn onClick={() => update("images", images.filter((_: any, x: number) => x !== i))} />
        </div>
      ))}
      <ImageField label="Add image" v="" on={v => update("images", [...images, v])} />
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Building blocks
// ────────────────────────────────────────────────────────────

function Input({ v, on, placeholder, type }: any) {
  return <input type={type || "text"} value={v || ""} onChange={e => on(e.target.value)}
                 placeholder={placeholder} style={inputStyle} />;
}

function Field({ label, children }: any) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={miniLabel}>{label}</div>
      {children}
    </div>
  );
}

function ImageField({ label, v, on }: any) {
  const [uploading, setUploading] = useState(false);
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const d = await api.cmsUploadImage(ev.target?.result as string);
        on(d.url);
      } catch (err) { alert("Upload failed"); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(f);
  };
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={miniLabel}>{label}</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {v && <img src={v.startsWith("/") ? v : v} alt=""
                   style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, border: `1px solid ${LINE}` }} />}
        <Input v={v} on={(x: string) => on(x)} placeholder="URL or upload" />
        <label style={{
          padding: "7px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${A}`,
          background: "#fff", color: A, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
        }}>
          {uploading ? "…" : "📤 Upload"}
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={upload} />
        </label>
      </div>
    </div>
  );
}

function RemoveBtn({ onClick }: any) {
  return <button onClick={onClick} style={{
    padding: "4px 10px", borderRadius: 6, border: "1px solid #FCA5A5",
    background: "#fff", color: "#9F1239", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  }}>✕</button>;
}

function AddBtn({ children, onClick }: any) {
  return <button onClick={onClick} style={{
    padding: "5px 12px", borderRadius: 6, border: `1px dashed ${A}`,
    background: "#fff", color: A, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  }}>{children}</button>;
}

const miniLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: MUTE, textTransform: "uppercase",
  letterSpacing: 0.4, marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: `1px solid ${LINE}`, fontSize: 12, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit", background: "#fff",
};
