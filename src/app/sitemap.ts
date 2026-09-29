import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// ponytail: no lastModified — "now" on every build is a false signal Google learns to
// ignore. Add real per-page dates if the site grows past a handful of pages.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  return [
    "",
    "/pregnancy-snack-box",
    "/balanced-blood-sugar-snack-box",
    "/heart-healthy-snack-box",
    "/pregnancy-gift-box",
    "/about",
    "/privacy",
    "/terms",
  ].map((path) => ({ url: `${base}${path}` }));
}
