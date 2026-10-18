# Screening decisions for clinician review (Oct 17 2026)

The owner made these calls on Oct 17 2026 to stop scanned snacks from stalling on hold. They are live in the rules as **founder-set, pending clinician confirmation**. Each item gives the evidence, what the system does now, and the question for the PharmaGuide Team (Laurie).

## What changed, check by check

| Check | Before | Now |
|---|---|---|
| Caffeine (Pregnancy, GDM, Postpartum; diligence for every box) | Blank label value = hold | Label wins. No caffeine-bearing ingredient = 0. Cocoa/chocolate = worst-case estimate from pack weight. Coffee/tea/matcha/guarana still need the label value |
| P3 caffeine shown, P4 added sugar shown, P5 sodium shown, P6 allergens identified | Manual PASS/FAIL | Filled automatically when the data is on file. A recorded FAIL still wins |
| P2 pregnancy no-gos | Manual | Raw/unpasteurized dairy/egg/juice, raw sprouts, liver/pâté, high-mercury fish and alcohol pre-set FAIL from the ingredients. Cured meat/jerky is flagged for review |
| P7a watchlist | Manual, list never matched | Built-in list plus the `watchlist` table pre-set FAIL from the ingredients |
| P7b sugar alcohols (brand preference) | Manual | Pre-set FAIL from the ingredients |
| P7c sweeteners (info) | Manual note | Flagged automatically, never blocks |
| P1 pasteurized/cooked, P8 single-serve | Manual | Still manual: a clean screen is never an automatic PASS |
| Synthetic dyes | Not screened | Rejected in every box (Keniya standard) |
| Blood Sugar / GDM treat-only picks | 3 g added sugar like every pick (treat slots unusable) | Up to 5 g added sugar, still ≤15 g total carbs and within the treat count (3 Blood Sugar, 2 GDM) |
| Box totals (Pregnancy family) | None | Warnings: total caffeine (100 mg Pregnancy/GDM, 150 mg Postpartum) and at most 4 chocolate picks |

## Questions for the clinician

1. **Caffeine estimate and box caps.**
   - Evidence:
     - ACOG Committee Opinion 462: under 200 mg caffeine a day in pregnancy.
     - USDA FoodData Central (SR Legacy 170273): dark chocolate (70–85% cacao) has about 80 mg per 100 g; unsweetened cocoa powder about 230 mg per 100 g.
   - The estimate counts the whole pack as dark chocolate (or cocoa powder when that is listed). It is a **screening estimate**, not a guaranteed maximum, because cacao content varies. The app never shows it as a label value.
   - If an estimate uses more than half of the per-pack limit, the product is held until the manufacturer's value is entered. A 15 g chocolate bar estimates at 12 mg and passes. A 14.5 g cocoa-powder pack (Pocky) estimates at 34 mg and is held.
   - Proposed answers:
     - accept the screening estimate with the half-limit hold;
     - box total ≤100 mg (Pregnancy/GDM), half the daily limit spread over 14 snacks, and ≤150 mg (Postpartum);
     - at most 4 chocolate picks per box, because Consumer Reports (2022–23) found lead and cadmium in many dark chocolates.
2. **P1 for nuts and seeds.**
   - Evidence: US-grown (California) almonds must be pasteurized by USDA rule (2007). Dry-roasted nuts and seeds are cooked.
   - Proposed: pasteurized almonds and roasted nuts/seeds pass P1.
   - The open question is "raw" nuts from outside the US, which should be a case-by-case review.
   - A related question: are commercially roasted sprouted seeds acceptable, as distinct from raw sprouts (an FDA/CDC listeria risk)?
3. **Shelf-stable jerky and meat sticks.**
   - Evidence: CDC listeria guidance targets deli meats and dry sausages eaten unheated. Commercial jerky is cooked and dried, but it is not reheated before eating.
   - Options: allow, allow with a cap (for example 1 per box), or exclude from the pregnancy family.
   - Today the system flags it for review and does not decide.
4. **Ginger.**
   - Evidence: ginger is widely used for pregnancy nausea at about 1 g a day in studies.
   - Proposed: ginger as a food ingredient or tea is fine. Ginger *extract or powder* as a concentrated ingredient is a review flag.
   - A label that says "consult your practitioner" gets a card note rather than an exclusion. Confirm.
5. **Sweeteners.**
   - Evidence: highly purified stevia (steviol glycosides), monk fruit and sucralose are FDA GRAS/approved. Saccharin is the one commonly advised against in pregnancy.
   - Proposed:
     - stevia, monk fruit, allulose and sucralose are P7c customer information only;
     - saccharin is a P7a fail;
     - sugar alcohols stay a P7b brand preference, never described as unsafe.
6. **Blood Sugar / GDM treats at 5 g added sugar.**
   - Proposed: confirm the 5 g ceiling for treat-only picks, with total carbs still ≤15 g, and the treat counts (3 per Blood Sugar box, 2 per GDM box).
   - Core picks stay at ≤3 g added sugar.
