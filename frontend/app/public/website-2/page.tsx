"use client";

/**
 * Legacy alternate public URL — redirect to the canonical homepage.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "@/app/public-site.css";

export default function PublicWebsiteTwoPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="ps-root">
      <div className="ps-loading" aria-live="polite">
        <div className="ps-loading-mark" aria-hidden="true">
          S
        </div>
        <p>Opening website…</p>
      </div>
    </div>
  );
}
