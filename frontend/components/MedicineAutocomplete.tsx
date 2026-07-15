"use client";
/**
 * components/MedicineAutocomplete.tsx — Bundle V (Sprint T+8)
 *
 * Exports:
 *   • MedicineAutocomplete — debounced search with usage-based ranking
 *   • LabClosureModal      — close lab order with before/after images + notes
 *
 * MedicineAutocomplete usage:
 *   import { MedicineAutocomplete } from "@/components/MedicineAutocomplete";
 *   <MedicineAutocomplete clinicId={cid} onSelect={(m) => addToRx(m)} />
 *
 * LabClosureModal usage (inside LabManagement):
 *   import { LabClosureModal } from "@/components/MedicineAutocomplete";
 *   {closing && (
 *     <LabClosureModal
 *       order={closing}
 *       onClose={() => setClosing(null)}
 *       onClosed={() => { setClosing(null); refresh(); show("Closed"); }}
 *     />
 *   )}
 */

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import * as api from "@/lib/api";

const A = "#0E7C7B";
const A_DEEP = "#0A5C5B";
const INK = "#0F172A";
const MUTE = "#64748B";
const LINE = "#E2E8F0";
const BG_SOFT = "#F8FAFC";

// ───────────────────────────────────────────────────────────
// MedicineAutocomplete
// ───────────────────────────────────────────────────────────

