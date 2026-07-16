"use client";

import type { CSSProperties, ReactNode } from "react";
import "@/app/public-site.css";

type PublicChromeProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  kicker?: string;
  backHref?: string;
  backLabel?: string;
  maxWidth?: "sm" | "md" | "lg";
  footerNote?: string;
};

/**
 * Shared shell for public patient pages (consult, rating, smile, etc.)
 * Matches the Clinical Calm marketing site.
 */
export default function PublicChrome({
  children,
  title = "Siya Dental Care",
  subtitle,
  kicker,
  backHref = "/",
  backLabel = "Back to website",
  maxWidth = "sm",
  footerNote = "Siya Dental Care · Calm, modern dentistry",
}: PublicChromeProps) {
  return (
    <div className="ps-root ps-sub">
      <header className="ps-sub-header">
        <div className={`ps-sub-header-inner ps-sub-max-${maxWidth}`}>
          <a href={backHref} className="ps-sub-back">
            ← {backLabel}
          </a>
          <a href="/" className="ps-brand ps-sub-brand">
            <img
              src="/brand/logo-header.png"
              alt="Siya Dental Care"
              className="ps-brand-logo"
              width={160}
              height={48}
            />
          </a>
          <div className="ps-sub-header-spacer" aria-hidden="true" />
        </div>
      </header>

      <main className={`ps-sub-main ps-sub-max-${maxWidth}`}>
        {(kicker || title || subtitle) && (
          <div className="ps-sub-hero">
            {kicker && <div className="ps-eyebrow">{kicker}</div>}
            {title && <h1 className="ps-display ps-sub-title">{title}</h1>}
            {subtitle && <p className="ps-sub-subtitle">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>

      <footer className="ps-sub-footer">
        <p>{footerNote}</p>
        <div className="ps-sub-footer-links">
          <a href="/">Website</a>
          <a href="/#book">Book visit</a>
          <a href="/public/consult">Phone consult</a>
          <a href="/clinic">Staff login</a>
        </div>
      </footer>
    </div>
  );
}

export function PublicCard({
  children,
  className = "",
  padded = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`ps-card ps-sub-card${padded ? " ps-sub-card-pad" : ""} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}

export function PublicField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="ps-field ps-sub-field">
      <label>
        <span>{label}</span>
        {children}
      </label>
      {hint && <small className="ps-sub-field-hint">{hint}</small>}
    </div>
  );
}

export function PublicAlert({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success" | "info" | "warn";
}) {
  return <div className={`ps-sub-alert ps-sub-alert-${tone}`} role="status">{children}</div>;
}

export function PublicStatus({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="ps-sub-status">
      <div className="ps-sub-status-icon" aria-hidden="true">{icon}</div>
      <h2 className="ps-display">{title}</h2>
      {children && <div className="ps-sub-status-body">{children}</div>}
    </div>
  );
}
