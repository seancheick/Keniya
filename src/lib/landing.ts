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
  title: string;
  description: string;
  eyebrow: string;
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
      "14 real snacks checked against a written pregnancy checklist: fully cooked, caffeine noted, nothing on the avoid list. $47, free shipping, no subscription.",
    eyebrow: "Pregnancy Comfort Box",
    h1: "A pregnancy snack box that already read the labels.",
    intro:
      "Rough mornings, sudden cravings and a lot of label-reading. Every snack in this box has been checked against our pregnancy checklist before it goes in, so you can just open it and eat.",
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
        title: "Nothing on the pregnancy avoid list",
        body: "No raw dairy, eggs or fish, deli meat, high-mercury fish, raw sprouts, alcohol or liver.",
      },
      {
        title: "Caffeine checked per serving",
        body: "We note caffeine for every snack and choose caffeine-free wherever we can, apart from the small amount in chocolate.",
      },
      {
        title: "Added sugar, sodium and allergens noted",
        body: "Your Packed for You card lists them for each snack, straight from the label.",
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
        a: "We check every snack against our written pregnancy checklist, and the lineup gets a clinical review. That isn't personal medical advice, so if your doctor has told you to avoid something specific, check each label or ask us before you order.",
      },
      {
        q: "Does anything have caffeine?",
        a: "We choose caffeine-free snacks wherever we can. Chocolate can have a small amount, and your card lists the caffeine for every snack.",
      },
      {
        q: "Is this box for after the baby arrives?",
        a: "This box is built for pregnancy. A postpartum box is in development, and you can join its waitlist through the quiz.",
      },
      {
        q: "Can I send it to someone?",
        a: "Yes. Choose \"It's a gift\", enter their address at checkout and write a message. We print it on their card.",
      },
    ],
  },
  {
    slug: "blood_sugar",
    path: "/balanced-blood-sugar-snack-box",
    title: "Balanced Blood Sugar Snack Box: Protein & Fiber",
    description:
      "14 snacks for people watching carbs and added sugar: protein-forward, fiber-forward, nuts and seeds, portioned treats. Added sugar listed. $47, free shipping.",
    eyebrow: "Balanced Blood Sugar Box",
    h1: "Snacks for when you're watching carbs and added sugar.",
    intro:
      "Built by a founder with a lifetime of label-reading for type 1 diabetes. Each snack has to earn its place through protein, fiber, whole-food fats or a small, portioned treat, and the box balances all four.",
    forWho: [
      "People with type 1 or type 2 diabetes, prediabetes or gestational diabetes",
      "Anyone keeping an eye on carbs and added sugar",
      "Family and friends who want to send snacks that fit",
    ],
    categoryWhy: {
      "Protein & fiber": "The core of the box: filling picks that lead with protein or fiber.",
      "Nuts & seeds": "Whole-food fats and protein with nothing sugary added.",
      "Smarter sweets": "Real treats, portioned, with less added sugar.",
      Sips: "Unsweetened and protein drinks instead of sugary ones.",
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
        title: "Added sugar on every card",
        body: "Your Packed for You card lists the added sugar from each snack's label.",
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
        a: "No. Some snacks, like the treats and fruit bars, contain sugar. They're portioned, and the added sugar is on your card.",
      },
      {
        q: "Does it work for gestational diabetes?",
        a: "This box isn't checked against our pregnancy checklist. If you're pregnant, the Pregnancy Comfort box is, and your care team's plan comes first.",
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
      "14 snacks for heart-conscious eating: nuts and seeds, whole grains, fruit and one treat, with sodium listed for each. $47, free shipping, one-time purchase.",
    eyebrow: "Heart Wellness Box",
    h1: "Heart-conscious snacking without the label math.",
    intro:
      "“Watch your sodium” shouldn't mean giving up on snacks. This box is built around good fats, whole grains and fruit, with firm limits on salty picks and treats, and the sodium for every snack on your card.",
    forWho: [
      "Anyone watching sodium or eating for their heart",
      "People following a heart-conscious plan from their doctor",
      "Households who want snacks everyone can share",
    ],
    categoryWhy: {
      "Nuts & seeds": "Single servings of nuts and seeds for good fats.",
      "Whole grains & fiber": "Crackers, bars and crunch built on whole grains and fiber.",
      Fruit: "Dried and freeze-dried fruit and fruit bars.",
      Sips: "Unsweetened sparkling and flavored water.",
      Treat: "One dark-chocolate treat, sodium listed like everything else.",
    },
    screening: [
      {
        title: "Every snack plays a role",
        body: "Nuts and seeds, whole grains, fiber, fruit, lower-sodium savory or a portioned treat. No filler.",
      },
      {
        title: "At least 4 nut and seed picks",
        body: "Good fats are the backbone of this box.",
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
        a: "Not necessarily. We cap higher-sodium picks, anything over 300 mg per serving, at two per box, and your card lists the sodium for every snack so you can plan around it.",
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
  path: "/pregnancy-gift-box",
  title: "Pregnancy Gift Box With Your Note Inside",
  description:
    "Send 14 label-checked pregnancy snacks with your message printed on her card. $47, free shipping to her door, one-time purchase, ships November 11, 2026.",
};

export const landingFor = (slug: Box["slug"]) => landings.find((l) => l.slug === slug)!;
