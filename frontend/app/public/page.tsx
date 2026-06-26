"use client";

import { useEffect, useState } from "react";
import PublicMarketingSite from "@/components/PublicMarketingSite";

const FALLBACK_CLINIC_ID = "a1111111-1111-1111-1111-111111111111";

export default function PublicWebsitePage() {
  const [content, setContent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/site-2026/content")
      .then((response) => response.json())
      .then((data) => setContent(data))
      .catch(() =>
        setContent({
          theme: {},
          clinics: [],
          services: [],
          doctors: [],
          testimonials: [],
          videos: [],
          gallery: [],
        })
      );
  }, []);

  if (!content) {
    return (
      <div className="ps-loading" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        Loading Siya Dental Care…
      </div>
    );
  }

  const clinics = (content.clinics as Record<string, string>[]) || [];
  const clinicId = clinics[0]?.id || FALLBACK_CLINIC_ID;

  return <PublicMarketingSite clinicId={clinicId} content={content} />;
}