/**
 * DropdownWithInlineAdd — Bundle X
 *
 * Reusable dropdown that:
 *   1. Shows top N suggestions sorted by usage_count DESC
 *   2. Has an inline "+ Add new" row at the bottom
 *   3. POSTs new entries to a catalog endpoint, then auto-selects them
 *
 * Used by: SendToLabModal (work_type), SendToSpecialistModal (rate label),
 *          and (Pass 2) lab order modal, procedure inline-add, etc.
 *
 * Usage:
 *   <DropdownWithInlineAdd
 *      value={workType}
 *      onChange={setWorkType}
 *      fetchSuggestions={async (q) => api.listLabWorkTypes({ clinic_id, q })}
 *      addNew={async (name) => (await api.createLabWorkType({ name, clinic_id })).name}
 *      placeholder="Work type — e.g. PFM Crown"
 *      labelKey="name"
 *      valueKey="name"
 *   />
 */
import React, { useEffect, useRef, useState } from "react";

type Suggestion = Record<string, any>;
type Props = {
  value: string;
  onChange: (v: string, raw?: Suggestion) => void;
  fetchSuggestions: (q: string) => Promise<Suggestion[]>;
  addNew?: (name: string) => Promise<string>;   // returns the new value to select
  placeholder?: string;
  labelKey?: string;        // field shown in dropdown row
  valueKey?: string;        // field stored as `value`
  secondaryKey?: string;    // optional 2nd line / hint
  allowInlineAdd?: boolean;
  disabled?: boolean;
  emptyHint?: string;
  style?: React.CSSProperties;
};

const TEAL = "#0E7C7B";
const TEAL_DEEP = "#0A5C5B";
const LINE = "#E2E8F0";
const INK = "#1F2937";
const MUTE = "#64748B";
const SOFT = "#F8FAFC";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: `1.5px solid ${LINE}`, fontSize: 14, fontFamily: "inherit",
  background: "#fff", color: INK, outline: "none", boxSizing: "border-box",
};

export default function DropdownWithInlineAdd({
  value, onChange, fetchSuggestions, addNew,
  placeholder = "Type to search…", labelKey = "name", valueKey = "name",
  secondaryKey, allowInlineAdd = true, disabled = false, emptyHint, style,
}: Props) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value
  useEffect(() => { setQuery(value || ""); }, [value]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Fetch suggestions when open / when query changes (debounced)
  useEffect(() => {
    if (!open) return;
    let cancel = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchSuggestions(query);
        if (!cancel) setItems(Array.isArray(data) ? data : (data as any)?.items || (data as any)?.tiers || []);
      } catch (e) {
        if (!cancel) setItems([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 180);
    return () => { cancel = true; clearTimeout(t); };
  }, [open, query, fetchSuggestions]);

  const pickItem = (it: Suggestion) => {
    const v = it[valueKey] ?? it[labelKey];
    onChange(String(v), it);
    setQuery(String(it[labelKey] ?? v));
    setOpen(false);
  };

  const doInlineAdd = async () => {
    const name = (query || "").trim();
    if (!name || !addNew) return;
    setAdding(true);
    try {
      const newVal = await addNew(name);
      onChange(newVal || name);
      setQuery(newVal || name);
      setOpen(false);
    } catch (e: any) {
      alert(`Could not add: ${e?.message || e}`);
    } finally {
      setAdding(false);
    }
  };

  const queryLower = query.trim().toLowerCase();
  const exactMatch = items.some(
    (it) => String(it[labelKey] ?? "").trim().toLowerCase() === queryLower
  );
  const showAddRow = allowInlineAdd && !!addNew && query.trim().length > 0 && !exactMatch;

  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <input
        ref={inputRef}
        style={{
          ...inputStyle,
          borderColor: open ? TEAL : LINE,
          boxShadow: open ? `0 0 0 3px ${TEAL}22` : "none",
          opacity: disabled ? 0.6 : 1,
        }}
        type="text"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && showAddRow) { e.preventDefault(); doInlineAdd(); }
        }}
      />

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 12,
            boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
            maxHeight: 280, overflowY: "auto", zIndex: 100,
          }}
        >
          {loading && (
            <div style={{ padding: 12, fontSize: 13, color: MUTE, textAlign: "center" }}>
              Loading…
            </div>
          )}

          {!loading && items.length === 0 && !showAddRow && (
            <div style={{ padding: 12, fontSize: 13, color: MUTE, textAlign: "center" }}>
              {emptyHint || "No matches"}
            </div>
          )}

          {!loading && items.map((it, i) => {
            const label = String(it[labelKey] ?? "");
            const sec = secondaryKey ? String(it[secondaryKey] ?? "") : "";
            const usage = Number(it.usage_count || 0);
            return (
              <div
                key={it.id || i}
                onClick={() => pickItem(it)}
                style={{
                  padding: "10px 14px", cursor: "pointer", fontSize: 13.5,
                  borderBottom: i < items.length - 1 ? `1px solid ${SOFT}` : "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = SOFT)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ color: INK, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                  {sec && <span style={{ color: MUTE, fontSize: 11.5 }}>{sec}</span>}
                </div>
                {usage > 0 && (
                  <span style={{
                    fontSize: 10.5, color: TEAL_DEEP, background: TEAL + "15",
                    borderRadius: 999, padding: "2px 8px", fontWeight: 700, flexShrink: 0,
                  }}>
                    used {usage}×
                  </span>
                )}
              </div>
            );
          })}

          {showAddRow && (
            <div
              onClick={doInlineAdd}
              style={{
                padding: "11px 14px", cursor: "pointer", fontSize: 13.5,
                background: TEAL + "0E", color: TEAL_DEEP, fontWeight: 700,
                borderTop: items.length > 0 ? `1.5px dashed ${LINE}` : "none",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: 999, background: TEAL,
                color: "#fff", display: "inline-flex", alignItems: "center",
                justifyContent: "center", fontSize: 14, fontWeight: 800,
              }}>+</span>
              {adding ? "Adding…" : `Add "${query.trim()}" as new`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
