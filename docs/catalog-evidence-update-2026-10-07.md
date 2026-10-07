# Catalog evidence update — October 7, 2026

All 110 records reconciled with the supplied audit. Source workbook and source review files remain unchanged. Live catalog: **89 Candidate / HOLD; 21 Rejected / EXCLUDE; 0 pre-approved or approved**.

## Verified label corrections

- P011 standard GoGo Apple Apple 90 g: 70 calories, 16 g carbs, 3 g fiber. Removed from Blood Sugar. [Manufacturer foodservice panel, page 3](https://gogosqueez.com/wp-content/uploads/2024/04/GoGo-squeeZ-Restaurants-Sell-Sheets-Digital.pdf).
- P016 KIND Dark Chocolate Cherry Cashew 40 g: 7 g added sugar; current ingredient/allergen text and disclosed 0 g sugar alcohols. [Manufacturer](https://www.kindsnacks.com/products/nut-bar/dark-chocolate-cherry-cashew).
- P036 Tree Top 90 g pouch: 45 calories, 12 g carbs, 1 g protein, 1 g fiber. [Manufacturer](https://treetop.com/products/no-sugar-added-apple-sauce-pouch-2/).
- P106 Lärabar mini 22 g: 100 calories, 45 mg sodium. [Manufacturer](https://www.larabar.com/our-products/larabar-minis/chocolate-chip-cookie-dough-mini).
- P110 True Lemon Strawberry Lemonade: current vegetable-juice-color / vitamin-C formula replaced older beet-powder formula. Still passes Blood Sugar hydration at 3 g carbs / 1 g added sugar; GDM remains held for renewed Pregnancy screening. [Manufacturer](https://www.truecitrus.com/products/true-lemon-strawberry-lemonade).

Changed panels/formulas have historical Pregnancy screening passes withdrawn pending documented review; P8 retained only where current unit presentation is established. P032–P034 assembled tea units and P109 unresolved exact pack have supplied-unit passes withdrawn. No absence of label disclosure was converted to zero.

## Exclusions and shared workflow

All 21 excluded presentations now have an explicit internal rejection status and reason. This includes assembled chew portions, incompatible ready-to-drink liquids, and recorded multi-serving bags. Existing P021 Heart sodium exclusion and P083 Heart sodium exclusion remain. All 110 records retain the audit’s current finding and remaining evidence tasks, with older notes marked historical.

Sugar-alcohol grams are optional when not disclosed. Full ingredients, source, allergen evidence, other required nutrients, all P1–P8 decisions including P7b, and explicit internal sign-off remain mandatory. This follows the [FDA sugar-alcohol label guidance](https://www.accessdata.fda.gov/scripts/interactivenutritionfactslabel/assets/InteractiveNFL_SugarAlcohols_October2021.pdf). Unknown values remain null. The database approval gate, admin diagnostics, and field label now agree.

## Entire catalog replay

Counts below represent recorded rule fit, not completed diligence or approval. Other box rules are unchanged.

| Box | Before | After | Newly eligible | Newly ineligible / held |
|---|---:|---:|---|---|
| pregnancy_comfort | 31 | 24 | None | P028, P032, P033, P034, P036, P109, P110 |
| blood_sugar | 33 | 28 | None | P011, P032, P033, P034, P109 |
| heart | 35 | 31 | None | P032, P033, P034, P109 |
| gestational_diabetes | 16 | 10 | None | P032, P033, P034, P036, P109, P110 |
| glp1 | 36 | 32 | None | P032, P033, P034, P109 |
| postpartum | 31 | 24 | None | P028, P032, P033, P034, P036, P109, P110 |

All six lineups regenerated from the current catalog as operator drafts. No active lineup changed because none was active. All fail the Candidate approval gate; Pregnancy/Postpartum additionally lack qualifying hydration, and GDM fills only 8 of 14 picks with further category/composition gaps. N−1 resilience cannot be qualified while the base lineup fails.

The PharmaGuide Team ready packet contains no products. The full internal catalog and operator draft workbook include holds and remaining diligence. Public website wording is unchanged.

## Verification

178 tests passed; lint, typecheck, production build passed. Fresh scratch database migrations, SQL regression suites, and three concurrency checks passed. Live migration verification confirms 21 tables/RPCs and no public execution of privileged RPCs. Optional sugar-alcohol and mandatory P7b regressions were observed failing before the fix and passing after it.

The Supabase CLI was terminated (exit 137) when asked to create the migration; a sequential migration file was created directly and verified with fresh database application and the existing Management API migration runner.

## Remaining evidence work

No products are falsely cleared. Manufacturer exact-pack evidence remains unresolved on many rows. Complete each current source/ingredient/allergen field and documented screening decision before internal sign-off, then validate the finished lineup and submit the ready packet for PharmaGuide Team review. Package-in-hand verification remains a separate packing requirement. The supplied report’s 15 primary-panel transcriptions do not establish current exact-label verification for all 110 products.
