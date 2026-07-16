"use client";

/**
 * Loads section color-band + 3D pop styles site-wide.
 * (Used because some core files are locked for direct edits in this session.)
 */
import "@/app/public-site-pop.css";

export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
