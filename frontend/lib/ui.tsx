"use client";

import React from "react";
import { SIYA } from "./theme";

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  onClick,
  disabled,
  loading,
  full,
  small,
  variant = "primary",
  color,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  small?: boolean;
  variant?: BtnVariant;
  color?: string;
}) {
  const accent = color || SIYA.accent;
  const off = disabled || loading;
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: SIYA.radius.md,
    padding: small ? "10px 16px" : "14px 20px",
    fontWeight: 800,
    fontSize: small ? 13 : 15,
    fontFamily: SIYA.font,
    cursor: off ? "not-allowed" : "pointer",
    width: full ? "100%" : undefined,
    minHeight: small ? 40 : 48,
    transition: "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
    opacity: off ? 0.55 : 1,
    border: "none",
  };
  const styles: Record<BtnVariant, React.CSSProperties> = {
    primary: {
      ...base,
      background: off ? SIYA.slate : accent,
      color: SIYA.white,
      boxShadow: off ? "none" : `0 4px 14px ${accent}44`,
    },
    secondary: {
      ...base,
      background: SIYA.surface,
      color: SIYA.ink,
      border: `2px solid ${SIYA.border}`,
    },
    ghost: {
      ...base,
      background: "transparent",
      color: accent,
      border: `2px solid ${accent}`,
    },
    danger: {
      ...base,
      background: off ? SIYA.slate : SIYA.danger,
      color: SIYA.white,
    },
  };
  return (
    <button type="button" disabled={off} onClick={onClick} style={styles[variant]}>
      {loading ? "⏳ Loading…" : children}
    </button>
  );
}

export function Card({
  children,
  padding = 22,
  className,
  style,
}: {
  children: React.ReactNode;
  padding?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`siya-card ${className || ""}`}
      style={{
        background: SIYA.white,
        borderRadius: SIYA.radius.lg,
        padding,
        border: `1px solid ${SIYA.border}`,
        boxShadow: SIYA.shadow.sm,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Badge({
  label,
  bg,
  color,
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <span
      style={{
        background: bg,
        color,
        borderRadius: SIYA.radius.pill,
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="siya-loading" role="status" aria-live="polite">
      <div className="siya-loading-ring" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        background: SIYA.dangerBg,
        color: "#7F1D1D",
        borderRadius: SIYA.radius.md,
        padding: "12px 16px",
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid #FECACA",
      }}
    >
      {message}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
      {children}
    </div>
  );
}