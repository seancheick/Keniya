import type { Box } from "@/lib/box";

/**
 * Copy for the per-box landing pages. Screening lines come from the Box Builder workbook
 * (Pregnancy P1–P9, Blood Sugar pathways v1, Heart roles + enforced box rules). Don't add
 * rules or numbers here that the workbook doesn't have; blood-sugar thresholds are still
 * awaiting clinical confirmation, so they're described without numbers on purpose.
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
        title: "Caffeine checked on every snack",
        body: "We choose caffeine-free wherever we can, apart from the small amount in chocolate.",
      },
      {
        title: "Added sugar, sodium and allergens checked",
        body: "We read them on every label, and each snack ships sealed with its full label so you can too.",
      },
      {
        title: "Ingredients with a known pregnancy concern left out",
        body: "For example licorice root and sage. Some other ingredients we skip as a Keniya preference, not because they're unsafe.",
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
        a: "Not yet. This box uses Keniya Pregnancy Screening only, not our carb-conscious rules. A box that applies both together isn't built and reviewed yet. You can request it through the quiz.",
      },
      {
        q: "Is this box for after the baby arrives?",
        a: "This box is built for pregnancy. We don't make a postpartum box yet, but you can request one through the quiz.",
      },
      {
        q: "Can I send it to someone?",
        a: "Yes. Choose \"It's a gift\", enter their address at checkout and write a message. We print it on a note inside the box.",
      },
    ],
  },
  {
    slug: "blood_sugar",
    path: "/carb-conscious-snack-box",
    redirectFrom: ["/balanced-blood-sugar-snack-box"],
    title: "Carb Conscious Snack Box, Chosen With Diabetes in Mind",
    description:
      "14 carb-conscious snacks for people managing diabetes or prediabetes: protein-forward, fiber-forward, nuts and seeds, portioned treats. $47, free shipping.",
    h1: "Carb-conscious snacks, chosen with diabetes in mind.",
    intro:
      "Built by a founder with a lifetime of label-reading for type 1 diabetes. Each snack has to earn its place through protein, fiber, whole-food fats or a small, portioned treat, and the box balances all four.",
    forWho: [
      "People with type 1 or type 2 diabetes or prediabetes",
      "Anyone keeping an eye on carbs and added sugar",
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
        title: "Every snack qualifies one of four ways",
        body: "Protein-forward, fiber-forward, a whole-food fat or protein pick like nuts and seeds, or a small portioned treat with limited added sugar and carbs.",
      },
      {
        title: "The box balances across all four",
        body: "Several protein and fiber picks, a few whole-food picks and a couple of treats, so it isn't all one kind of snack.",
      },
      {
        title: "Carbs and added sugar checked on every label",
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
        a: "Not yet. Gestational diabetes needs Keniya Pregnancy Screening and our carb-conscious rules applied together, so a snack would have to pass both. That combined screening isn't built and reviewed yet, so please don't order this box for gestational diabetes. You can request it through the quiz.",
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
    title: "Heart-Conscious Snack Box, Sodium Listed",
    description:
      "14 snacks for heart-conscious eating: nuts and seeds, whole grains, fruit and one treat, with sodium checked on each. $47, free shipping, one-time purchase.",
    h1: "Heart-conscious snacking without the label math.",
    intro:
      "“Watch your sodium” shouldn't mean giving up on snacks. This box is built around nuts, seeds and other unsaturated-fat sources, whole grains and fruit, with firm limits on salty picks and treats, and sodium checked on every label.",
    forWho: [
      "Anyone watching sodium or eating for their heart",
      "People following a heart-conscious plan from their doctor",
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
        title: "Every snack plays a role",
        body: "Nuts and seeds, whole grains, fiber, fruit, lower-sodium savory or a portioned treat. No filler.",
      },
      {
        title: "At least 4 nut and seed picks",
        body: "Nuts, seeds and unsaturated-fat sources are the backbone of this box.",
      },
      { title: "At least 3 fiber-forward picks", body: "Whole grains, beans and fruit." },
      {
        title: "No more than 2 higher-sodium picks",
        body: "Anything over 300 mg of sodium per serving counts, and we cap them at two.",
      },
      { title: "No more than 2 treats", body: "Treats stay treats." },
    ],
    faqs: [
      {
        q: "Is every snack low-sodium?",
        a: "Not necessarily. We cap higher-sodium picks, anything over 300 mg per serving, at two per box, and every snack ships with its label so you can see the sodium and plan around it.",
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
];

export const giftLanding = {
  path: "/gifts",
  redirectFrom: ["/pregnancy-gift-box"],
  title: "Snack Box Gifts for Pregnancy, Diabetes & Heart Health",
  description:
    "Send a pregnancy, carb-conscious or heart snack box with your note inside. 14 screened snacks, $47, free shipping to their door, one-time purchase.",
};

export const landingFor = (slug: Box["slug"]) => landings.find((l) => l.slug === slug)!;
