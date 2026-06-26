/** Siya Dental Care — design tokens & clinic themes */

export const SIYA = {
  teal: "#0E7C7B",
  tealDark: "#0A5C5B",
  tealLight: "#E8F5F5",
  ink: "#0F172A",
  inkMuted: "#64748B",
  slate: "#94A3B8",
  border: "#E2E8F0",
  surface: "#F8FAFC",
  white: "#FFFFFF",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  success: "#059669",
  successBg: "#D1FAE5",
  accent: "#6366F1",
  accentHover: "#4F46E5",
  radius: { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 },
  shadow: {
    sm: "0 2px 8px rgba(15,23,42,0.06)",
    md: "0 8px 24px rgba(15,23,42,0.10)",
    lg: "0 20px 60px rgba(0,0,0,0.20)",
    accent: "0 4px 14px rgba(99,102,241,0.35)",
  },
  font: "'Outfit', system-ui, sans-serif",
} as const;

export const CLINIC_THEMES = [
  { sidebar: "#1e3a8a", header: "linear-gradient(135deg,#1E40AF,#1d4ed8)", accent: "#3B82F6", accentDark: "#1E40AF", light: "#EFF6FF" },
  { sidebar: "#064e3b", header: "linear-gradient(135deg,#065F46,#047857)", accent: "#10B981", accentDark: "#065F46", light: "#ECFDF5" },
  { sidebar: "#4c1d95", header: "linear-gradient(135deg,#6d28d9,#7c3aed)", accent: "#8B5CF6", accentDark: "#6D28D9", light: "#F5F3FF" },
  { sidebar: "#78350f", header: "linear-gradient(135deg,#92400e,#b45309)", accent: "#F59E0B", accentDark: "#92400E", light: "#FFFBEB" },
  { sidebar: "#881337", header: "linear-gradient(135deg,#9f1239,#be123c)", accent: "#F43F5E", accentDark: "#BE123C", light: "#FFF1F2" },
];

export const APPOINTMENT_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
  confirmed: { bg: "#DBEAFE", text: "#1E40AF", label: "Confirmed" },
  arrived: { bg: "#D1FAE5", text: "#065F46", label: "Arrived" },
  in_progress: { bg: "#EDE9FE", text: "#5B21B6", label: "In Chair" },
  done: { bg: "#D1FAE5", text: "#065F46", label: "Done" },
  no_show: { bg: "#FEE2E2", text: "#991B1B", label: "No Show" },
  rejected: { bg: "#FEE2E2", text: "#991B1B", label: "Rejected" },
};

export const APPOINTMENT_SOURCE: Record<string, { bg: string; text: string; label: string }> = {
  whatsapp: { bg: "#D1FAE5", text: "#065F46", label: "WhatsApp" },
  walkin: { bg: "#DBEAFE", text: "#1E40AF", label: "Walk-in" },
  followup: { bg: "#EDE9FE", text: "#5B21B6", label: "Follow-up" },
  emergency: { bg: "#FEE2E2", text: "#991B1B", label: "Emergency" },
  phone: { bg: "#FEF3C7", text: "#92400E", label: "Phone" },
};