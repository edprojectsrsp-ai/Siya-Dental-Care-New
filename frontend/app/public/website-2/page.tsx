"use client";

import { useEffect, useState } from "react";
import PublicMarketingSite from "@/components/PublicMarketingSite";

const FALLBACK_CLINIC_ID = "a1111111-1111-1111-1111-111111111111";

export default function PublicWebsiteTwoPage() {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    fetch("/api/site-2026/content")
      .then((response) => response.json())
      .then((data) => {
        setContent(data);
      })
      .catch(() => setContent({ theme: {}, clinics: [], services: [], doctors: [], testimonials: [], videos: [], gallery: [] }));
  }, []);

  if (!content) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "'Outfit',system-ui,sans-serif" }}>
        Loading…
      </div>
    );
  }

  const clinicId = content?.clinics?.[0]?.id || FALLBACK_CLINIC_ID;

  return <PublicMarketingSite clinicId={clinicId} content={content} />;
}
