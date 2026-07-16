export type BoxItem = {
  name: string;
  category: "Comfort" | "Protein" | "Hydration" | "Sweet" | "Savory";
  why: string;
};

// Pregnancy Comfort sample dozen: 3 comfort / 3 protein / 2 hydration / 2 sweet / 2 savory.
// Generic item names on purpose — no third-party brand names on-site.
// Why-copy rule: selection rationale + consumer experience, never physiological claims.
export const pregnancyBoxItems: BoxItem[] = [
  {
    name: "Ginger chews",
    category: "Comfort",
    why: "So many women keep ginger close through the early weeks — warm, familiar, and easy to keep on the nightstand.",
  },
  {
    name: "Almond-flour crackers",
    category: "Comfort",
    why: "A plain, steady bite for the moments when nothing else sounds doable.",
  },
  {
    name: "Applesauce pouch",
    category: "Comfort",
    why: "Cool, soft, and zero-effort — chosen pasteurized and unsweetened, for days when solid food feels ambitious.",
  },
  {
    name: "Protein bar",
    category: "Protein",
    why: "Picked SKU by SKU for short ingredient lists and real protein — the grams go on its card.",
  },
  {
    name: "Almond butter packet",
    category: "Protein",
    why: "One-handed and genuinely useful when appetite comes in waves. Protein noted on the card.",
  },
  {
    name: "Roasted chickpeas",
    category: "Protein",
    why: "Crunchy, salty, and protein-smart — the craving and the fuel in one bag.",
  },
  {
    name: "Electrolyte packets",
    category: "Hydration",
    why: "For the days plain water is a hard sell. Always caffeine-free, sodium disclosed on the card.",
  },
  {
    name: "Ginger tea",
    category: "Hydration",
    why: "A warm, caffeine-free cup many people find comforting when nothing else sounds good. Simple-ingredient formulas only.",
  },
  {
    name: "Freeze-dried strawberries",
    category: "Sweet",
    why: "Bright, light, and airy — fruit that doesn't ask anything of you.",
  },
  {
    name: "Dark chocolate almonds",
    category: "Sweet",
    why: "Because this box is about comfort, not restriction. Caffeine and allergens noted on the card.",
  },
  {
    name: "Sea-salt popcorn",
    category: "Savory",
    why: "The classic salty craving, aired-out and light.",
  },
  {
    name: "Mini pretzels",
    category: "Savory",
    why: "Dry, salty, dependable — the bite so many keep close through the early weeks.",
  },
];

export type Box = {
  slug: "pregnancy_comfort" | "blood_sugar" | "heart";
  name: string;
  shortName: string;
  forWho: string;
  why: string;
  principles: string[];
  sample: string[];
  tint: "blush" | "sage" | "cream";
};

export const boxes: Box[] = [
  {
    slug: "pregnancy_comfort",
    name: "Pregnancy Comfort Box",
    shortName: "Pregnancy Comfort",
    forWho: "For pregnancy, first weeks through postpartum — and the partners buying for them.",
    why: "Born when our own snack runs turned into research projects. Gentle options for rough mornings, real treats for real cravings — chosen so she doesn't have to do the reading.",
    principles: [
      "Gentle, low-effort options",
      "Protein-smart picks",
      "Caffeine noted on every card",
      "Hydration always included",
    ],
    sample: [
      "Ginger chews",
      "Almond-flour crackers",
      "Electrolyte packets",
      "Freeze-dried strawberries",
      "Dark chocolate almonds",
    ],
    tint: "blush",
  },
  {
    slug: "blood_sugar",
    name: "Balanced Blood Sugar Box",
    shortName: "Balanced Blood Sugar",
    forWho: "For anyone minding carbohydrate intake — type 1, type 2, prediabetes, gestational.",
    why: "Built on a founder's lifetime of label-reading with type 1 diabetes. Protein-forward, fiber-rich, lower added sugar — and still genuinely fun to open.",
    principles: [
      "Protein + fiber forward",
      "Lower added sugar",
      "Added sugars on every card",
      "Portion-clear packs",
    ],
    sample: [
      "Roasted chickpeas",
      "Cheese crisps",
      "Unsalted almonds",
      "Lower-sugar dark chocolate",
      "Sea-salt popcorn",
    ],
    tint: "sage",
  },
  {
    slug: "heart",
    name: "Heart Wellness Box",
    shortName: "Heart Wellness",
    forWho: "For sodium-aware, heart-conscious snacking — and the households eating alongside.",
    why: "Because “watch your sodium” shouldn't mean joyless snacking. Good fats, whole grains, and better sweets that hold their own.",
    principles: [
      "Sodium disclosed per item",
      "Good fats + whole grains",
      "70%+ dark chocolate treats",
      "Caffeine-free teas",
    ],
    sample: [
      "Unsalted pistachios",
      "Roasted pumpkin seeds",
      "Whole-grain crackers",
      "Air-popped popcorn",
      "Dried apricots",
    ],
    tint: "cream",
  },
];
