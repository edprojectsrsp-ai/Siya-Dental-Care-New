"use client";

import PublicSitePage from "@/components/PublicSitePage";

export default function Page({ params }: { params: { clinicId: string; slug?: string[] } }) {
  const slug = params.slug?.[0] || "home";
  return <PublicSitePage clinicId={params.clinicId} slug={slug} />;
}
