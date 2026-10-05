import type { NextConfig } from "next";
import { giftLanding, landings } from "./src/lib/landing";

// HSTS is already sent by Vercel. ponytail: no CSP yet — GSAP and Next inline scripts
// need a nonce setup; add one when third-party scripts arrive.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

// Admin: the camera is allowed (UPC scanning, label photos) and nothing is indexed or cached.
const adminHeaders = [
  ...securityHeaders.filter((h) => h.key !== "Permissions-Policy"),
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "private, no-store" },
];

const nextConfig: NextConfig = {
  // Admin photo/receipt uploads (compressed in the browser first; Vercel caps bodies at 4.5 MB).
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [
      { source: "/((?!admin).*)", headers: securityHeaders },
      { source: "/admin", headers: adminHeaders },
      { source: "/admin/:path*", headers: adminHeaders },
    ];
  },
  // Renamed pages keep their old URLs alive (308). Paths are owned by src/lib/landing.ts.
  async redirects() {
    return [...landings, giftLanding].flatMap((page) =>
      (page.redirectFrom ?? []).map((source) => ({ source, destination: page.path, permanent: true })),
    );
  },
};

export default nextConfig;