export function MedicineAutocomplete({
  clinicId, onSelect, placeholder = "Search medicines…",
  accent = A,
}: {
  clinicId: string;
  onSelect: (med: any) => void;
  placeholder?: string;
  accent?: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<any>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const search = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const d = await api.medicineSearch(query, clinicId, 10);
      setResults(d?.medicines || []);
      setHighlight(0);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [clinicId]);

  useEffect(() => {
    if (!open) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(q), 150);
    return () => clearTimeout(debounce.current);
  }, [q, open, search]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = async (m: any) => {
    onSelect(m);
    try { await api.medicineIncrementUsage(m.id); } catch {}
    setQ(""); setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(p => Math.min(p + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(p => Math.max(p - 1, 0)); }
    else if (e.key === "Enter" && results[highlight]) { e.preventDefault(); pick(results[highlight]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrap} style={{ position: "relative", width: "100%" }}>
      <input
        type="text" value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "11px 14px", borderRadius: 12,
          border: `1.5px solid ${open ? accent : LINE}`, fontSize: 14, outline: "none",
          boxSizing: "border-box", fontFamily: "inherit",
          boxShadow: open ? `0 0 0 3px ${accent}18` : "none",
          transition: "border-color .12s, box-shadow .12s",
        }}
      />
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 120,
          background: "#fff", borderRadius: 14, border: `1.5px solid ${LINE}`,
          boxShadow: "0 14px 40px rgba(15,23,42,.14)", maxHeight: 280, overflow: "hidden",
        }}>
          <div style={{
            padding: "8px 12px", fontSize: 10, fontWeight: 800, color: MUTE,
            textTransform: "uppercase", letterSpacing: 0.4,
            background: `linear-gradient(135deg, ${accent}08, #fff)`,
            borderBottom: `1px solid ${BG_SOFT}`,
          }}>
            💊 Medicine catalog
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
          {loading ? <Empty>Searching…</Empty> :
           results.length === 0 ? <Empty>{q ? "No matches" : "Start typing"}</Empty> :
           results.map((m, i) => (
            <div key={m.id}
                 onMouseEnter={() => setHighlight(i)}
                 onClick={() => pick(m)}
                 style={{
                   padding: "10px 14px", cursor: "pointer",
                   background: highlight === i ? `${accent}12` : "transparent",
                   borderBottom: i === results.length - 1 ? "none" : `1px solid ${BG_SOFT}`,
                 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: INK }}>{m.name}</div>
                {m.usage_count > 0 && (
                  <span style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 999,
                    background: `${accent}12`, color: accent, fontWeight: 800,
                  }}>{m.usage_count}×</span>
                )}
              </div>
              {(m.common_dose || m.common_frequency || m.common_duration) && (
                <div style={{ fontSize: 11.5, color: MUTE, marginTop: 3 }}>
                  {[m.common_dose, m.common_frequency, m.common_duration].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ children }: any) {
  return <div style={{ padding: "12px 14px", color: MUTE, fontSize: 12 }}>{children}</div>;
}

/** Inline medicine picker with searchable dropdown — for Rx rows */
export function MedicineRowPicker({
  value,
  onChange,
  clinicId,
  medCatalog = [],
  placeholder = "Select medicine…",
  accent = A,
}: {
  value: string;
  onChange: (name: string, med?: any) => void;
  clinicId?: string;
  medCatalog?: any[];
  placeholder?: string;
  accent?: string;
}) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<any>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(value || ""); }, [value]);

  const localHits = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return medCatalog.slice(0, 12);
    return medCatalog.filter(m => (m.name || "").toLowerCase().includes(query)).slice(0, 16);
  }, [medCatalog, q]);

  const searchRemote = useCallback(async (query: string) => {
    if (!clinicId) { setResults(localHits); return; }
    setLoading(true);
    try {
      const d = await api.medicineSearch(query, clinicId, 12);
      const remote = d?.medicines || [];
      const seen = new Set<string>();
      const merged: any[] = [];
      [...localHits, ...remote].forEach(m => {
        const key = (m.name || "").toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        merged.push(m);
      });
      setResults(merged.slice(0, 16));
      setHighlight(0);
    } catch {
      setResults(localHits);
    } finally {
      setLoading(false);
    }
  }, [clinicId, localHits]);

  useEffect(() => {
    if (!open) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => searchRemote(q), clinicId ? 150 : 0);
    return () => clearTimeout(debounce.current);
  }, [q, open, searchRemote, clinicId]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const display = open ? results : [];
  const showList = open && (loading || display.length > 0 || q.trim());

  const pick = async (m: any) => {
    const name = m.name || "";
    onChange(name, m);
    if (m.id) { try { await api.medicineIncrementUsage(m.id); } catch {} }
    setQ(name);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    const list = display;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(p => Math.min(p + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(p => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (list[highlight]) pick(list[highlight]);
      else if (q.trim()) { onChange(q.trim()); setOpen(false); }
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrap} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "11px 36px 11px 14px", borderRadius: 12,
          border: `1.5px solid ${open ? accent : LINE}`,
          fontSize: 14, fontWeight: 800, outline: "none", boxSizing: "border-box",
          fontFamily: "inherit", background: "#fff", color: INK,
          boxShadow: open ? `0 0 0 3px ${accent}18` : "none",
          transition: "border-color .12s, box-shadow .12s",
        }}
      />
      <span style={{
        position: "absolute", right: 12, top: "50%", transform: `translateY(-50%) ${open ? "rotate(180deg)" : ""}`,
        color: MUTE, pointerEvents: "none", transition: "transform .15s", fontSize: 11,
      }}>▼</span>

      {showList && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 130,
          background: "#fff", borderRadius: 14, border: `1.5px solid ${LINE}`,
          boxShadow: "0 14px 40px rgba(15,23,42,.14)", overflow: "hidden", maxHeight: 260,
        }}>
          <div style={{
            padding: "8px 12px", fontSize: 10, fontWeight: 800, color: MUTE,
            textTransform: "uppercase", letterSpacing: 0.4,
            background: `linear-gradient(135deg, ${accent}08, #fff)`,
            borderBottom: `1px solid ${BG_SOFT}`,
          }}>
            💊 Medicine catalog
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {loading ? <Empty>Searching…</Empty> :
             display.length === 0 ? <Empty>{q.trim() ? "No matches — press Enter to use typed name" : "Type to search"}</Empty> :
             display.map((m, i) => (
              <div key={m.id || m.name + i}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(m)}
                style={{
                  padding: "10px 14px", cursor: "pointer",
                  background: highlight === i ? `${accent}12` : "transparent",
                  borderBottom: i < display.length - 1 ? `1px solid ${BG_SOFT}` : "none",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: INK }}>{m.name}</div>
                  {m.usage_count > 0 && (
                    <span style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 999,
                      background: `${accent}12`, color: accent, fontWeight: 800,
                    }}>{m.usage_count}×</span>
                  )}
                </div>
                {(m.default_strength || m.common_dose || m.default_dose || m.default_frequency) && (
                  <div style={{ fontSize: 11.5, color: MUTE, marginTop: 3 }}>
                    {[m.default_strength, m.default_dose || m.common_dose, m.default_frequency || m.common_frequency].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ───────────────────────────────────────────────────────────
// LabClosureModal
// ───────────────────────────────────────────────────────────

export function LabClosureModal({
  order, onClose, onClosed, show,
}: {
  order: any;
  onClose: () => void;
  onClosed: () => void;
  show: (m: string) => void;
}) {
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.labOrderClose(order.id, {
        before_image_data_url: before || undefined,
        after_image_data_url: after || undefined,
        closure_notes: notes || undefined,
      });
      show("✓ Lab order closed");
      onClosed();
    } catch (e: any) { show("Close failed: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={modalBg}>
      <div onClick={e => e.stopPropagation()} style={modalCard}>
        <h2 style={{ margin: "0 0 4px" }}>✓ Close lab order</h2>
        <p style={{ marginTop: 0, fontSize: 12, color: MUTE }}>
          {order.work_type} · {order.patient_name || "Patient"}{order.vendor_name ? ` · ${order.vendor_name}` : ""}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ImageDrop label="Before" v={before} on={setBefore} color="#9F1239" />
          <ImageDrop label="After"  v={after}  on={setAfter}  color="#065F46" />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginBottom: 4 }}>Closure notes</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Fit verified, occlusion adjusted, cementation done."
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10,
              border: `1px solid ${LINE}`, fontSize: 13, resize: "vertical",
              fontFamily: "inherit", boxSizing: "border-box", outline: "none",
            }} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{
            ...btnPrimary, background: "#10B981",
          }}>{saving ? "Closing…" : "✓ Mark completed"}</button>
        </div>
      </div>
    </div>
  );
}

