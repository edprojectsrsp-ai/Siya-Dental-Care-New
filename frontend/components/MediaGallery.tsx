"use client";
/**
 * components/MediaGallery.tsx — Bundle V, Sprint T+4
 *
 * Patient before/after gallery with FDI tooth grouping.
 * Upload via file input or camera capture (mobile rear camera).
 * Toggle "share with patient" to make image visible on patient portal.
 *
 * Usage (Patient detail view):
 *   import MediaGallery from "@/components/MediaGallery";
 *   <MediaGallery clinicId={clinicId} patientId={patient.id} accent={accent} show={show} />
 */

import { useEffect, useState, useCallback, useRef } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const BG_SOFT = "#F8FAFC";

const MEDIA_TYPES = [
  { key: "before",  label: "Before",  color: "#9F1239", icon: "📷" },
  { key: "after",   label: "After",   color: "#065F46", icon: "✨" },
  { key: "xray",    label: "X-Ray",   color: "#5B21B6", icon: "🩻" },
  { key: "general", label: "General", color: MUTE,       icon: "🖼️" },
] as const;

type MediaType = (typeof MEDIA_TYPES)[number]["key"];

function typeMeta(t: string) {
  return MEDIA_TYPES.find(m => m.key === t) || MEDIA_TYPES[3];
}

interface MediaItem {
  id: string;
  tooth_number?: string | null;
  media_type: MediaType;
  image_url: string;
  caption?: string | null;
  taken_at: string;
  is_shared_with_patient: boolean;
}

