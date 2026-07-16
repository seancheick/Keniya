export const site = {
  name: "Kaniya",
  tagline: "Snack boxes with a why",
  description:
    "Kaniya curates condition-aware snack boxes for pregnancy, balanced blood sugar, and heart wellness — twelve items per box, with a card explaining why every item made the cut.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaniya-lake.vercel.app",
  email: "hello@kaniyahealth.com",
  preorderPriceUSD: 47,
  firstRunPerBox: 50,
  shipWindow: "August 3–14, 2026",
} as const;