7. **Box total added sugar.** Should a Blood Sugar or GDM box also cap total added sugar across all picks (for example ≤40 g per box)? Not built.
8. **Botanicals and fortification in the pregnancy family.**
   - Cases: lion's mane, ashwagandha, ginseng, probiotics, added vitamin A (retinol/retinyl).
   - Today these are flagged for review. Should they be blanket-excluded instead?
   - Proposed: exclude ashwagandha, ginseng and added preformed vitamin A; review probiotics case by case.
9. **Total vs net carbs** (owner decision 2026-10-18).
   - Evidence: the ADA recommends counting total carbohydrate and does not treat net carbs as a standardized clinical measure. UCSF's Diabetes Teaching Center teaches subtracting fiber in some contexts.
   - What the app does:
     - net carbs (total − fiber, never subtracting sugar alcohols or allulose) is calculated and shown in the admin only;
     - eligibility stays on total carbs (Blood Sugar and GDM 15 g, GLP-1 20 g), and public copy is unchanged.
   - An internal **high-fiber review** list holds products that fail only the total-carb limit but meet a proposed dual limit:
     - Blood Sugar: ≤15 g net and ≤25 g total;
     - GLP-1: ≤20 g net and ≤25 g total;
     - GDM: no exception.

     The 25 g total ceiling is an internal review boundary, not a clinical threshold. The current list is in `docs/pre-purchase-report-2026-10-18.md`.
   - Question: adopt a dual limit for Blood Sugar and/or GLP-1, or keep total carbs only?
10. **GDM review by a diabetes-in-pregnancy specialist.** The GDM rules should be reviewed by a registered dietitian experienced in diabetes in pregnancy, ideally a CDCES or someone on a maternal-fetal medicine team, alongside Laurie's ingredient-safety review.
    - The 15 g snack limit is a conservative product-selection rule. It is not an ADA limit or a meal plan. The ADA 2026 Standards set a floor of at least 175 g carbohydrate a day in pregnancy, with nutrition individualized.
    - In the software, GDM now always inherits the strictest live limits of Blood Sugar and Pregnancy.
11. **Heart saturated-fat allowance.** The 4 g allowance now applies only when:
    - a nut or seed is the first ingredient;
    - there is no other added saturated-fat source (chocolate, cocoa butter, dairy fat, coconut, palm, shortening);
    - the nut/seed role is set.

    Otherwise the limit is 2 g. Partially hydrogenated oil is rejected in Heart, and potassium chloride is flagged. These are Keniya screening thresholds, not AHA Heart-Check certification. Confirm.
12. **GLP-1 tolerability.** These are flagged for review, not excluded:
    - fiber ≥8 g, or fiber ≥5 g with added fiber (inulin, chicory root and similar);
    - any sugar alcohol;
    - saturated fat ≥4 g.

    The basis is the 2025 multisociety GLP-1 nutrition advisory: high-fat or high-fiber foods can aggravate GI symptoms at the start of treatment or when the dose goes up. Should any of these be a hard limit?
13. **Allergens.**
    - Product allergens come from the label's Contains statement, cross-contact text and ingredients, for the FDA nine (sesame included).
    - Customer exclusions are hard constraints: a Contains match or a cross-contact warning conflicts, and a label we can't verify (no statement, or one that disagrees with the ingredients) blocks.
    - Planner substitutions need an admin's confirmation before packing.
    - Keniya does not promise an allergen-free product or facility. Confirm that the strict cross-contact rule is right.

## Pre-purchase approval stages (owner decision 2026-10-18)

| Stage | Meaning | Bulk buying? |
|---|---|---|
| Preliminary screening | The software rules pass | No: samples only (up to the "sample units" setting, 6 by default; more needs a written reason) |
| Clinical and sourcing approval | Rules reviewed; PharmaGuide Team approved; sourcing checks done | Yes |
| Package and lot verification | The physical package matches the record and passes receiving | Ready toward packing |

Sourcing checks before bulk buying:
- the exact brand, flavor, size and barcode;
- the full Nutrition Facts per sealed unit;
- the ingredients;
- the Contains and cross-contact statements;
- the shelf life and storage;
- an FDA recall search;
- at least one alternate for each essential category.

The Purchasing page leaves unapproved products out of the totals, and Log purchase asks for a reason above the sample quantity.

## Safety findings and stale decisions (fixed 2026-10-18)

The ingredients are re-screened every time eligibility runs, including the database watchlist. A matched no-go, watchlist or brand finding fails its check even when an older PASS is stored. An unresolved safety review item (a botanical, cured meat, or a caffeine source with no label value) holds the pregnancy family.

Only a recorded decision clears a finding:
- **Safety findings:** Laurie, signed in as the clinician, from the Review page.
- **Brand preferences** such as sugar alcohols: an admin.
- **Dyes:** never.

Each decision is tied to the formula version and to the exact ingredient text, so any reformulation or edit voids it.

## Owner to-dos

- Confirm the public dye wording: "No synthetic dyes (no Red 40, Yellow 5, Blue 1 and the like)", shown on every box page.
- Close the superseded PR #4.
- Store scanning: follow `docs/scan-checklist.md`.
