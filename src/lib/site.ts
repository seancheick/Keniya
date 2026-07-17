export const site = {
  name: "Keniya",
  tagline: "Snack boxes with a why",
  description:
    "Keniya curates condition-aware snack boxes for pregnancy, balanced blood sugar, and heart wellness — fourteen real snacks per box, with a Packed-for-You guide explaining why every one made the cut.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://keniyahealth.com",
  email: "hello@keniyahealth.com",
  preorderPriceUSD: 47,
  snackCount: 14,
  currentEdit: "Summer '26",
  firstRunPerBox: 50,
  shipWindow: "August 3–14, 2026",
  freeShipping: true,
  freeShippingLabel: "Free shipping",
  /** Soft social proof — bump as waitlist / preorders grow (update manually or via admin later). */
  foundingHolders: 47,
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

export function remainingFoundingEstimate(reserved = site.foundingHolders) {
  // Soft estimate for marketing copy — not live inventory until Stripe webhooks land.
  const perBox = site.firstRunPerBox;
  const left = Math.max(0, perBox * 3 - reserved);
  return { perBox, leftAcrossLine: left, reserved };
}
