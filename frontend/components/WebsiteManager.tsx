"use client";
// ╔══════════════════════════════════════════════════════════════════╗
// ║  WEBSITE MANAGER — admin UI for the public 2026 website.         ║
// ║  Sub-tabs: Theme · Clinics (Maps & Street View) · Services ·      ║
// ║  Doctors · Testimonials · Videos · Gallery (existing).            ║
// ║  Inline styles, no Tailwind, matches existing platform aesthetic. ║
// ╚══════════════════════════════════════════════════════════════════╝
import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import { getToken } from "@/lib/api";
import { GalleryManager } from "./GalleryManager";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";

const API = "/api/admin/website-mgr";

async function fetchJson(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.detail || `HTTP ${r.status}`);
  return r.status === 204 ? null : r.json();
}

export function WebsiteManager({ accent, show, clinics }: { accent: string; show: (m: string) => void; clinics: any[] }) {
  const A = accent;
  const [tab, setTab] = useState<"theme" | "clinics" | "services" | "doctors" | "testimonials" | "videos" | "gallery">("theme");

  // ── Live preview dock ──
  const [showPreview, setShowPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const refreshPreview = () => setPreviewKey(k => k + 1);

  const TABS = [
    ["theme", "🎨 Theme & Branding"],
    ["clinics", "📍 Clinics, Maps & 3D"],
    ["services", "🦷 Services"],
    ["doctors", "👨‍⚕️ Doctors"],
    ["testimonials", "⭐ Testimonials"],
    ["videos", "🎥 Videos"],
    ["gallery", "🖼 Gallery / Media"],
  ] as const;

  // Gallery is a wide grid — give it the full width (no side preview).
  const previewVisible = showPreview && tab !== "gallery";
  const paneWidth = device === "mobile" ? 390 : 460;

  const toolBtn = (active: boolean): CSSProperties => ({
    border: `1.5px solid ${active ? A : LINE}`, background: active ? A + "12" : "#fff",
    color: active ? A : "#475569", borderRadius: 10, padding: "8px 12px",
    fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
  });

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" as const }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: INK }}>🌐 Website Manager</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTE }}>
            Edit every part of your public website, upload images, then see it live in the preview — changes go to <a href="/" target="_blank" rel="noreferrer" style={{ color: A, fontWeight: 700 }}>/ </a> on save.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
          <button onClick={() => setShowPreview(v => !v)} style={toolBtn(showPreview)}>{showPreview ? "👁 Preview on" : "👁 Preview off"}</button>
          {previewVisible && <>
            <button onClick={refreshPreview} style={toolBtn(false)} title="Reload preview after saving">↻ Refresh</button>
            <button onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")} style={toolBtn(false)}>{device === "desktop" ? "💻 Desktop" : "📱 Mobile"}</button>
          </>}
          <a href="/" target="_blank" rel="noreferrer" style={{ ...toolBtn(false), textDecoration: "none" }}>↗ Open</a>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" as const, background: SOFT, borderRadius: 12, padding: 5 }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            style={{
              border: "none", borderRadius: 10, padding: "10px 16px",
              background: tab === id ? A : "transparent", color: tab === id ? "#fff" : MUTE,
              fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
              boxShadow: tab === id ? `0 4px 12px ${A}44` : "none", transition: "all .15s",
            }}>{label}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {tab === "theme" && <ThemeEditor A={A} show={show} />}
          {tab === "clinics" && <ClinicsEditor A={A} show={show} clinics={clinics} />}
          {tab === "services" && <ServicesEditor A={A} show={show} />}
          {tab === "doctors" && <DoctorsEditor A={A} show={show} />}
          {tab === "testimonials" && <TestimonialsEditor A={A} show={show} />}
          {tab === "videos" && <VideosEditor A={A} show={show} clinics={clinics} />}
          {tab === "gallery" && <GalleryManager accent={A} show={show} />}
        </div>

        {previewVisible && (
          <div style={{ width: paneWidth, flexShrink: 0, position: "sticky", top: 12 }}>
            <div style={{ background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${LINE}`, background: SOFT }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: INK }}>Live Preview · {device === "mobile" ? "📱 Mobile" : "💻 Desktop"}</span>
                <button onClick={refreshPreview} style={{ ...toolBtn(false), padding: "5px 10px" }}>↻</button>
              </div>
              <iframe key={previewKey} src="/public" title="Website preview"
                style={{ width: "100%", height: "72vh", border: "none", display: "block", background: "#fff" }} />
            </div>
            <p style={{ fontSize: 11.5, color: MUTE, margin: "8px 4px 0", lineHeight: 1.4 }}>
              💡 After saving an edit, press <b>↻</b> to reload the preview.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// THEME
// ════════════════════════════════════════════════════════════════════
function ThemeEditor({ A, show }: any) {
  const [theme, setTheme] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchJson("/theme").then(setTheme).catch(() => setTheme({})); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetchJson("/theme", { method: "PATCH", body: JSON.stringify(theme) });
      show("✓ Theme saved — refresh /public to see changes");
    } catch (e: any) { show("Error: " + e.message); } finally { setSaving(false); }
  };

  if (!theme) return <div style={{ padding: 30, color: MUTE }}>Loading…</div>;

  const set = (k: string, v: any) => setTheme({ ...theme, [k]: v });

  return (
    <div style={card}>
      <h3 style={h3}>🎨 Branding</h3>
      <div style={grid2}>
        <Field label="Site Title" value={theme.site_title || ""} onChange={v => set("site_title", v)} />
        <Field label="Tagline" value={theme.site_tagline || ""} onChange={v => set("site_tagline", v)} />
      </div>
      <Field label="Meta Description (shown in Google search)" value={theme.meta_description || ""} onChange={v => set("meta_description", v)} multiline />
      <Field label="Logo URL (upload to /uploads/ first, paste path)" value={theme.logo_url || ""} onChange={v => set("logo_url", v)} placeholder="/uploads/logo.png or https://..." />
      <Field label="Favicon URL" value={theme.favicon_url || ""} onChange={v => set("favicon_url", v)} placeholder="/uploads/favicon.ico" />

      <h3 style={h3}>🎨 Colors</h3>
      <div style={grid4}>
        <ColorField label="Primary" value={theme.primary_color} onChange={v => set("primary_color", v)} />
        <ColorField label="Secondary" value={theme.secondary_color} onChange={v => set("secondary_color", v)} />
        <ColorField label="Accent" value={theme.accent_color} onChange={v => set("accent_color", v)} />
        <ColorField label="Dark BG" value={theme.dark_bg} onChange={v => set("dark_bg", v)} />
      </div>

      <h3 style={h3}>📱 Social Links</h3>
      <div style={grid2}>
        <Field label="Instagram URL" value={theme.instagram_url || ""} onChange={v => set("instagram_url", v)} />
        <Field label="Facebook URL" value={theme.facebook_url || ""} onChange={v => set("facebook_url", v)} />
        <Field label="YouTube URL" value={theme.youtube_url || ""} onChange={v => set("youtube_url", v)} />
        <Field label="Twitter URL" value={theme.twitter_url || ""} onChange={v => set("twitter_url", v)} />
      </div>

      <h3 style={h3}>⭐ Google Reviews</h3>
      <Field label="Google profile / reviews URL (link the badge to your Google Business listing)" value={theme.google_reviews_url || ""} onChange={v => set("google_reviews_url", v)} placeholder="https://g.page/r/... or your Google Maps listing URL" />
      <div style={grid2}>
        <Field label="Rating (e.g. 4.9)" value={theme.google_rating || ""} onChange={v => set("google_rating", v)} placeholder="4.9" />
        <Field label="Review count (e.g. 128 or 120+)" value={theme.google_review_count || ""} onChange={v => set("google_review_count", v)} placeholder="120+" />
      </div>

      <h3 style={h3}>📊 Analytics</h3>
      <Field label="Google Analytics ID (G-XXXX or UA-XXXX)" value={theme.google_analytics_id || ""} onChange={v => set("google_analytics_id", v)} />

      <button onClick={save} disabled={saving} style={btnPrimary(A)}>{saving ? "Saving…" : "💾 Save Theme"}</button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CLINICS — Maps & 3D
// ════════════════════════════════════════════════════════════════════
function ClinicsEditor({ A, show, clinics }: any) {
  const [list, setList] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = () => fetchJson("/clinics").then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const startEdit = (c: any) => { setEditing(c.id); setDraft({ ...c }); };
  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...draft };
      delete payload.id; delete payload.name; delete payload.short_name;
      delete payload.address; delete payload.phone; delete payload.whatsapp_number; delete payload.logo_url;
      await fetchJson(`/clinics/${editing}`, { method: "PATCH", body: JSON.stringify(payload) });
      show("✓ Clinic updated"); setEditing(null); load();
    } catch (e: any) { show("Error: " + e.message); } finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ ...card, background: "#FFFBEB", border: "1.5px solid #FDE68A", marginBottom: 14 }}>
        <b style={{ color: "#92400E" }}>📖 How to get the Maps & 3D URLs:</b>
        <ol style={{ margin: "10px 0 0", paddingLeft: 22, fontSize: 13.5, lineHeight: 1.7, color: "#78350F" }}>
          <li>Open Google Maps → find your clinic → click <b>Share</b> → choose <b>Embed a map</b> → copy the <code>src="..."</code> URL from the iframe code.</li>
          <li>For 3D Street View: drag the yellow Pegman icon to your clinic's front door → click <b>Share</b> → <b>Embed</b> → copy the <code>src="..."</code>.</li>
          <li>For "Get Directions" link: click <b>Directions</b> → copy the URL from your browser address bar.</li>
        </ol>
      </div>
      {list.map(c => (
        <div key={c.id} style={{ ...card, marginBottom: 12 }}>
          {editing === c.id ? (
            <>
              <h3 style={h3}>✏️ Editing: {c.name}</h3>
              <Field label="Tagline (one-liner)" value={draft.tagline || ""} onChange={v => setDraft({ ...draft, tagline: v })} placeholder="e.g. Rourkela's most trusted dental clinic" />
              <Field label="Google Maps Embed URL" value={draft.google_maps_embed_url || ""} onChange={v => setDraft({ ...draft, google_maps_embed_url: v })} placeholder="https://www.google.com/maps/embed?pb=..." multiline />
              <Field label="3D Street View Embed URL" value={draft.street_view_embed_url || ""} onChange={v => setDraft({ ...draft, street_view_embed_url: v })} placeholder="https://www.google.com/maps/embed?pb=...!1s..." multiline />
              <Field label="Get Directions URL" value={draft.directions_url || ""} onChange={v => setDraft({ ...draft, directions_url: v })} placeholder="https://goo.gl/maps/..." />
              <div style={grid2}>
                <Field label="Latitude" value={draft.latitude ? String(draft.latitude) : ""} onChange={v => setDraft({ ...draft, latitude: v ? parseFloat(v) : null })} placeholder="22.2243" />
                <Field label="Longitude" value={draft.longitude ? String(draft.longitude) : ""} onChange={v => setDraft({ ...draft, longitude: v ? parseFloat(v) : null })} placeholder="84.8536" />
              </div>
              <Field label="Public Phone (shown on website)" value={draft.public_phone || ""} onChange={v => setDraft({ ...draft, public_phone: v })} placeholder="+91 98765 43210" />
              <Field label="WhatsApp Link (wa.me/...)" value={draft.whatsapp_link || ""} onChange={v => setDraft({ ...draft, whatsapp_link: v })} placeholder="https://wa.me/919876543210" />
              <Field label="Hero Image URL (large image for this clinic)" value={draft.hero_image_url || ""} onChange={v => setDraft({ ...draft, hero_image_url: v })} placeholder="/uploads/clinic1-hero.jpg" />
              <div style={grid2}>
                <ColorField label="Theme color (distinct per clinic)" value={draft.theme_color} onChange={v => setDraft({ ...draft, theme_color: v })} />
                <Field label="Display order (0 = first)" value={String(draft.display_order || 0)} onChange={v => setDraft({ ...draft, display_order: parseInt(v) || 0 })} type="number" />
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: 14, fontWeight: 600, color: INK }}>
                <input type="checkbox" checked={!!draft.show_on_public_site} onChange={e => setDraft({ ...draft, show_on_public_site: e.target.checked })} />
                Show this clinic on public website
              </label>
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button onClick={() => setEditing(null)} style={btnGhost()}>Cancel</button>
                <button onClick={save} disabled={saving} style={btnPrimary(A)}>{saving ? "Saving…" : "💾 Save"}</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <b style={{ fontSize: 16 }}>{c.name}</b>
                  <span style={{ ...badge, background: c.show_on_public_site ? "#D1FAE5" : "#FEE2E2", color: c.show_on_public_site ? "#065F46" : "#991B1B", marginLeft: 10 }}>
                    {c.show_on_public_site ? "✓ Public" : "✕ Hidden"}
                  </span>
                </div>
                <button onClick={() => startEdit(c)} style={{ ...btnPrimary(A), padding: "8px 18px", fontSize: 13 }}>✏️ Edit</button>
              </div>
              <div style={{ fontSize: 13, color: MUTE, marginTop: 6 }}>{c.address}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" as const, fontSize: 12 }}>
                <Stat ok={!!c.google_maps_embed_url} label="Map" />
                <Stat ok={!!c.street_view_embed_url} label="3D Street View" />
                <Stat ok={!!c.directions_url} label="Directions" />
                <Stat ok={!!c.hero_image_url} label="Hero Image" />
                <Stat ok={!!c.theme_color} label="Theme Color" />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SERVICES
// ════════════════════════════════════════════════════════════════════
function ServicesEditor({ A, show }: any) {
  return <SimpleCrudList A={A} show={show} resource="services" labelSingular="Service" labelPlural="Services"
    columns={[["icon_emoji", "Icon"], ["name", "Name"], ["short_description", "Description"], ["price_starting_from", "Price"]]}
    fields={[
      { k: "name", l: "Name *" },
      { k: "icon_emoji", l: "Emoji icon", placeholder: "🦷" },
      { k: "icon_image_url", l: "OR Icon Image URL (overrides emoji)" },
      { k: "hero_image_url", l: "Background image URL" },
      { k: "short_description", l: "Short description", multiline: true },
      { k: "full_description", l: "Full description", multiline: true },
      { k: "price_starting_from", l: "Price starting from (₹)", type: "number" },
      { k: "duration_minutes", l: "Duration (minutes)", type: "number" },
      { k: "cta_text", l: "CTA button text", placeholder: "Book Now" },
      { k: "cta_link", l: "CTA link", placeholder: "/book or https://..." },
      { k: "order_idx", l: "Display order", type: "number" },
      { k: "is_featured", l: "Featured (shown larger)", type: "checkbox" },
    ]}
  />;
}

// ════════════════════════════════════════════════════════════════════
// DOCTORS
// ════════════════════════════════════════════════════════════════════
function DoctorsEditor({ A, show }: any) {
  return <SimpleCrudList A={A} show={show} resource="doctors" labelSingular="Doctor" labelPlural="Doctors"
    columns={[["photo_url", "Photo"], ["display_name", "Name"], ["designation", "Designation"], ["years_experience", "Yrs"]]}
    fields={[
      { k: "display_name", l: "Display Name *" },
      { k: "qualification", l: "Qualification (e.g. BDS, MDS Endodontics)" },
      { k: "designation", l: "Designation (e.g. Chief Dentist)" },
      { k: "photo_url", l: "Photo URL" },
      { k: "bio", l: "Short bio", multiline: true },
      { k: "years_experience", l: "Years of experience", type: "number" },
      { k: "specializations", l: "Specializations (comma-separated)", type: "csv" },
      { k: "order_idx", l: "Display order", type: "number" },
      { k: "show_on_public_site", l: "Show on public site", type: "checkbox" },
    ]}
  />;
}

// ════════════════════════════════════════════════════════════════════
// TESTIMONIALS
// ════════════════════════════════════════════════════════════════════
function TestimonialsEditor({ A, show }: any) {
  return <SimpleCrudList A={A} show={show} resource="testimonials" labelSingular="Testimonial" labelPlural="Testimonials"
    columns={[["patient_name", "Patient"], ["rating", "★"], ["treatment_type", "For"], ["source", "Source"]]}
    fields={[
      { k: "patient_name", l: "Patient Name *" },
      { k: "patient_photo_url", l: "Patient Photo URL (optional)" },
      { k: "rating", l: "Rating (1-5)", type: "number" },
      { k: "text", l: "Testimonial text *", multiline: true },
      { k: "treatment_type", l: "Treatment type (e.g. RCT, Implants)" },
      { k: "source", l: "Source", placeholder: "manual | google | facebook" },
      { k: "is_featured", l: "Featured", type: "checkbox" },
      { k: "order_idx", l: "Display order", type: "number" },
    ]}
  />;
}

// ════════════════════════════════════════════════════════════════════
// VIDEOS
// ════════════════════════════════════════════════════════════════════
function VideosEditor({ A, show, clinics }: any) {
  return <SimpleCrudList A={A} show={show} resource="videos" labelSingular="Video" labelPlural="Videos"
    columns={[["category", "Where"], ["title", "Title"], ["video_url", "URL"], ["is_youtube", "YouTube?"]]}
    fields={[
      { k: "category", l: "Category", placeholder: "hero | clinic_tour | treatment | doctor_intro | testimonial" },
      { k: "title", l: "Title" },
      { k: "caption", l: "Caption", multiline: true },
      { k: "video_url", l: "Video URL (YouTube or direct .mp4) *" },
      { k: "thumbnail_url", l: "Thumbnail URL (auto-detected for YouTube)" },
      { k: "autoplay", l: "Autoplay (muted)", type: "checkbox" },
      { k: "loop_video", l: "Loop", type: "checkbox" },
      { k: "order_idx", l: "Display order", type: "number" },
    ]}
  />;
}

// ════════════════════════════════════════════════════════════════════
// Generic CRUD list — used by services, doctors, testimonials, videos
// ════════════════════════════════════════════════════════════════════
function SimpleCrudList({ A, show, resource, labelSingular, labelPlural, columns, fields }: any) {
  const [list, setList] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = () => fetchJson(`/${resource}`).then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, [resource]);

  const startNew = () => { setCreating(true); setEditing(null); setDraft({}); };
  const startEdit = (item: any) => {
    setEditing(item.id); setCreating(false);
    // For csv field, convert array → comma-separated string for display
    const display = { ...item };
    fields.forEach((f: any) => {
      if (f.type === "csv" && Array.isArray(item[f.k])) display[f.k] = item[f.k].join(", ");
    });
    setDraft(display);
  };
  const save = async () => {
    setSaving(true);
    try {
      // Convert csv strings back to arrays
      const payload: any = { ...draft };
      fields.forEach((f: any) => {
        if (f.type === "csv" && typeof payload[f.k] === "string") {
          payload[f.k] = payload[f.k].split(",").map((s: string) => s.trim()).filter(Boolean);
        }
        if (f.type === "number" && payload[f.k] !== undefined && payload[f.k] !== "") {
          payload[f.k] = parseFloat(payload[f.k]);
          if (isNaN(payload[f.k])) payload[f.k] = null;
        }
      });
      if (editing) {
        await fetchJson(`/${resource}/${editing}`, { method: "PATCH", body: JSON.stringify(payload) });
        show(`✓ ${labelSingular} updated`);
      } else {
        await fetchJson(`/${resource}`, { method: "POST", body: JSON.stringify(payload) });
        show(`✓ ${labelSingular} added`);
      }
      setEditing(null); setCreating(false); setDraft({}); load();
    } catch (e: any) { show("Error: " + e.message); } finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    if (!confirm(`Delete this ${labelSingular.toLowerCase()}?`)) return;
    try {
      await fetchJson(`/${resource}/${id}`, { method: "DELETE" });
      show(`✓ ${labelSingular} removed`); load();
    } catch (e: any) { show("Error: " + e.message); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: MUTE }}>{list.length} {labelPlural.toLowerCase()}</div>
        <button onClick={startNew} style={btnPrimary(A)}>＋ Add {labelSingular}</button>
      </div>
      {(creating || editing) && (
        <div style={{ ...card, marginBottom: 14, border: `2px solid ${A}` }}>
          <h3 style={h3}>{editing ? "✏️ Edit" : "＋ New"} {labelSingular}</h3>
          {fields.map((f: any) => (
            <DynField key={f.k} field={f} value={draft[f.k]} onChange={(v: any) => setDraft({ ...draft, [f.k]: v })} />
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={() => { setEditing(null); setCreating(false); }} style={btnGhost()}>Cancel</button>
            <button onClick={save} disabled={saving} style={btnPrimary(A)}>{saving ? "Saving…" : "💾 Save"}</button>
          </div>
        </div>
      )}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13.5 }}>
          <thead><tr style={{ background: SOFT }}>
            {columns.map(([k, l]: [string, string]) => (
              <th key={k} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: MUTE, letterSpacing: 0.4 }}>{l.toUpperCase()}</th>
            ))}
            <th style={{ padding: "10px 14px" }}></th>
          </tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={columns.length + 1} style={{ padding: 30, textAlign: "center", color: MUTE }}>No {labelPlural.toLowerCase()} yet. Click "Add" to create one.</td></tr>}
            {list.map(it => (
              <tr key={it.id} style={{ borderTop: `1px solid ${SOFT}` }}>
                {columns.map(([k]: [string, string]) => (
                  <td key={k} style={{ padding: "10px 14px" }}>
                    {k.endsWith("_url") && it[k]
                      ? <img src={it[k]} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                      : k === "is_youtube"
                        ? (it[k] ? "✓" : "")
                        : typeof it[k] === "boolean" ? (it[k] ? "✓" : "")
                        : (it[k] ?? "—")}
                  </td>
                ))}
                <td style={{ padding: "10px 14px", textAlign: "right" as const, whiteSpace: "nowrap" as const }}>
                  <button onClick={() => startEdit(it)} style={iconBtn("#3B82F6")}>✏️</button>{" "}
                  <button onClick={() => remove(it.id)} style={iconBtn("#EF4444")}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Form primitives
// ════════════════════════════════════════════════════════════════════
function Field({ label, value, onChange, placeholder, multiline, type }: any) {
  const I: any = multiline ? "textarea" : "input";
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      <I type={type || "text"} value={value ?? ""} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder}
        rows={multiline ? 3 : undefined} style={{ ...inp, minHeight: multiline ? 70 : undefined, resize: "vertical" as const }} />
    </div>
  );
}

function DynField({ field, value, onChange }: any) {
  if (field.type === "checkbox") {
    return (
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, fontSize: 14, fontWeight: 600, color: INK }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
        {field.l}
      </label>
    );
  }
  return <Field label={field.l} value={value} onChange={onChange} placeholder={field.placeholder}
    multiline={field.multiline} type={field.type === "number" ? "number" : "text"} />;
}

function ColorField({ label, value, onChange }: any) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="color" value={value || "#0E7C7B"} onChange={e => onChange(e.target.value)}
          style={{ width: 50, height: 42, border: `1.5px solid ${LINE}`, borderRadius: 8, cursor: "pointer", padding: 2 }} />
        <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder="#0E7C7B" style={{ ...inp, flex: 1, fontFamily: "monospace" }} />
      </div>
    </div>
  );
}

function Stat({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: ok ? "#059669" : "#94A3B8", fontWeight: 700 }}>
      {ok ? "✓" : "○"} {label}
    </span>
  );
}

const card: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: 22, boxShadow: SHADOW, border: `1px solid ${LINE}` };
const h3: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 12px", letterSpacing: -0.2 };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const grid4: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 };
const lbl: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 800, color: MUTE, marginBottom: 5, letterSpacing: 0.3, textTransform: "uppercase" as const };
const inp: React.CSSProperties = { width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const };
const badge: React.CSSProperties = { display: "inline-block", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 800 };
const btnPrimary = (A: string): React.CSSProperties => ({ background: A, color: "#fff", border: "none", borderRadius: 12, padding: "12px 22px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 12px ${A}44` });
const btnGhost = (): React.CSSProperties => ({ background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "12px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" });
const iconBtn = (c: string): React.CSSProperties => ({ background: `${c}15`, color: c, border: `1px solid ${c}33`, borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: 14, fontFamily: "inherit" });
