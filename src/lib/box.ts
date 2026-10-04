export type Box = {
  slug: "pregnancy_comfort" | "blood_sugar" | "heart";
  name: string;
  shortName: string;
  forWho: string;
  why: string;
  /** Shown on the box card itself so it can't be missed before choosing. */
  caution?: string;
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

/** Boxes we don't make: visitors can request them (never sold). `slug` is the waitlist boxInterest. */
export const requestable = [
  {
    slug: "gestational_diabetes",
    name: "Gestational Diabetes Box",
    note: "Pregnancy and carb-conscious screening together, still being built and reviewed.",
  },
  { slug: "postpartum", name: "Postpartum Recovery Box", note: "Its own screening for the fourth trimester." },
  { slug: "glp1", name: "GLP-1 Companion Box", note: "Small, protein-dense portions for smaller appetites." },
  { slug: "menopause", name: "Menopause Comfort Box", note: "Snacks for the changes menopause brings." },
] as const;

/** Waitlist boxInterest for the general "new boxes and shipping" list (no box reserved). */
export const UPDATES_INTEREST = "updates";

/**
 * Sweet-or-salty leaning. Asked in the quiz and at Stripe checkout (the checkout answer is
 * what reaches the order); it steers the pick among snacks the box's screening allows.
 */
export const cravings = [
  { value: "sweet", label: "Sweet" },
  { value: "salty", label: "Salty & crunchy" },
  { value: "mix", label: "A mix of both" },
] as const;
export type Craving = (typeof cravings)[number]["value"];

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
    image: "/images/box-pregnancy-slots.jpg",
    imageAlt: "Pregnancy Comfort Box: 14 snack slots by category (4 comfort, 4 protein, 3 sweet, 2 sips, 1 salty)",
  },
  {
    slug: "blood_sugar",
    name: "Carb Conscious Box",
    shortName: "Carb Conscious",
    forWho: "For anyone watching carbs, including type 1, type 2 and prediabetes.",
    caution: "Not yet for gestational diabetes.",
    why: "Snacks chosen with carbs, added sugar and portion size in mind.",
    categories: [
      { name: "Protein & fiber", count: 6, note: "filling picks with more protein or fiber" },
      { name: "Nuts & seeds", count: 3, note: "whole-food crunch" },
      { name: "Smarter sweets", count: 3, note: "treats with less added sugar" },
      { name: "Sips", count: 1, note: "a sugar-free electrolyte drink mix" },
      { name: "Salty snack", count: 1, note: "portioned and easy" },
    ],
    tint: "sage",
    image: "/images/box-blood-sugar-slots.jpg",
    imageAlt: "Carb Conscious Box: 14 snack slots by category (6 protein and fiber, 3 nuts and seeds, 3 smarter sweets, 1 sip, 1 salty)",
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
      { name: "Sips", count: 2, note: "a sugar-free electrolyte mix and caffeine-free tea" },
      { name: "Treat", count: 1, note: "dark chocolate, sodium on the label" },
    ],
    tint: "cream",
    image: "/images/box-heart-slots.jpg",
    imageAlt: "Heart Wellness Box: 14 snack slots by category (4 nuts and seeds, 4 whole grains and fiber, 3 fruit, 2 sips, 1 treat)",
  },
];
