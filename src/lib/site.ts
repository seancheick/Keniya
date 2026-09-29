export const site = {
  name: "Keniya",
  tagline: "Snack boxes with a why",
  description:
    "Curated snack boxes for pregnancy, balanced blood sugar, and heart health — 14 real snacks, free US shipping, and the reason behind every pick.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://keniyahealth.com",
  email: "hello@keniyahealth.com",
  preorderPriceUSD: 47,
  snackCount: 14,
  currentEdit: "Fall '26",
  firstRunPerBox: 50,
  shipDate: "November 11, 2026",
  freeShipping: true,
  freeShippingLabel: "Free shipping",
  pharmaguide: {
    name: "PharmaGuide",
    url: "https://pharmaguide.io",
    blurb:
      "PharmaGuide is our sister platform for supplement and ingredient intelligence — the same screening mindset we use when every snack earns its place in a Keniya box.",
  },
  supabase: {
    projectId: process.env.SUPABASE_PROJECT_ID ?? "issfvpyewzlnxxdqrzqc",
    url:
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      "https://issfvpyewzlnxxdqrzqc.supabase.co",
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "Keniya",
  },
} as const;

/** Public CDN URL for an object in the Keniya storage bucket. */
export function storagePublicUrl(path: string) {
  const base = site.supabase.url.replace(/\/$/, "");
  const bucket = site.supabase.storageBucket;
  const clean = path.replace(/^\//, "");
  return `${base}/storage/v1/object/public/${bucket}/${clean}`;
}
