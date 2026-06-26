"use client";
/**
 * components/ClickToChatLink.tsx — Bundle R polish
 *
 * Replaces raw `https://wa.me/...` URLs with a friendly chip that includes:
 *   • WhatsApp icon
 *   • Phone number (formatted)
 *   • Click-to-send action
 *
 * Two variants:
 *   compact:  for inline use within a list (phone number with chat icon)
 *   button:   for primary CTA use (full button with "Send via WhatsApp")
 *
 * Usage:
 *   <ClickToChatLink phone="9876543210" />                   // button variant
 *   <ClickToChatLink phone="9876543210" compact />           // inline
 *   <ClickToChatLink phone="9876543210" message="Hi…" />    // with prefilled body
 */

const A = "#0E7C7B";
const A_DEEP = "#0A5C5B";
const WA_GREEN = "#25D366";

function normalizePhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return "91" + digits;
  if (digits.startsWith("0") && digits.length === 11) return "91" + digits.slice(1);
  return digits;
}

function formatDisplay(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return phone;
}

const WhatsAppIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.297-.771.964-.944 1.162-.175.195-.349.225-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345m-5.446 7.443h-.016c-1.77 0-3.524-.48-5.055-1.38l-.36-.214-3.75.975 1.005-3.645-.239-.375a9.869 9.869 0 0 1-1.516-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

export default function ClickToChatLink({
  phone, message, label, compact = false, button = false,
}: {
  phone: string; message?: string; label?: string;
  compact?: boolean; button?: boolean;
}) {
  if (!phone) return <span style={{ color: "#94A3B8" }}>—</span>;

  const normalized = normalizePhone(phone);
  const url = `https://wa.me/${normalized}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

  if (compact) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          display: "inline-flex" as const, alignItems: "center" as const, gap: 5,
          color: A_DEEP, textDecoration: "none", fontSize: 12.5, fontWeight: 600,
        }}>
        <span style={{ color: WA_GREEN, display: "inline-flex" as const }}><WhatsAppIcon size={13} /></span>
        {label || formatDisplay(phone)}
      </a>
    );
  }

  if (button) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        style={{
          display: "inline-flex" as const, alignItems: "center" as const, gap: 8,
          background: WA_GREEN, color: "#fff", padding: "10px 16px",
          borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 13.5,
          boxShadow: `0 2px 6px ${WA_GREEN}44`,
        }}>
        <WhatsAppIcon size={16} />
        {label || "Send via WhatsApp"}
      </a>
    );
  }

  // Default: pill chip
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{
        display: "inline-flex" as const, alignItems: "center" as const, gap: 6,
        background: `${WA_GREEN}15`, color: WA_GREEN,
        padding: "5px 11px", borderRadius: 999, textDecoration: "none",
        fontWeight: 700, fontSize: 12.5,
        border: `1px solid ${WA_GREEN}33`,
      }}>
      <WhatsAppIcon size={13} />
      <span style={{ color: A_DEEP }}>{label || "Click to send"}</span>
    </a>
  );
}

export { WhatsAppIcon, normalizePhone, formatDisplay };
