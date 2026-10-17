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
   - The estimate assumes the whole pack is dark chocolate (or cocoa powder when that is listed), so it can only overstate. A 15 g chocolate bar comes out at 12 mg or less, against the 50 mg per-pack cap.
   - Proposed answers:
     - accept the upper-bound method;
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
9. **Total vs net carbs.**
   - Public copy promises "total carbs, never net carbs", so a fiber/allulose bar like Magic Spoon (high total carbs, low net) doesn't qualify for Blood Sugar.
   - Keep total carbs, or allow net carbs for named fibers/allulose?
   - Proposed: keep total carbs.

## Owner to-dos

- Confirm the public dye wording: "No synthetic dyes (no Red 40, Yellow 5, Blue 1 and the like)", shown on every box page.
- Close the superseded PR #4.
- Store scanning: follow `docs/scan-checklist.md`.
