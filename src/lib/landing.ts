import type { Box } from "@/lib/box";

/**
 * Copy for the per-box landing pages. The numeric standards are rendered from
 * src/lib/standards.ts (same defaults the engine enforces); the screening lines here are the
 * plain-language story around them. Don't add a number here that the rules don't enforce.
 */
export type BoxLanding = {
  slug: Box["slug"];
  path: string;
  /** Old URLs that permanently redirect here (next.config.ts reads these). */
  redirectFrom?: string[];
  title: string;
  description: string;
  h1: string;
  intro: string;
  forWho: string[];
  /** Keyed by Box.categories[].name — the longer "why this category" line. */
  categoryWhy: Record<string, string>;
  screening: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
};

export const landings: BoxLanding[] = [
  {
    slug: "pregnancy_comfort",
    path: "/pregnancy-snack-box",
    title: "Pregnancy Snack Box: 14 Label-Checked Snacks",
    description:
      "14 snacks screened with Keniya Pregnancy Screening: fully cooked, caffeine checked, excluded ingredients left out. $47, free shipping, no subscription.",
    h1: "A pregnancy snack box that already read the labels.",
    intro:
      "Rough mornings, sudden cravings and a lot of label-reading. Every snack has to pass Keniya Pregnancy Screening before it can go in, so you can just open it and eat.",
    forWho: [
      "Anyone who is pregnant, first trimester to third",
      "Partners, parents and friends who want to send something useful",
      "People tired of checking caffeine, cooking and ingredients on every snack",
    ],
    categoryWhy: {
      Comfort: "Plain, gentle, low-effort picks for the days when nothing sounds good.",
      "Protein & staying power": "Nuts, seeds and savory crunch that keep you going between meals.",
      "Sweet treats": "Fruit and chocolate. This box is about comfort, not restriction.",
      Sips: "Caffeine-free tea and a hydration mix for when plain water is a hard sell.",
      "Salty snack": "One classic salty, crunchy pick for that specific craving.",
    },
    screening: [
      { title: "Fully cooked or pasteurized", body: "No raw or unpasteurized ingredients." },
      {
        title: "Foods we exclude from the Pregnancy box",
        body: "No raw dairy, eggs or fish, deli meat, high-mercury fish, raw sprouts, alcohol or liver.",
      },
      {
        title: "Caffeine known and limited on every snack",
        body: "We choose caffeine-free wherever we can; the small amount in chocolate is allowed, energy products never are. A snack with unknown caffeine doesn't qualify.",
      },
      {
        title: "Added sugar, sodium and allergens checked",
        body: "We read them on every label, and each snack ships sealed with its full label so you can too.",
      },
      {
        title: "Herbs and botanicals we leave out during pregnancy",
        body: "We skip concentrated herbs and botanicals when pregnancy safety is uncertain, for example licorice root and sage. Some other ingredients we skip as a Keniya preference, not because they're unsafe.",
      },
      {
        title: "Honest counting and fresh dates",
        body: "A pack of chews counts as one snack, and every date leaves room for shipping and shelf time.",
      },
    ],
    faqs: [
      {
        q: "Is every snack safe during pregnancy?",
        a: "Every snack has to pass Keniya Pregnancy Screening, and the lineup gets a clinical review. That isn't personal medical advice, so if your doctor has told you to avoid something specific, check each label or ask us before you order.",
      },
      {
        q: "Does anything have caffeine?",
        a: "We check caffeine for every snack and choose caffeine-free wherever we can. Chocolate can have a small amount, so if you're keeping caffeine very low, save the chocolate for later.",
      },
      {
        q: "I have gestational diabetes. Is this box right for me?",
        a: "Choose the Gestational Diabetes Box instead. It uses this same pregnancy screening and adds our Blood Sugar standard, so every snack has to pass both.",
      },
      {
        q: "Is this box for after the baby arrives?",
        a: "This box is built for pregnancy. For the fourth trimester, the Postpartum & Nursing Box keeps the same food-safety checks with more hydration and one-handed snacks.",
      },
      {
        q: "Can I send it to someone?",
        a: "Yes. Choose \"It's a gift\", enter their address at checkout and write a message. We print it on a note inside the box.",
      },
    ],
  },
  {
    slug: "blood_sugar",
    path: "/blood-sugar-snack-box",
    redirectFrom: ["/balanced-blood-sugar-snack-box", "/carb-conscious-snack-box"],
    title: "Blood Sugar Snack Box: Under {{blood_sugar.carbsMax}} g Carbs Per Pack",
    description:
      "14 snacks for type 1, type 2 and prediabetes, every pack under {{blood_sugar.carbsMax}} g total carbs and {{blood_sugar.addedSugarMax}} g added sugar: protein-forward, fiber-forward, nuts and seeds, portioned treats. $47, free shipping.",
    h1: "Snacks for blood sugar, with the carb count already checked.",
    intro:
      "Built by a founder with a lifetime of label-reading for type 1 diabetes. Every pack stays under {{blood_sugar.carbsMax}} g total carbohydrate and {{blood_sugar.addedSugarMax}} g added sugar, then has to earn its place through protein, fiber, whole-food fats or a small, portioned treat.",
    forWho: [
      "People with type 1 or type 2 diabetes or prediabetes",
      "Anyone keeping carbs and added sugar in check",
      "Family and friends who want to send snacks that fit",
    ],
    categoryWhy: {
      "Protein & fiber": "The core of the box: filling picks that lead with protein or fiber.",
      "Nuts & seeds": "Whole-food fats and protein with nothing sugary added.",
      "Smarter sweets": "Real treats, portioned, with less added sugar.",
      Sips: "A sugar-free electrolyte drink mix instead of a sugary drink.",
      "Salty snack": "A portioned savory crunch.",
    },
    screening: [
      {
        title: "Under {{blood_sugar.carbsMax}} g total carbs and {{blood_sugar.addedSugarMax}} g added sugar, every pack",
        body: "Total carbohydrate, never \"net carbs\". A snack over either number can't go in, whatever else it has going for it.",
      },
      {
        title: "Then it qualifies one of four ways",
        body: "Protein-forward, fiber-forward, a whole-food fat or protein pick like nuts and seeds, or a small portioned treat.",
      },
      {
        title: "The box balances across all four",
        body: "Several protein and fiber picks, a few whole-food picks and at most {{blood_sugar.treatMax}} treat-only picks, so it isn't all one kind of snack.",
      },
      {
        title: "The numbers ship with the snack",
        body: "Each snack ships sealed with its nutrition label, so the carbs and added sugar are right there when you count.",
      },
      {
        title: "Portion-clear packs",
        body: "Single servings, so the label on the pack is the amount you're eating.",
      },
    ],
    faqs: [
      {
        q: "Will these snacks keep my blood sugar steady?",
        a: "We can't promise that. Everyone responds differently. We pick snacks with more protein or fiber and less added sugar, and list the numbers so you can decide what fits your plan.",
      },
      {
        q: "Is it sugar-free?",
        a: "No. Some snacks, like the treats and fruit bars, contain sugar. They're portioned, and the added sugar is on every label.",
      },
      {
        q: "Is there a box for gestational diabetes?",
        a: "Yes, the Gestational Diabetes Box. This box isn't checked against our pregnancy screening, so if you're pregnant, choose that one: every snack in it passes both the pregnancy checks and this box's carb and sugar standard.",
      },
      {
        q: "Are there artificial sweeteners?",
        a: "Some may. Every snack ships sealed in its original packaging, so the full ingredient list is right on it.",
      },
    ],
  },
  {
    slug: "heart",
    path: "/heart-healthy-snack-box",
    title: "Heart & Blood Pressure Snack Box: {{heart.sodiumMax}} mg Sodium Max",
    description:
      "14 snacks for high blood pressure, cholesterol and heart-conscious eating, every pack under {{heart.sodiumMax}} mg sodium: nuts and seeds, whole grains, fruit and one treat. $47, free shipping.",
    h1: "Heart and blood-pressure snacking without the label math.",
    intro:
      "“Watch your sodium” shouldn't mean giving up on snacks. Every pack in this box stays under {{heart.sodiumMax}} mg sodium and {{heart.satFatMax}} g saturated fat, built around nuts, seeds, whole grains and fruit, with one treat that has to pass the same checks.",
    forWho: [
      "People with high blood pressure or high cholesterol",
      "Anyone following a heart-conscious or lower-sodium plan from their doctor",
      "Households who want snacks everyone can share",
    ],
    categoryWhy: {
      "Nuts & seeds": "Single servings of nuts, seeds and other unsaturated-fat sources.",
      "Whole grains & fiber": "Crackers, bars and crunch built on whole grains and fiber.",
      Fruit: "Dried and freeze-dried fruit and fruit bars.",
      Sips: "A sugar-free electrolyte drink mix and a caffeine-free tea. Light to ship, easy to carry.",
      Treat: "One dark-chocolate treat, sodium checked like everything else.",
    },
    screening: [
      {
        title: "Under {{heart.sodiumMax}} mg sodium, every pack",
        body: "The FDA's \"low sodium\" line and the American Heart Association's snack guidance. A snack over it can't go in, and the exact number is on its label.",
      },
      {
        title: "Saturated fat under {{heart.satFatMax}} g",
        body: "Nuts and seeds get up to {{heart.satFatNutMax}} g when the fat is their own; a snack with added palm or coconut oil doesn't get that allowance.",
      },
      {
        title: "Added sugar under {{heart.addedSugarMax}} g on core picks",
        body: "The one dark-chocolate treat may have up to {{heart.treatAddedSugarMax}} g, and it's capped at that.",
      },
      {
        title: "Every snack plays a role",
        body: "At least 4 nut and seed picks, at least 3 fiber-forward picks, whole grains and fruit. No filler.",
      },
    ],
    faqs: [
      {
        q: "Is every snack low-sodium?",
        a: "Yes. Every pack is under {{heart.sodiumMax}} mg sodium, which is the FDA's definition of \"low sodium\" per serving, and every snack ships with its label so you can see the exact number.",
      },
      {
        q: "Is this box for high blood pressure?",
        a: "It's screened for it: the {{heart.sodiumMax}} mg sodium cap on every pack is the line the American Heart Association suggests for snacks. We pick snacks that fit lower-sodium eating; your doctor's plan comes first, and no snack lowers blood pressure.",
      },
      {
        q: "Will this lower my blood pressure or cholesterol?",
        a: "No snack box can promise that, and we don't. We pick snacks that fit heart-conscious eating and show you the label details. Your doctor's plan comes first.",
      },
      {
        q: "Does it have potassium-rich foods?",
        a: "Fruit and nuts naturally have potassium. If you've been told to limit potassium, for example because of kidney disease or a medication, check each label or talk to your doctor first.",
      },
      {
        q: "Can the whole family eat it?",
        a: "Yes. These are everyday packaged snacks, so they're easy to share.",
      },
    ],
  },
  {
    slug: "gestational_diabetes",
    path: "/gestational-diabetes-snack-box",
    title: "Gestational Diabetes Snack Box: Pregnancy-Screened, Under {{gestational_diabetes.carbsMax}} g Carbs",
    description:
      "14 snacks that pass both Keniya Pregnancy Screening and the Blood Sugar standard: under {{gestational_diabetes.carbsMax}} g carbs and {{gestational_diabetes.addedSugarMax}} g added sugar per pack, fully cooked, caffeine limited. $47, free shipping.",
    h1: "Snacks that pass the pregnancy checks and the carb count.",
    intro:
      "Gestational diabetes means two sets of rules at once. Every snack here has to pass Keniya Pregnancy Screening and stay under {{gestational_diabetes.carbsMax}} g total carbohydrate and {{gestational_diabetes.addedSugarMax}} g added sugar per pack, then earn its place through protein, fiber or whole-food fats.",
    forWho: [
      "Anyone pregnant with gestational diabetes",
      "Anyone pregnant who is keeping carbs in check on their care team's advice",
      "Partners and family who want to send snacks that fit",
    ],
    categoryWhy: {
      "Protein & fiber": "The core of the box: filling picks that lead with protein or fiber.",
      Comfort: "Plain, gentle picks for the days when nothing sounds good.",
      "Smarter sweets": "Real treats, portioned, with less added sugar.",
      Sips: "Caffeine-free tea and a sugar-free hydration mix.",
      "Salty snacks": "Portioned savory crunch for that craving.",
    },
    screening: [
      {
        title: "Keniya Pregnancy Screening first",
        body: "Fully cooked or pasteurized, no pregnancy no-gos, caffeine known and limited, herbs and botanicals left out when safety is uncertain.",
      },
      {
        title: "Then the Blood Sugar standard",
        body: "Under {{gestational_diabetes.carbsMax}} g total carbohydrate and {{gestational_diabetes.addedSugarMax}} g added sugar per pack. Total carbs, never \"net carbs\".",
      },
      {
        title: "Both, or it doesn't go in",
        body: "A snack that passes one screening and not the other isn't eligible for this box.",
      },
      {
        title: "A screened snack assortment, not a diet",
        body: "Nutrition for gestational diabetes is individualized, with a daily carbohydrate floor. This box fits around your care team's plan; it doesn't replace it.",
      },
    ],
    faqs: [
      {
        q: "Is this everything I need to manage gestational diabetes?",
        a: "No. It's a box of snacks that pass both our pregnancy and blood-sugar screening. Your dietitian or doctor sets your plan, including how much carbohydrate you need in a day, and these snacks are built to fit inside that.",
      },
      {
        q: "How is it different from the Blood Sugar Box?",
        a: "Same carb and added-sugar limits, plus the full pregnancy screening on every snack. The Blood Sugar Box isn't checked against the pregnancy rules.",
      },
      {
        q: "Will these keep my glucose in range?",
        a: "We can't promise that, and we don't. Everyone responds differently. We list the numbers on every label so you can decide what fits.",
      },
    ],
  },
  {
    slug: "glp1",
    path: "/glp1-snack-box",
    title: "GLP-1 Companion Snack Box: Protein-Forward, Small Portions",
    description:
      "14 snacks for people on GLP-1 medications: protein-forward, under {{glp1.carbsMax}} g carbs and {{glp1.addedSugarMax}} g added sugar per pack, small portions, hydration and ginger for queasy days. $47, free shipping.",
    h1: "Small appetite, protein first: a snack box for GLP-1 days.",
    intro:
      "When you're eating less, every bite has to count. Every snack here leads with protein, fiber or whole-food fats, stays under {{glp1.carbsMax}} g carbs and {{glp1.addedSugarMax}} g added sugar, and the box carries hydration and ginger or peppermint comfort picks for the queasy days.",
    forWho: [
      "People taking a GLP-1 medication for weight or blood sugar",
      "Anyone eating smaller meals who wants protein in every snack",
      "Family and friends who want to send something that actually helps",
    ],
    categoryWhy: {
      "Protein-forward": "Small packs that lead with protein, to help keep muscle while eating less.",
      "Savory crunch": "Portioned, lower-carb savory picks.",
      Comfort: "Ginger and peppermint, the two most-cited comforts for nausea.",
      Sips: "Sugar-free hydration and caffeine-free tea, because fluids matter more when you eat less.",
      "Small sweet": "One portioned treat, because a treat is still allowed.",
    },
    screening: [
      {
        title: "Protein or fiber in most picks",
        body: "2025 joint guidance for GLP-1 nutrition emphasizes adequate protein and nutrient-dense foods. Most of the box leads with protein or fiber.",
      },
      {
        title: "Under {{glp1.carbsMax}} g carbs and {{glp1.addedSugarMax}} g added sugar per pack",
        body: "Small portions that don't spend your appetite on sugar.",
      },
      {
        title: "Easy on the stomach",
        body: "Smaller packs, no greasy or heavy items, and ginger or peppermint comfort picks.",
      },
      {
        title: "Hydration built in",
        body: "Fluids are easy to forget when you're not hungry, so the box carries a sugar-free electrolyte mix and tea.",
      },
    ],
    faqs: [
      {
        q: "Which medications is this for?",
        a: "Any GLP-1 or GLP-1/GIP medication. We don't name brands, and this isn't medical advice: your prescriber's guidance on eating comes first.",
      },
      {
        q: "Will it help with nausea?",
        a: "We can't promise that. Ginger and peppermint are the comfort picks most often suggested for queasiness, so the box includes them, and everything is portioned small.",
      },
      {
        q: "Is it low-calorie?",
        a: "The packs are small by design, but we don't sell it as a calorie-controlled diet. Every snack ships sealed with its full label.",
      },
    ],
  },
  {
    slug: "postpartum",
    path: "/postpartum-snack-box",
    title: "Postpartum & Nursing Snack Box: One-Handed, No-Prep",
    description:
      "14 snacks for the fourth trimester: the same food-safety checks as our Pregnancy box, caffeine limited, more hydration, everything one-handed. $47, free shipping.",
    h1: "The fourth trimester, fed one-handed.",
    intro:
      "Someone in your house is eating at 3 a.m. with one hand. Every snack here passes the same food-safety checks as our Pregnancy box, keeps caffeine known and limited, and the box leans into hydration and protein because nursing is hungry, thirsty work.",
    forWho: [
      "Anyone in the first months after birth, nursing or not",
      "Partners, parents and friends bringing food to a new parent",
      "Anyone who wants snacks that need no plate, no prep and no second hand",
    ],
    categoryWhy: {
      "Protein & staying power": "Nuts, seeds, jerky and savory crunch to get through a feed and a nap.",
      Comfort: "Gentle, easy picks for long nights.",
      "Sweet treats": "Fruit and chocolate. Recovery is not the time for restriction.",
      Sips: "A hydration mix and tea, because nursing is thirsty work.",
      "Salty snack": "One classic salty, crunchy pick.",
    },
    screening: [
      {
        title: "The Pregnancy food-safety checks, kept",
        body: "Fully cooked or pasteurized, no raw or unpasteurized ingredients, allergens identified.",
      },
      {
        title: "Caffeine known and limited",
        body: "Nursing allows more caffeine than pregnancy, so the limit is looser, but every pack's caffeine is known and tea stays caffeine-free.",
      },
      {
        title: "Hydration and protein first",
        body: "More sips and protein picks than the Pregnancy box, for the appetite and thirst that come with nursing.",
      },
      {
        title: "One-handed, no prep",
        body: "Everything opens and eats with one hand. No spoons, no plates.",
      },
    ],
    faqs: [
      {
        q: "I'm not nursing. Is it still for me?",
        a: "Yes. The food-safety checks and the one-handed, no-prep rule are about recovery and a newborn in the house, not only nursing.",
      },
      {
        q: "How does caffeine work for nursing?",
        a: "Guidance from ACOG and the CDC puts moderate caffeine while nursing around 200 to 300 mg a day. Our per-pack limit stays well under that, every pack's caffeine is known, and the tea is caffeine-free. Ask your pediatrician if your baby was born early.",
      },
      {
        q: "How is it different from the Pregnancy box?",
        a: "Same food-safety checks, a looser caffeine limit, and a recipe with more hydration and protein. If you're still pregnant, choose the Pregnancy Comfort Box.",
      },
    ],
  },
];

export const giftLanding = {
  path: "/gifts",
  redirectFrom: ["/pregnancy-gift-box"],
  title: "Snack Box Gifts for Pregnancy, Postpartum, Diabetes & Heart Health",
  description:
    "Send a pregnancy, postpartum, blood sugar, gestational diabetes, GLP-1 or heart snack box with your note inside. 14 screened snacks, $47, free shipping, one-time purchase.",
};

export const landingFor = (slug: Box["slug"]) => landings.find((l) => l.slug === slug)!;
