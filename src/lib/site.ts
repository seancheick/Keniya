export const site = {
  name: "Keniya",
  tagline: "Snack boxes with a why",
  description:
    "Snack boxes screened to their own standards for pregnancy, blood sugar, heart and blood pressure, gestational diabetes, GLP-1 and postpartum: 14 snacks, free US shipping, no subscription.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://keniyahealth.com",
  email: "hello@keniyahealth.com",
  preorderPriceUSD: 47,
  snackCount: 14,
  shipDate: "November 11, 2026",
  freeShipping: true,
  freeShippingLabel: "Free shipping",
  pharmaguide: {
    name: "PharmaGuide",
    url: "https://pharmaguide.io",
    blurb:
      "PharmaGuide is our sister platform for supplement and ingredient intelligence — the same screening mindset we use when every snack earns its place in a Keniya box.",
  },
} as const;
