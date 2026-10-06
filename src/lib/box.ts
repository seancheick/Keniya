import type { BoxSlug } from "@/lib/admin/types";

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
    image: "/images/box-pregnancy.jpg",
    imageAlt: "An open Pregnancy Comfort Box: ginger chews, crackers, a fruit pouch, almond butter, roasted chickpeas, fruit bars, peppermint tea, an electrolyte stick and popcorn",
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
    image: "/images/box-carb-conscious.jpg",
    imageAlt: "An open Keniya box of 14 carb-conscious snacks: roasted chickpeas, almond butter, almonds, pumpkin seeds, cheese crisps, jerky, a protein bar, fruit bar, popcorn and an electrolyte stick",
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
    image: "/images/box-heart.jpg",
    imageAlt: "An open Heart Wellness Box of 14 snacks: almond butter, pumpkin seeds, almonds, a heart-healthy nut mix, chickpeas, whole-grain crackers, seed bars, fruit, popcorn, an electrolyte stick and ginger tea",
  },
];
