import type { MetadataRoute } from "next";
import { giftLanding, landings } from "@/lib/landing";
import { site } from "@/lib/site";

// ponytail: no lastModified — "now" on every build is a false signal Google learns to
// ignore. Add real per-page dates if the site grows past a handful of pages.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  return [
    "",
    ...landings.map((l) => l.path),
    giftLanding.path,
    "/about",
    "/privacy",
    "/terms",
  ].map((path) => ({ url: `${base}${path}` }));
}
