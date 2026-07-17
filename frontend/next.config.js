/** @type {import('next').NextConfig} */
const backendBase =
  process.env.INTERNAL_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  poweredByHeader: false,
  async headers() {
    // Baseline browser security for public site + clinic app.
    // Clinical APIs still enforce JWT on protected routes server-side.
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
    ];
    return [
      { source: "/:path*", headers: security },
      {
        // Staff software is not meant for search indexing
        source: "/clinic",
        headers: [
          ...security,
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/clinic/:path*",
        headers: [
          ...security,
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
