"use client";
/**
 * components/DefaultAvatar.tsx — Bundle R polish
 *
 * Initials avatar with a stable color derived from the name's hash.
 * Replaces empty spaces in the Phone Consult queue and elsewhere.
 *
 * Usage:
 *   <DefaultAvatar name="Madhu Edward" size={42} />
 */

const PALETTE = [
  "#0E7C7B", "#0EA5E9", "#A855F7", "#F59E0B",
  "#10B981", "#EF4444", "#6366F1", "#EC4899",
  "#14B8A6", "#F97316", "#8B5CF6", "#06B6D4",
];

function colorFor(name: string): string {
  if (!name) return "#94A3B8";
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i);
    h |= 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initialsOf(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DefaultAvatar({
  name, size = 40, photoUrl,
}: { name?: string; size?: number; photoUrl?: string }) {
  if (photoUrl) {
    return (
      <img src={photoUrl} alt={name || "avatar"}
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover" as const, flexShrink: 0,
        }} />
    );
  }

  const color = colorFor(name || "");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      color: "#fff", display: "flex", alignItems: "center" as const,
      justifyContent: "center" as const,
      fontSize: Math.max(10, Math.round(size * 0.36)), fontWeight: 800,
      letterSpacing: 0.5, flexShrink: 0,
      boxShadow: `inset 0 -1px 2px #00000022`,
    }}>{initialsOf(name)}</div>
  );
}
