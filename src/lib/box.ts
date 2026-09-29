export type Box = {
  slug: "pregnancy_comfort" | "blood_sugar" | "heart";
  name: string;
  shortName: string;
  forWho: string;
  why: string;
  /**
   * What every box of this kind contains, by category (counts sum to 14), from the Box
   * Builder slots. Categories only, never specific snacks: picks rotate, promises don't.
   */
  categories: { name: string; count: number; note: string }[];
  tint: "blush" | "sage" | "cream";
  /** Product photography under /public */
  image: string;
  imageAlt: string;
};

export const boxes: Box[] = [
  {
    slug: "pregnancy_comfort",
    name: "Pregnancy Comfort Box",
    shortName: "Pregnancy",
    forWho: "For pregnancy, first trimester to third, and the people buying for her.",
    why: "Gentle picks for rough mornings, real treats for cravings.",
    categories: [
      { name: "Comfort", count: 4, note: "gentle, easy picks for rough days" },
      { name: "Protein & staying power", count: 4, note: "nuts, seeds and savory crunch" },
      { name: "Sweet treats", count: 3, note: "fruit and chocolate, because cravings count" },
      { name: "Sips", count: 2, note: "caffeine-free tea and hydration" },
      { name: "Salty snack", count: 1, note: "for the salty craving" },
    ],
    tint: "blush",
    image: "/images/box-pregnancy.jpg",
    imageAlt: "Keniya Pregnancy Comfort Box with Packed for You guide",
  },
  {
    slug: "blood_sugar",
    name: "Balanced Blood Sugar Box",
    shortName: "Blood Sugar",
    forWho: "For anyone watching carbs: type 1, type 2 or prediabetes. Not yet for gestational diabetes.",
    why: "More protein and fiber, less added sugar, still fun to open.",
    categories: [
      { name: "Protein & fiber", count: 5, note: "filling picks with more protein or fiber" },
      { name: "Nuts & seeds", count: 3, note: "whole-food crunch" },
      { name: "Smarter sweets", count: 3, note: "treats with less added sugar" },
      { name: "Sips", count: 2, note: "unsweetened and protein drinks" },
      { name: "Salty snack", count: 1, note: "portioned and easy" },
    ],
    tint: "sage",
    image: "/images/box-blood-sugar.jpg",
    imageAlt: "Keniya Balanced Blood Sugar Box with Packed for You guide",
  },
  {
    slug: "heart",
    name: "Heart Wellness Box",
    shortName: "Heart",
    forWho: "For anyone watching sodium and eating for their heart.",
    why: "Nuts, seeds, whole grains and good treats, with sodium on every label.",
    categories: [
      { name: "Nuts & seeds", count: 4, note: "unsaturated-fat sources in single servings" },
      { name: "Whole grains & fiber", count: 4, note: "crackers, bars and crunch" },
      { name: "Fruit", count: 3, note: "dried, freeze-dried and fruit bars" },
      { name: "Sips", count: 2, note: "unsweetened sparkling and flavored water" },
      { name: "Treat", count: 1, note: "dark chocolate, sodium on the label" },
    ],
    tint: "cream",
    image: "/images/box-heart.jpg",
    imageAlt: "Keniya Heart Wellness Box with Packed for You guide",
  },
];
