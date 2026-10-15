export const site = {
  name: "Keniya",
  tagline: "Snack boxes with a why",
  description:
    "Thoughtfully selected snack boxes for pregnancy, blood sugar, heart, GLP-1 and postpartum. Explore a little care, packed for you.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://keniyahealth.com",
  email: "hello@keniyahealth.com",
  preorderPriceUSD: 47,
  snackCount: 14,
  shipDate: "November 11, 2026",
  freeShipping: true,
  freeShippingLabel: "Free shipping",
  /** Team orders start here; pricing is quoted by hand until packing capacity is proven. */
  corporateMinBoxes: 10,
  pharmaguide: {
    name: "PharmaGuide",
    url: "https://pharmaguide.io",
    blurb:
      "PharmaGuide is our sister platform for supplement and ingredient intelligence — the same screening mindset we use when every snack earns its place in a Keniya box.",
  },
} as const;
