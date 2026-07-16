export const site = {
  name: "Kaniya",
  tagline: "Snack boxes with a why",
  description:
    "Kaniya curates condition-aware snack boxes for pregnancy, balanced blood sugar, and heart wellness — fourteen real snacks per box, with a Packed-for-You guide explaining why every one made the cut.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaniya-lake.vercel.app",
  email: "hello@kaniyahealth.com",
  preorderPriceUSD: 47,
  snackCount: 14,
  firstRunPerBox: 50,
  shipWindow: "August 3–14, 2026",
} as const;
