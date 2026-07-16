import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://siyadentalcare.com";
const SITE_TITLE = "Siya Dental Care | Dr. Monika Tejawat · Rourkela";
const SITE_DESCRIPTION =
  "Siya Dental Care by Dr. Monika Tejawat — Daily Market & Jhirpani, Rourkela. Modern gentle dentistry, online booking, smile preview.";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  icons: {
    icon: "/brand/logo-header.png",
    apple: "/brand/logo-header.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Siya Dental Care",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/brand/dr-monika-hero.jpg", width: 1200, height: 630, alt: "Siya Dental Care" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/brand/dr-monika-hero.jpg"],
  },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION once a Search Console property exists —
  // https://search.google.com/search-console → Settings → Ownership verification → HTML tag.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom left enabled for accessibility (older patients/staff).
  themeColor: "#0F172A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');`}
            </Script>
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
