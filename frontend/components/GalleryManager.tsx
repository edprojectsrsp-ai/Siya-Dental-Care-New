"use client";
// ╔══════════════════════════════════════════════════════════════╗
// ║  GALLERY MANAGER — doctor uploads photos for public website   ║
// ║  Categories: hero, clinic, treatment, team, before_after.     ║
// ╚══════════════════════════════════════════════════════════════╝
import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "@/lib/api";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";
const SHADOW = "0 1px 2px rgba(15,23,42,.05), 0 4px 14px rgba(15,23,42,.06)";

const CATEGORIES = [
  { id: "hero", label: "🌟 Hero / Banner", desc: "Featured at top of website" },
  { id: "clinic", label: "🏥 Clinic Interior", desc: "Building, reception, rooms" },
  { id: "treatment", label: "🦷 Treatments", desc: "Equipment, procedures in action" },
  { id: "team", label: "👥 Team", desc: "Doctors and staff photos" },
  { id: "before_after", label: "✨ Before / After", desc: "Treatment results (with consent)" },
];

export function GalleryManager({ accent, show }: { accent: string; show: (m: string) => void }) {
  const A = accent;
  const [images, setImages] = useState<any[]>([]);
  const [category, setCategory] = useState("hero");
  const [caption, setCaption] = useState(""); const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try { setImages(await api.adminListGallery()); } catch (e: any) { show("Error: " + e.message); }
  }, []); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const upload = async (fl: FileList | null) => {
    if (!fl?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(fl)) {
        const fd = new FormData();
        fd.append("file", f); fd.append("category", category);
        if (title) fd.append("title", title);
        if (caption) fd.append("caption", caption);
        await api.uploadAdminGallery(fd);
      }
      show(`✓ ${fl.length} image(s) uploaded`); setTitle(""); setCaption(""); load();
    } catch (e: any) { show("Error: " + e.message); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this image from the website?")) return;
    try { await api.adminDeleteGalleryImage(id); show("✓ Removed"); load(); }
    catch (e: any) { show("Error: " + e.message); }
  };

  const grouped: any = {};
  CATEGORIES.forEach(c => { grouped[c.id] = images.filter(i => i.category === c.id); });

  return (
    <div className="animate-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap" as const, gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: INK }}>🖼 Website Gallery</h1>
        <a href="/public" target="_blank" style={{ background: `linear-gradient(135deg,${A},${A}DD)`, color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 800, fontSize: 14, textDecoration: "none", boxShadow: `0 5px 16px ${A}44` }}>↗ View Public Website</a>
      </div>

      {/* Upload card */}
      <div style={{ background: "#fff", borderRadius: 20, padding: 22, boxShadow: SHADOW, marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: INK, marginBottom: 12 }}>📤 Upload Images</div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 14 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              style={{ border: category === c.id ? `2px solid ${A}` : `1.5px solid ${LINE}`,
                background: category === c.id ? A + "12" : "#fff",
                color: category === c.id ? A : "#475569",
                borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit",
                fontWeight: 800, fontSize: 13, transition: "all .12s" }}>
              {c.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: MUTE, margin: "0 0 14px" }}>{CATEGORIES.find(c => c.id === category)?.desc}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" style={inp} />
          <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption / description" style={inp} />
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ width: "100%", padding: "32px 12px", border: `2.5px dashed ${A}99`, borderRadius: 16, background: A + "08", color: A, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", transition: "background .12s" }}>
          {uploading ? "Uploading…" : `📎 Drop or tap to upload to "${CATEGORIES.find(c => c.id === category)?.label}"`}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => upload(e.target.files)} />
      </div>

      {/* Categories */}
      {CATEGORIES.map(c => grouped[c.id].length > 0 && (
        <div key={c.id} style={{ background: "#fff", borderRadius: 20, padding: 22, boxShadow: SHADOW, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: INK }}>{c.label}</div>
              <div style={{ fontSize: 12, color: MUTE }}>{grouped[c.id].length} image(s)</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12 }}>
            {grouped[c.id].map((img: any) => (
              <div key={img.id} style={{ border: `1.5px solid ${LINE}`, borderRadius: 14, overflow: "hidden", background: SOFT }}>
                <img src={img.image_url} alt={img.title || ""} style={{ width: "100%", height: 130, objectFit: "cover" as const, display: "block" }} />
                <div style={{ padding: "10px 12px" }}>
                  {img.title && <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginBottom: 2, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{img.title}</div>}
                  {img.caption && <div style={{ fontSize: 11.5, color: MUTE, marginBottom: 6, lineHeight: 1.3 }}>{img.caption}</div>}
                  <button onClick={() => remove(img.id)} style={{ background: "transparent", border: "none", color: "#DC2626", fontWeight: 800, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>🗑 Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {images.length === 0 && (
        <div style={{ background: "#fff", borderRadius: 20, padding: 50, textAlign: "center" as const, color: MUTE, boxShadow: SHADOW }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🖼</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: INK }}>No images yet</div>
          <div style={{ fontSize: 13.5, marginTop: 6 }}>Upload your first photo above to start building the website gallery.</div>
        </div>
      )}
    </div>
  );
}

const inp: any = { width: "100%", border: `1.5px solid ${LINE}`, borderRadius: 12, padding: "12px 16px", fontSize: 14.5, boxSizing: "border-box" as const, outline: "none", fontFamily: "inherit", background: "#fff" };
