import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://siyadentalcare.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/clinic", "/clinic/", "/m", "/m/"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
