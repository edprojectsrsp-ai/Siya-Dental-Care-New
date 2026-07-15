"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

const INK = "#0F172A", MUTE = "#64748B", LINE = "#E2E8F0", SOFT = "#F8FAFC";

export type CatalogItem = { id: string; name: string; rate?: number; [key: string]: any };

export function CatalogSearchDropdown({
  items,
  onSelect,
  accent = "#0E7C7B",
  triggerLabel,
  placeholder = "Search…",
  fmt,
  isUsed,
  emptyHint = "No matches",
  maxHeight = 280,
}: {
  items: CatalogItem[];
  onSelect: (item: CatalogItem) => void;
  accent?: string;
  triggerLabel: string;
  placeholder?: string;
  fmt?: (n: number) => string;
  isUsed?: (item: CatalogItem) => boolean;
  emptyHint?: string;
  maxHeight?: number;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = query
      ? items.filter(i => i.name.toLowerCase().includes(query))
      : items;
    return list.slice(0, 80);
  }, [items, q]);

  useEffect(() => {
    setHighlight(0);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (item: CatalogItem) => {
    if (isUsed?.(item)) return;
    onSelect(item);
    setOpen(false);
    setQ("");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); setQ(""); return; }
    if (!filtered.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[highlight];
      if (item) pick(item);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          border: `1.5px solid ${open ? accent : LINE}`,
          background: open ? `${accent}08` : SOFT,
          borderRadius: 11, padding: "9px 12px",
          fontWeight: 800, fontSize: 12.5, color: open ? accent : MUTE,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: open ? `0 0 0 3px ${accent}18` : "none",
          transition: "all .12s",
        }}
      >
        <span>{triggerLabel}</span>
        <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 120,
          background: "#fff", borderRadius: 14, border: `1.5px solid ${LINE}`,
          boxShadow: "0 14px 40px rgba(15,23,42,.14)", overflow: "hidden",
        }}>
          <div style={{ padding: 10, borderBottom: `1px solid ${SOFT}`, background: `linear-gradient(135deg, ${accent}08, #fff)` }}>
            <div style={{ position: "relative" }}>
              <Search size={15} color={MUTE} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder={placeholder}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 34px",
                  border: `1.5px solid ${LINE}`, borderRadius: 10, fontSize: 13, fontFamily: "inherit",
                  outline: "none", background: "#fff",
                }}
              />
            </div>
          </div>

          <div style={{ maxHeight, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "14px 16px", fontSize: 13, color: MUTE, textAlign: "center" }}>{emptyHint}</div>
            ) : filtered.map((item, i) => {
              const used = isUsed?.(item);
              const active = highlight === i;
              return (
                <button
                  key={item.id || item.name}
                  type="button"
                  disabled={used}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(item)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    width: "100%", textAlign: "left", padding: "10px 14px",
                    border: "none", borderBottom: i < filtered.length - 1 ? `1px solid ${SOFT}` : "none",
                    background: active ? `${accent}12` : "#fff",
                    cursor: used ? "default" : "pointer", fontFamily: "inherit",
                    opacity: used ? 0.55 : 1,
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: 13.5, color: INK }}>
                    {used && <span style={{ color: accent, marginRight: 4 }}>✓</span>}
                    {item.name}
                  </span>
                  {item.rate != null && item.rate > 0 && fmt && (
                    <span style={{
                      fontSize: 11.5, fontWeight: 800, color: accent,
                      background: `${accent}10`, borderRadius: 8, padding: "3px 8px", flexShrink: 0,
                    }}>
                      {fmt(item.rate)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}