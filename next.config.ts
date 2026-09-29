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

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Renamed pages keep their old URLs alive (308). Paths are owned by src/lib/landing.ts.
  async redirects() {
    return [...landings, giftLanding].flatMap((page) =>
      (page.redirectFrom ?? []).map((source) => ({ source, destination: page.path, permanent: true })),
    );
  },
};

export default nextConfig;
