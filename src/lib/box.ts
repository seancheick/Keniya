import { DEFAULT_SETTINGS, type BoxSlug } from "@/lib/admin/types";

export type Box = {
  slug: BoxSlug;
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
  /** Founding-run size for this box (admin `runSize` default); shown on the card and in order emails. */
  founding: number;
  tint: "blush" | "sage" | "cream";
  /** Product photography under /public; absent until the box has been shot. */
  image?: string;
  imageAlt: string;
};

/** Boxes we don't make: visitors can request them (never sold). `slug` is the waitlist boxInterest. */
export const requestable = [
  { slug: "menopause", name: "Menopause Comfort Box", note: "Snacks for the changes menopause brings." },
  { slug: "kidney", name: "Kidney-Conscious Box", note: "Potassium, phosphorus and sodium screened together." },
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

const raw: Omit<Box, "founding">[] = [
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
    imageAlt: "An open Pregnancy Comfort Box: ginger chews, crackers, a fruit pouch, almond butter, roasted chickpeas, fruit bars, peppermint tea, an electrolyte stick and popcorn",
  },
  {
    slug: "blood_sugar",
    name: "Blood Sugar Box",
    shortName: "Blood Sugar",
    forWho: "For type 1, type 2 and prediabetes, and anyone keeping carbs in check.",
    caution: "Pregnant? Choose the Gestational Diabetes box.",
    why: "Every pack under 20 g total carbs and 5 g added sugar.",
    categories: [
      { name: "Protein & fiber", count: 6, note: "filling picks with more protein or fiber" },
      { name: "Nuts & seeds", count: 3, note: "whole-food crunch" },
      { name: "Smarter sweets", count: 3, note: "treats with less added sugar" },
      { name: "Sips", count: 1, note: "a sugar-free electrolyte drink mix" },
      { name: "Salty snack", count: 1, note: "portioned and easy" },
    ],
    tint: "sage",
    image: "/images/box-carb-conscious.jpg",
    imageAlt: "An open Keniya box of 14 blood-sugar-screened snacks: roasted chickpeas, almond butter, almonds, pumpkin seeds, cheese crisps, jerky, a protein bar, fruit bar, popcorn and an electrolyte stick",
  },
  {
    slug: "heart",
    name: "Heart Wellness Box",
    shortName: "Heart",
    forWho: "For high blood pressure, high cholesterol, and anyone eating for their heart.",
    why: "Sodium capped at 140 mg on every pack; saturated fat and added sugar checked.",
    categories: [
      { name: "Nuts & seeds", count: 4, note: "unsaturated-fat sources in single servings" },
      { name: "Whole grains & fiber", count: 4, note: "crackers, bars and crunch" },
      { name: "Fruit", count: 3, note: "dried, freeze-dried and fruit bars" },
      { name: "Sips", count: 2, note: "a sugar-free electrolyte mix and caffeine-free tea" },
      { name: "Treat", count: 1, note: "dark chocolate, sodium on the label" },
    ],
    tint: "cream",
    image: "/images/box-heart.jpg",
    imageAlt: "An open Heart Wellness Box of 14 snacks: almond butter, pumpkin seeds, almonds, a heart-healthy nut mix, chickpeas, whole-grain crackers, seed bars, fruit, popcorn, an electrolyte stick and ginger tea",
  },
  {
    slug: "gestational_diabetes",
    name: "Gestational Diabetes Box",
    shortName: "Gestational",
    forWho: "For gestational diabetes: pregnancy screening and the Blood Sugar standard, both.",
    why: "Every snack passes our Pregnancy checks and stays under 20 g carbs and 5 g added sugar.",
    categories: [
      { name: "Protein & fiber", count: 5, note: "filling picks that lead with protein or fiber" },
      { name: "Comfort", count: 3, note: "gentle picks for rough days" },
      { name: "Smarter sweets", count: 2, note: "portioned treats with less added sugar" },
      { name: "Sips", count: 2, note: "caffeine-free tea and a sugar-free hydration mix" },
      { name: "Salty snacks", count: 2, note: "portioned savory crunch" },
    ],
    tint: "blush",
    imageAlt: "The Gestational Diabetes Box (photography coming)",
  },
  {
    slug: "glp1",
    name: "GLP-1 Companion Box",
    shortName: "GLP-1",
    forWho: "For people on GLP-1 medications, when appetite is small and protein matters.",
    why: "Protein-forward, smaller portions, hydration, and comfort picks for queasy days.",
    categories: [
      { name: "Protein-forward", count: 6, note: "small packs that lead with protein" },
      { name: "Savory crunch", count: 3, note: "portioned, lower-carb savory picks" },
      { name: "Comfort", count: 2, note: "ginger and peppermint for queasy days" },
      { name: "Sips", count: 2, note: "sugar-free hydration and caffeine-free tea" },
      { name: "Small sweet", count: 1, note: "one portioned treat" },
    ],
    tint: "sage",
    imageAlt: "The GLP-1 Companion Box (photography coming)",
  },
  {
    slug: "postpartum",
    name: "Postpartum & Nursing Box",
    shortName: "Postpartum",
    forWho: "For the fourth trimester, nursing or not, and the people bringing her food.",
    why: "One-handed, no-prep snacks: the same food-safety checks as Pregnancy, more hydration.",
    categories: [
      { name: "Protein & staying power", count: 4, note: "nuts, seeds, jerky and savory crunch" },
      { name: "Comfort", count: 3, note: "gentle, easy picks for long nights" },
      { name: "Sweet treats", count: 3, note: "fruit and chocolate" },
      { name: "Sips", count: 3, note: "hydration mix and tea, because nursing is thirsty work" },
      { name: "Salty snack", count: 1, note: "for the salty craving" },
    ],
    tint: "cream",
    imageAlt: "The Postpartum & Nursing Box (photography coming)",
  },
];

// One source for the run size: the admin Settings default (purchasing plans against the same number).
export const boxes: Box[] = raw.map((b) => ({ ...b, founding: DEFAULT_SETTINGS.runSize[b.slug] }));