export default function MediaGallery({
  clinicId, patientId, accent = A, show,
}: { clinicId: string; patientId: string; accent?: string; show: (m: string) => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTooth, setFilterTooth] = useState<string>("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewer, setViewer] = useState<MediaItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const opts: { tooth_number?: string; media_type?: string } = {};
      if (filterTooth) opts.tooth_number = filterTooth;
      if (filterType !== "all") opts.media_type = filterType;
      const d = await api.mediaList(patientId, opts);
      setItems(d?.media || []);
    } catch (e: any) {
      show("Error loading media: " + e.message);
    } finally { setLoading(false); }
  }, [patientId, filterTooth, filterType, show]);

  useEffect(() => { load(); }, [load]);

  const grouped = items.reduce<Record<string, MediaItem[]>>((acc, it) => {
    const k = it.tooth_number || "general";
    (acc[k] = acc[k] || []).push(it);
    return acc;
  }, {});

  const uniqueTeeth = Array.from(new Set(items.map(i => i.tooth_number).filter(Boolean))) as string[];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: INK }}>
          🖼️ Media Gallery <span style={{ color: MUTE, fontWeight: 500, fontSize: 14 }}>({items.length})</span>
        </h3>
        <button onClick={() => setUploadOpen(true)} style={btnPrimary(accent)}>+ Upload</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterTooth} onChange={e => setFilterTooth(e.target.value)} style={selectStyle}>
          <option value="">All teeth</option>
          {uniqueTeeth.sort().map(t => <option key={t} value={t}>Tooth {t}</option>)}
        </select>
        <button onClick={() => setFilterType("all")} style={pill(filterType === "all", MUTE, accent)}>All</button>
        {MEDIA_TYPES.map(t => (
          <button key={t.key} onClick={() => setFilterType(t.key)} style={pill(filterType === t.key, t.color, accent)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={loadingDiv}>⏳ Loading media…</div>}

      {!loading && items.length === 0 && (
        <div style={{
          padding: 40, textAlign: "center", color: MUTE,
          border: `2px dashed ${LINE}`, borderRadius: 12,
        }}>
          No media yet. Tap <b>+ Upload</b> to add before/after photos or X-rays.
        </div>
      )}

      {!loading && Object.entries(grouped).map(([tooth, group]) => (
        <div key={tooth} style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: MUTE, textTransform: "uppercase", letterSpacing: 0.4,
            marginBottom: 8,
          }}>
            {tooth === "general" ? "General" : `Tooth ${tooth}`} · {group.length}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {group.map(it => {
              const meta = typeMeta(it.media_type);
              const url = it.image_url.startsWith("/") ? it.image_url : it.image_url;
              return (
                <button
                  key={it.id}
                  onClick={() => setViewer(it)}
                  style={{
                    border: `1px solid ${LINE}`, borderRadius: 10, overflow: "hidden",
                    background: "#fff", cursor: "pointer", padding: 0, position: "relative",
                    fontFamily: "inherit",
                  }}
                >
                  <img src={url} alt={it.caption || ""}
                       style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                  <div style={{
                    position: "absolute", top: 6, left: 6,
                    background: meta.color, color: "#fff", borderRadius: 999,
                    padding: "2px 8px", fontSize: 10, fontWeight: 800,
                  }}>
                    {meta.icon} {meta.label}
                  </div>
                  {it.is_shared_with_patient && (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: 4,
                      padding: "2px 6px", fontSize: 9, fontWeight: 700,
                    }}>🔗 Shared</div>
                  )}
                  {it.caption && (
                    <div style={{
                      padding: "6px 8px", fontSize: 11, color: INK, textAlign: "left",
                      borderTop: `1px solid ${LINE}`,
                    }}>
                      {it.caption.length > 30 ? it.caption.slice(0, 30) + "…" : it.caption}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {uploadOpen && (
        <UploadModal
          clinicId={clinicId} patientId={patientId} accent={accent} show={show}
          onClose={() => setUploadOpen(false)}
          onSaved={() => { setUploadOpen(false); load(); show("✓ Media uploaded"); }}
        />
      )}
      {viewer && (
        <ViewerModal
          item={viewer} accent={accent} show={show}
          onClose={() => setViewer(null)}
          onChanged={() => { load(); }}
          onDeleted={() => { setViewer(null); load(); }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Upload Modal
// ────────────────────────────────────────────────────────────

function UploadModal({
  clinicId, patientId, accent, show, onClose, onSaved,
}: any) {
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [mediaType, setMediaType] = useState<MediaType>("general");
  const [toothNumber, setToothNumber] = useState("");
  const [caption, setCaption] = useState("");
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 8_000_000) { show("Image too large (max 8MB)"); return; }
    const reader = new FileReader();
    reader.onload = ev => setImageDataUrl(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!imageDataUrl) { show("Pick an image first"); return; }
    setSaving(true);
    try {
      await api.mediaUpload(clinicId, {
        patient_id: patientId,
        image_data_url: imageDataUrl,
        media_type: mediaType,
        tooth_number: toothNumber || undefined,
        caption: caption || undefined,
        is_shared_with_patient: shared,
      });
      onSaved();
    } catch (e: any) {
      show("Upload failed: " + e.message);
    } finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={modalBg}>
      <div onClick={e => e.stopPropagation()} style={modalCard}>
        <h2 style={{ margin: "0 0 4px" }}>Upload media</h2>
        <p style={{ marginTop: 0, fontSize: 12, color: MUTE }}>
          Capture a before/after, X-ray, or general photo for this patient.
        </p>

        {!imageDataUrl ? (
          <label style={{
            display: "block", padding: 30, textAlign: "center", cursor: "pointer",
            border: `2px dashed ${LINE}`, borderRadius: 12, background: BG_SOFT,
          }}>
            <div style={{ fontSize: 36 }}>📷</div>
            <div style={{ fontWeight: 700, color: INK, marginTop: 6 }}>Tap to pick a photo</div>
            <div style={{ fontSize: 11, color: MUTE }}>or use rear camera on mobile</div>
            <input
              ref={inputRef} type="file" accept="image/*" capture="environment"
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </label>
        ) : (
          <div>
            <img src={imageDataUrl} alt=""
                 style={{ width: "100%", maxHeight: 280, objectFit: "contain",
                          borderRadius: 10, border: `1px solid ${LINE}` }} />
            <button onClick={() => setImageDataUrl("")} style={{ ...btnGhost, marginTop: 8 }}>
              ↺ Change image
            </button>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <Field label="Type">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {MEDIA_TYPES.map(t => (
                <button key={t.key} onClick={() => setMediaType(t.key)}
                        style={pill(mediaType === t.key, t.color, accent)}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Tooth (FDI, optional)">
            <input value={toothNumber} onChange={e => setToothNumber(e.target.value)}
                   placeholder="e.g. 36" style={inputStyle} />
          </Field>
          <Field label="Caption (optional)">
            <input value={caption} onChange={e => setCaption(e.target.value)}
                   placeholder="e.g. After RCT obturation"
                   style={inputStyle} />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: INK, cursor: "pointer", marginTop: 8 }}>
            <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} />
            Visible to patient on portal
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={saving || !imageDataUrl} style={btnPrimary(accent)}>
            {saving ? "Uploading…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Viewer modal
// ────────────────────────────────────────────────────────────

function ViewerModal({ item, accent, show, onClose, onChanged, onDeleted }: any) {
  const [caption, setCaption] = useState(item.caption || "");
  const [shared, setShared] = useState(item.is_shared_with_patient);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.mediaUpdate(item.id, { caption, is_shared_with_patient: shared });
      setEditing(false);
      onChanged();
    } catch (e: any) {
      show("Save failed: " + e.message);
    } finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm("Delete this image permanently?")) return;
    try {
      await api.mediaDelete(item.id);
      show("Deleted");
      onDeleted();
    } catch (e: any) {
      show("Delete failed: " + e.message);
    }
  };

  const meta = typeMeta(item.media_type);
  const url = item.image_url.startsWith("/") ? item.image_url : item.image_url;

  return (
    <div onClick={onClose} style={modalBg}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalCard, maxWidth: 600 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div>
            <b style={{ color: meta.color }}>{meta.icon} {meta.label}</b>
            {item.tooth_number && <span style={{ marginLeft: 10, color: MUTE, fontSize: 13 }}>Tooth {item.tooth_number}</span>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: MUTE }}>✕</button>
        </div>

        <img src={url} alt=""
             style={{ width: "100%", maxHeight: 420, objectFit: "contain", background: "#000", borderRadius: 8 }} />

        {editing ? (
          <div style={{ marginTop: 12 }}>
            <Field label="Caption">
              <input value={caption} onChange={e => setCaption(e.target.value)} style={inputStyle} />
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: INK, cursor: "pointer", marginTop: 8 }}>
              <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} />
              Visible to patient on portal
            </label>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button onClick={save} disabled={saving} style={btnPrimary(accent)}>{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setEditing(false)} style={btnGhost}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, color: INK }}>
              {item.caption || <span style={{ color: MUTE }}>(no caption)</span>}
            </div>
            <div style={{ fontSize: 11, color: MUTE, marginTop: 4 }}>
              {new Date(item.taken_at).toLocaleString("en-IN")}
              {item.is_shared_with_patient && " · 🔗 Shared with patient"}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button onClick={() => setEditing(true)} style={btnPrimary(accent)}>✏️ Edit</button>
              <button onClick={del} style={{ ...btnGhost, borderColor: "#FCA5A5", color: "#9F1239" }}>🗑 Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────

function Field({ label, children }: any) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 10,
  border: `1.5px solid ${LINE}`, fontSize: 13, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};
const selectStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: `1px solid ${LINE}`,
  fontSize: 12, background: "#fff", fontFamily: "inherit", color: INK,
};
const btnPrimary = (accent: string): React.CSSProperties => ({
  background: accent, color: "#fff", border: "none", padding: "9px 16px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
});
const btnGhost: React.CSSProperties = {
  background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, padding: "8px 14px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const pill = (active: boolean, color: string, accent: string): React.CSSProperties => ({
  border: active ? `2px solid ${accent}` : `1px solid ${LINE}`,
  background: active ? `${accent}14` : "#fff",
  color: active ? accent : color,
  padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
});
const loadingDiv: React.CSSProperties = {
  padding: 30, textAlign: "center", color: MUTE, fontSize: 14,
  background: "#fff", borderRadius: 12,
};
const modalBg: React.CSSProperties = {
  position: "fixed", inset: 0, background: "#0f172aa0", zIndex: 200,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modalCard: React.CSSProperties = {
  background: "#fff", borderRadius: 16, padding: 20,
  maxWidth: 500, width: "100%", maxHeight: "90vh", overflow: "auto",
};
