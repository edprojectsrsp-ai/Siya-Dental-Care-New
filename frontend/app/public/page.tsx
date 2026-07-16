"use client";

/**
 * Legacy /public URL — keep working for old links and bookmarks.
 * Canonical public homepage is now `/`.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PublicWebsiteRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="ps-root">
      <div className="ps-loading" aria-live="polite">
        <div className="ps-loading-mark" aria-hidden="true">S</div>
        <p>Opening website…</p>
      </div>
    </div>
  );
}
