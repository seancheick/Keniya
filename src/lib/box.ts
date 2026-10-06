import { DEFAULT_SETTINGS, type BoxSlug } from "@/lib/admin/types";
import type { CategoryCopy } from "@/lib/standards";

export type Box = {
  slug: BoxSlug;
  name: string;
  shortName: string;
  forWho: string;
  why: string;
  /** Shown on the box card itself so it can't be missed before choosing. */
  caution?: string;
  /**
   * Public copy for each recipe category (Comfort, Protein, Savory, Sweet, Hydration). The
   * counts are never written here: publicBoxes() derives them from the live recipe, so the
   * card can't promise "2× tea" when the engine only enforces "2–3 sips". Notes describe what
   * the rules guarantee, never a subtype the optimizer doesn't enforce.
   */
  composition: Partial<Record<string, CategoryCopy>>;
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
/** A box as the public pages show it: copy filled from the live rules, composition counts derived from the live recipe. */
export type PublicBox = Box & { categories: { name: string; count: string; note: string }[] };

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
    composition: {
      Comfort: { name: "Comfort", note: "plain, gentle, low-effort picks for the days when nothing sounds good" },
      Protein: { name: "Protein & staying power", note: "protein picks such as nuts, seeds and nut butters" },
      Sweet: { name: "Sweet treats", note: "fruit and sweet treats, because cravings count" },
      Hydration: { name: "Sips", note: "caffeine-checked drink mixes and water enhancers" },
      Savory: { name: "Salty & savory", note: "for the salty, crunchy craving" },
    },
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
    why: "Every pack under {{blood_sugar.carbsMax}} g total carbs and {{blood_sugar.addedSugarMax}} g added sugar.",
    composition: {
      Savory: { name: "Savory crunch", note: "picks such as chickpeas, seeds, popcorn and crackers, each within the carb limit" },
      Protein: { name: "Protein", note: "picks such as nut butters, nuts, jerky and bars that lead with protein" },
      Sweet: { name: "Smarter sweets", note: "fruit and portioned treats, each with no more than {{blood_sugar.addedSugarMax}} g added sugar" },
      Hydration: { name: "Sips", note: "unsweetened drink mixes, no added sugar" },
      Comfort: { name: "Comfort", note: "gentle, easy picks" },
    },
    tint: "sage",
    image: "/images/box-carb-conscious.jpg",
    imageAlt: "An open Keniya box of 14 blood-sugar-screened snacks: roasted chickpeas, almond butter, almonds, pumpkin seeds, cheese crisps, jerky, a protein bar, fruit bar, popcorn and an electrolyte stick",
  },
  {
    slug: "heart",
    name: "Heart Wellness Box",
    shortName: "Heart",
    forWho: "For high blood pressure, high cholesterol, and anyone eating for their heart.",
    why: "Sodium capped at {{heart.sodiumMax}} mg on every pack; saturated fat and added sugar checked.",
    composition: {
      Savory: { name: "Savory crunch", note: "picks such as nuts, seeds, whole-grain crackers and popcorn, each under {{heart.sodiumMax}} mg sodium" },
      Sweet: { name: "Fruit & treats", note: "fruit such as dried fruit and fruit bars, and at most {{heart.treatMax}} portioned treats" },
      Protein: { name: "Protein", note: "picks such as nut and seed butters and nuts" },
      Hydration: { name: "Sips", note: "unsweetened drink mixes and water enhancers" },
      Comfort: { name: "Comfort", note: "gentle, easy picks" },
    },
    tint: "cream",
    image: "/images/box-heart.jpg",
    imageAlt: "An open Heart Wellness Box of 14 snacks: almond butter, pumpkin seeds, almonds, a heart-healthy nut mix, chickpeas, whole-grain crackers, seed bars, fruit, popcorn, an electrolyte stick and ginger tea",
  },
  {
    slug: "gestational_diabetes",
    name: "Gestational Diabetes Box",
    shortName: "Gestational",
    forWho: "For gestational diabetes: pregnancy screening and the Blood Sugar standard, both.",
    why: "Every snack passes our Pregnancy checks and stays under {{gestational_diabetes.carbsMax}} g carbs and {{gestational_diabetes.addedSugarMax}} g added sugar.",
    composition: {
      Protein: { name: "Protein & staying power", note: "picks such as nuts, seeds and nut butters that lead with protein" },
      Savory: { name: "Savory crunch", note: "portioned savory picks, each within the carb limit" },
      Comfort: { name: "Comfort", note: "plain, gentle picks for rough days" },
      Sweet: { name: "Smarter sweets", note: "unsweetened fruit and at most {{gestational_diabetes.treatMax}} portioned treats" },
      Hydration: { name: "Sips", note: "unsweetened, caffeine-checked drink mixes" },
    },
    tint: "blush",
    imageAlt: "The Gestational Diabetes Box (photography coming)",
  },
  {
    slug: "glp1",
    name: "GLP-1 Companion Box",
    shortName: "GLP-1",
    forWho: "For people on GLP-1 medications, when appetite is small and protein matters.",
    why: "Protein-forward, smaller portions, unsweetened sips and gentle comfort picks.",
    composition: {
      Protein: { name: "Protein-forward", note: "small packs that lead with protein" },
      Savory: { name: "Savory crunch", note: "portioned, lower-carb savory picks" },
      Comfort: { name: "Comfort", note: "gentle, easy picks for queasy days" },
      Sweet: { name: "Small sweets", note: "small, portioned treats" },
      Hydration: { name: "Sips", note: "unsweetened hydration, no added sugar" },
    },
    tint: "sage",
    imageAlt: "The GLP-1 Companion Box (photography coming)",
  },
  {
    slug: "postpartum",
    name: "Postpartum & Nursing Box",
    shortName: "Postpartum",
    forWho: "For the fourth trimester, nursing or not, and the people bringing her food.",
    why: "One-handed, no-prep snacks with the same food-safety checks as Pregnancy.",
    composition: {
      Protein: { name: "Protein & staying power", note: "picks such as nuts, seeds, jerky and nut butters to get through a feed and a nap" },
      Comfort: { name: "Comfort", note: "gentle, easy picks for long nights" },
      Sweet: { name: "Sweet treats", note: "fruit and sweet treats" },
      Savory: { name: "Salty & savory", note: "for the salty, crunchy craving" },
      Hydration: { name: "Sips", note: "caffeine-checked drink mixes and water enhancers, because nursing is thirsty work" },
    },
    tint: "cream",
    imageAlt: "The Postpartum & Nursing Box (photography coming)",
  },
];

// One source for the run size: the admin Settings default (purchasing plans against the same number).
export const boxes: Box[] = raw.map((b) => ({ ...b, founding: DEFAULT_SETTINGS.runSize[b.slug] }));
