"use client";

/**
 * Legacy /phone/* routes — the app uses responsive mode in the main SPA (page.tsx).
 * Redirect any phone URL to the unified shell.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PhoneLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif", color: "#64748b" }}>
      Redirecting to Siya Dental…
      {children}
    </div>
  );
}