function ImageDrop({ label, v, on, color }: any) {
  const ref = useRef<HTMLInputElement>(null);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => on(ev.target?.result as string);
    reader.readAsDataURL(f);
  };
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 4,
      }}>{label}</div>
      {v ? (
        <div style={{ position: "relative" }}>
          <img src={v} alt="" style={{
            width: "100%", height: 130, objectFit: "cover", borderRadius: 8,
            border: `2px solid ${color}30`,
          }} />
          <button onClick={() => ref.current?.click()} style={{
            position: "absolute", bottom: 6, right: 6,
            padding: "3px 10px", borderRadius: 4, border: "none",
            background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
          }}>↺ Change</button>
        </div>
      ) : (
        <div onClick={() => ref.current?.click()} style={{
          height: 130, borderRadius: 8, cursor: "pointer",
          border: `2px dashed ${color}55`, background: `${color}10`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ fontSize: 22 }}>📷</div>
          <div style={{ fontSize: 11, color: MUTE }}>Tap to capture</div>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" capture="environment"
             onChange={pick} style={{ display: "none" }} />
    </div>
  );
}

const modalBg: React.CSSProperties = {
  position: "fixed", inset: 0, background: "#0f172aa0", zIndex: 200,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modalCard: React.CSSProperties = {
  background: "#fff", borderRadius: 16, padding: 20,
  maxWidth: 480, width: "100%", maxHeight: "90vh", overflow: "auto",
};
const btnPrimary: React.CSSProperties = {
  background: A, color: "#fff", border: "none", padding: "10px 16px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const btnGhost: React.CSSProperties = {
  background: "#fff", color: MUTE, border: `1.5px solid ${LINE}`, padding: "9px 14px",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
