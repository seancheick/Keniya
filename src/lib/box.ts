export type Box = {
  slug: "pregnancy_comfort" | "blood_sugar" | "heart";
  name: string;
  shortName: string;
  forWho: string;
  why: string;
  /**
   * This season's 14 selections, from the Box Builder workbook (one line per slot).
   * Generic names on purpose: brands can swap for an equal pick without the page lying.
   */
  items: string[];
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
    forWho: "For pregnancy and the first weeks after, and the people buying for her.",
    why: "Gentle picks for rough mornings, real treats for cravings.",
    items: [
      "Ginger chews",
      "Plain crackers",
      "Ginger tea (caffeine-free)",
      "Applesauce pouch",
      "Roasted chickpeas",
      "Nut butter squeeze pack",
      "Lightly salted nuts",
      "Electrolyte drink mix",
      "Sweet & sour chews",
      "Dark chocolate almonds",
      "Dried mango",
      "Dried apricots",
      "Pumpkin seeds",
      "Sea-salt popcorn",
    ],
    tint: "blush",
    image: "/images/box-pregnancy.jpg",
    imageAlt: "Keniya Pregnancy Comfort Box with Packed for You guide",
  },
  {
    slug: "blood_sugar",
    name: "Balanced Blood Sugar Box",
    shortName: "Blood Sugar",
    forWho: "For anyone watching carbs: type 1, type 2, prediabetes or gestational.",
    why: "More protein and fiber, less added sugar, still fun to open.",
    items: [
      "Roasted chickpeas",
      "Nut butter squeeze pack",
      "Lightly salted nuts",
      "Pumpkin seeds",
      "Dark chocolate almonds",
      "Baked cheese crisps",
      "Jerky stick",
      "Protein bar",
      "Roasted broad beans",
      "Fruit bar",
      "Dark chocolate nut bar",
      "Unsweetened flavored water",
      "Protein shake",
      "Sea-salt popcorn",
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
    items: [
      "Nut butter squeeze pack",
      "Roasted seeds",
      "Almonds or pistachios",
      "Mixed nuts",
      "Roasted chickpeas",
      "Whole-grain crackers",
      "Oat & seed bar",
      "Fruit & nut bar",
      "Fruit bar",
      "Freeze-dried fruit",
      "Sea-salt popcorn",
      "Dark chocolate seed bar",
      "Sparkling water",
      "Unsweetened flavored water",
    ],
    tint: "cream",
    image: "/images/box-heart.jpg",
    imageAlt: "Keniya Heart Wellness Box with Packed for You guide",
  },
];
