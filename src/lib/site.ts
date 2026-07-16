export const site = {
  name: "Keniya",
  tagline: "Snack boxes with a why",
  description:
    "Keniya curates condition-aware snack boxes for pregnancy, balanced blood sugar, and heart wellness — fourteen real snacks per box, with a Packed-for-You guide explaining why every one made the cut.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaniya-lake.vercel.app",
  email: "hello@keniyahealth.com",
  preorderPriceUSD: 47,
  snackCount: 14,
  currentEdit: "Summer '26",
  firstRunPerBox: 50,
  shipWindow: "August 3–14, 2026",
} as const;
