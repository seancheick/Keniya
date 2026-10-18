import { DEFAULT_SETTINGS, type BoxSlug } from "@/lib/admin/types";
import type { CategoryCopy } from "@/lib/standards";

export type Box = {
  /** Request-time sales and approval state; absent means checkout is unavailable. */
  sale?: { available: boolean; clinicianApproved: boolean; priceCents: number; remaining: number; state: "preorder" | "sold_out" | "waitlist" };
  slug: BoxSlug;
  name: string;
  shortName: string;
  forWho: string;
  /** The box's standard in one line (with live numbers): box pages, schema, llms.txt. */
  why: string;
  /** Benefit line for shop cards: what it's like, not the rule behind it. No claims. */
  tagline: string;
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
  /** Tissue colorway: the box's own color on cards, stickers and its page (globals.css [data-colorway]). */
  colorway: "lilac" | "sky" | "coral" | "mint" | "butter" | "rose";
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
/**
 * Availability copy for a box, from its live sale state only. Confident, never invented:
 * open boxes say when they ship, a full first shipment says so, and a box that can't be
 * ordered yet offers the email list instead of a buy button.
 */
export function saleCopy(box: Pick<Box, "sale" | "founding">, shipDate: string): { chip: string; line: string } {
  const ships = shipDate.replace(/, \d{4}$/, "");
  if (box.sale?.available) {
    const low = box.sale.remaining <= 15 ? ` · ${box.sale.remaining} left in the first shipment` : "";
    return { chip: `Ships ${ships}`, line: `Order now: first boxes ship ${ships}${low}` };
  }
  if (box.sale?.state === "sold_out") return { chip: "First shipment full", line: "The first shipment is full. Join the list for the next one." };
  return { chip: "Get first dibs", line: "Leave your email and we'll tell you the moment this box opens for orders." };
}

/** A box as the public pages show it: copy filled from the live rules, composition counts derived from the live recipe. */
export type PublicBox = Box & {
  categories: { name: string; count: string; note: string }[];
  /** Little extras the live recipe promises on top of the snacks; null = not promised. */
  extras: { min: number; max: number } | null;
};

/** "2–4" or "3": how the site writes a promised extras range. */
export const extrasLabel = (e: { min: number; max: number }) => (e.min === e.max ? `${e.min}` : `${e.min}–${e.max}`);

/** The promise every box makes together, for site-wide copy: extras only if all six promise some. */
export function sharedExtras(boxes: Pick<PublicBox, "extras">[]): { min: number; max: number } | null {
  if (!boxes.length || boxes.some((b) => !b.extras || b.extras.min < 1)) return null;
  return { min: Math.min(...boxes.map((b) => b.extras!.min)), max: Math.max(...boxes.map((b) => b.extras!.max)) };
}

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
    tagline: "Gentle picks for rough mornings, real treats for cravings.",
    composition: {
      Comfort: { name: "Comfort", note: "plain, gentle, low-effort picks for the days when nothing sounds good" },
      Protein: { name: "Protein & staying power", note: "protein picks such as nuts, seeds and nut butters" },
      Sweet: { name: "Sweet treats", note: "fruit and sweet treats, because cravings count" },
      Hydration: { name: "Sips", note: "caffeine-checked drink mixes and water enhancers" },
      Savory: { name: "Salty & savory", note: "for the salty, crunchy craving" },
    },
    colorway: "lilac",
    image: "/images/box-pregnancy.jpg",
    imageAlt: "Example Pregnancy Comfort Box: ginger chews, crackers, a fruit pouch, almond butter, roasted chickpeas, fruit bars, peppermint tea, an electrolyte stick and popcorn",
  },
  {
    slug: "blood_sugar",
    name: "Blood Sugar Box",
    shortName: "Blood Sugar",
    forWho: "For type 1, type 2 and prediabetes, and anyone keeping carbs in check.",
    caution: "Pregnant? Choose the Gestational Diabetes box. Not for treating a low blood sugar.",
    why: "Every snack pack at or below {{blood_sugar.carbsMax}} g total carbs and {{blood_sugar.addedSugarMax}} g added sugar.",
    tagline: "Crunchy, satisfying snacks with the carbs already checked.",
    composition: {
      Savory: { name: "Savory crunch", note: "picks such as chickpeas, seeds, popcorn and crackers, each within the carb limit" },
      Protein: { name: "Protein", note: "picks such as nut butters, nuts, jerky and bars that lead with protein" },
      Sweet: { name: "Smarter sweets", note: "fruit and portioned treats, each with no more than {{blood_sugar.addedSugarMax}} g added sugar" },
      Hydration: { name: "Sips", note: "Hydration picks: {{blood_sugar.beverageCarbsMax}} g total carbs or less per stick. 0 g added sugar options preferred." },
      Comfort: { name: "Comfort", note: "gentle, easy picks" },
    },
    colorway: "sky",
    image: "/images/box-blood-sugar.jpg",
    imageAlt: "Example Blood Sugar Box of 14 snacks: roasted chickpeas, almond butter, almonds, pumpkin seeds, cheese crisps, jerky, a protein bar, fruit bar, popcorn and an electrolyte stick",
  },
  {
    slug: "heart",
    name: "Heart Wellness Box",
    shortName: "Heart",
    forWho: "For high blood pressure, high cholesterol, and anyone eating for their heart.",
    why: "Sodium capped at {{heart.sodiumMax}} mg on every pack; saturated fat and added sugar checked.",
    tagline: "Big crunch and real treats, with every pack's sodium capped.",
    composition: {
      Savory: { name: "Savory crunch", note: "picks such as nuts, seeds, whole-grain crackers and popcorn, each with {{heart.sodiumMax}} mg sodium or less" },
      Sweet: { name: "Fruit & treats", note: "fruit such as dried fruit and fruit bars, and at most {{heart.treatMax}} portioned treats" },
      Protein: { name: "Protein", note: "picks such as nut and seed butters and nuts" },
      Hydration: { name: "Sips", note: "{{heart.beverageStandard}} drink mixes and water enhancers" },
      Comfort: { name: "Comfort", note: "gentle, easy picks" },
    },
    colorway: "coral",
    image: "/images/box-heart.jpg",
    imageAlt: "Example Heart Wellness Box of 14 snacks: almond butter, pumpkin seeds, almonds, a heart-healthy nut mix, chickpeas, whole-grain crackers, seed bars, fruit, popcorn, an electrolyte stick and ginger tea",
  },
  {
    slug: "gestational_diabetes",
    name: "Gestational Diabetes Box",
    shortName: "Gestational",
    forWho: "For gestational diabetes: pregnancy screening and the Blood Sugar standard, both.",
    caution: "Not for treating a low blood sugar: use fast-acting glucose as your care team advises.",
    why: "Every snack passes our Pregnancy checks and stays at or below {{gestational_diabetes.carbsMax}} g carbs and {{gestational_diabetes.addedSugarMax}} g added sugar.",
    tagline: "Pregnancy-screened snacks with the carbs already counted.",
    composition: {
      Protein: { name: "Protein & staying power", note: "picks such as nuts, seeds and nut butters that lead with protein" },
      Savory: { name: "Savory crunch", note: "portioned savory picks, each within the carb limit" },
      Comfort: { name: "Comfort", note: "plain, gentle picks for rough days" },
      Sweet: { name: "Smarter sweets", note: "unsweetened fruit and at most {{gestational_diabetes.treatMax}} portioned treats" },
      Hydration: { name: "Sips", note: "Hydration picks: {{gestational_diabetes.beverageCarbsMax}} g total carbs or less per stick, plus full Pregnancy screening. 0 g added sugar options preferred." },
    },
    colorway: "mint",
    image: "/images/box-gestational-diabetes.jpg",
    imageAlt: "Example Gestational Diabetes Box of 14 snacks: pistachios, pumpkin seeds, almonds, edamame, chickpeas, sunflower seeds, broad beans, almond flour crackers, whole grain crackers, popcorn, soy nuts, freeze-dried strawberries, a fruit bar and a seed bar",
  },
  {
    slug: "glp1",
    name: "GLP-1 Companion Box",
    shortName: "GLP-1",
    forWho: "For people on GLP-1 medications, when appetite is small and protein matters.",
    why: "Protein-forward, smaller portions, {{glp1.beverageStandard}} sips and gentle comfort picks.",
    tagline: "Small, protein-forward portions for a smaller appetite.",
    composition: {
      Protein: { name: "Protein-forward", note: "small packs that lead with protein" },
      Savory: { name: "Savory crunch", note: "portioned, lower-carb savory picks" },
      Comfort: { name: "Comfort", note: "gentle, easy picks for queasy days" },
      Sweet: { name: "Small sweets", note: "small, portioned treats" },
      Hydration: { name: "Sips", note: "{{glp1.beverageStandard}} hydration" },
    },
    colorway: "butter",
    image: "/images/box-glp1.jpg",
    imageAlt: "Example GLP-1 Companion Box of 14 snacks: roasted edamame, chickpeas, pumpkin seeds, almonds, pistachios, almond butter, almond flour crackers, popcorn, a mini fruit bar, apple chips, an applesauce pouch, a nut bar, ginger tea and an electrolyte stick",
  },
  {
    slug: "postpartum",
    name: "Postpartum & Nursing Box",
    shortName: "Postpartum",
    forWho: "For the fourth trimester, nursing or not, and the people bringing her food.",
    why: "One-handed, no-prep snacks with the same food-safety checks as Pregnancy.",
    tagline: "One-handed, no-prep snacks for feeds, naps and long nights.",
    composition: {
      Protein: { name: "Protein & staying power", note: "picks such as nuts, seeds, jerky and nut butters to get through a feed and a nap" },
      Comfort: { name: "Comfort", note: "gentle, easy picks for long nights" },
      Sweet: { name: "Sweet treats", note: "fruit and sweet treats" },
      Savory: { name: "Salty & savory", note: "for the salty, crunchy craving" },
      Hydration: { name: "Sips", note: "caffeine-checked drink mixes and water enhancers, because nursing is thirsty work" },
    },
    colorway: "rose",
    image: "/images/box-postpartum.jpg",
    imageAlt: "Example Postpartum & Nursing Box of 14 snacks: granola, pistachios, pumpkin seeds, roasted chickpeas, nut butter packs, seed crackers, dried apricots, freeze-dried strawberries, a fruit pouch, popcorn, a fig bar, a fruit bar and almond flour crackers",
  },
];

// One source for the run size: the admin Settings default (purchasing plans against the same number).
export const boxes: Box[] = raw.map((b) => ({ ...b, founding: DEFAULT_SETTINGS.runSize[b.slug] }));
