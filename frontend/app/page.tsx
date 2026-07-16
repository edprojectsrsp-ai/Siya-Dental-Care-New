/**
 * Public homepage — patient-facing marketing site.
 * Clinical staff login lives at /clinic (doctors, nurses, specialists, admin only).
 * Patients book as guests — no patient account required.
 *
 * Server component: content is fetched at request time on the server so search
 * crawlers (and the JSON-LD block below) see real markup on first response,
 * instead of an empty shell that only fills in after client-side JS runs.
 */
import PublicMarketingSite from "@/components/PublicMarketingSite";
import "@/app/public-site.css";

const FALLBACK_CLINIC_ID = "a1111111-1111-1111-1111-111111111111";
const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || "http://127.0.0.1:8000";

async function fetchSiteContent(): Promise<Record<string, any>> {
  try {
    // Always fetch fresh marketing CMS (reviews, videos, theme). Small payload; avoids
    // sticky empty Data Cache if the API was briefly empty during a prior sync.
    const res = await fetch(`${BACKEND_URL}/api/site-2026/content`, { cache: "no-store" });
    if (!res.ok) throw new Error(`content fetch failed: ${res.status}`);
    return await res.json();
  } catch {
    return { theme: {}, clinics: [], services: [], doctors: [], testimonials: [], videos: [], gallery: [] };
  }
}

export default async function PublicHomePage() {
  const content = await fetchSiteContent();
  const clinics = (content.clinics as Record<string, any>[]) || [];
  const clinicId = clinics[0]?.id || FALLBACK_CLINIC_ID;
  const theme = (content.theme as Record<string, any>) || {};

  return (
    <>
      <script
        type="application/ld+json"
        // Dentist/LocalBusiness schema per clinic — this is what lets Google surface
        // address, phone, hours, and rating directly in search results and the local
        // map pack, instead of relying purely on crawled page text.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            clinics.map((c) => ({
              "@context": "https://schema.org",
              "@type": "Dentist",
              name: c.name || "Siya Dental Care",
              image: c.hero_image_url || undefined,
              telephone: c.public_phone || c.phone,
              address: c.address
                ? { "@type": "PostalAddress", streetAddress: c.address, addressLocality: "Rourkela", addressRegion: "Odisha", addressCountry: "IN" }
                : undefined,
              geo: c.latitude && c.longitude ? { "@type": "GeoCoordinates", latitude: c.latitude, longitude: c.longitude } : undefined,
              url: c.directions_url,
              aggregateRating: theme.google_rating
                ? { "@type": "AggregateRating", ratingValue: theme.google_rating, reviewCount: String(theme.google_review_count || "1").replace(/\D/g, "") || "1" }
                : undefined,
            }))
          ),
        }}
      />
      <PublicMarketingSite clinicId={clinicId} content={content} />
    </>
  );
}
