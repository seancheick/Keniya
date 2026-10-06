# Stock and packing audit — October 5, 2026

Scope: receiving purchases, lot inventory, product/package verification, box selection and activation, purchasing, shipment planning/swaps, FEFO packing/unpacking, and shipping-label handoff.

## Confirmed issues fixed

| Priority | Finding | Change |
| --- | --- | --- |
| High | Packing could consume expired, undated, short-dated or older-formula lots. Catalog counts and purchasing included those units. | Shared current-formula / minimum 90-day expiry rule. Held lots remain visible and valued in physical inventory; planning counts only usable units. The database independently enforces this rule. |
| High | A manually swapped product could conflict with the customer's avoid list. Extras and gifts/samples lacked equivalent handling. | Ingredients and allergen checks run again when saving swaps and packing; conflicting extras block planning. Gifts, samples and replacements have an avoid field. |
| High | Packing only checked individual products, allowing duplicates, missing products, incorrect composition or an overweight box after swaps. | Server checks the full box recipe, distinct snack count, categories, weight including extras, known products, named approval and package verification. |
| High | A changed shipment or depleted lot could cause the database to consume different physical items from those checked at the table. | Checked item, package and lot snapshots are compared before packing. The database locks and compares the actual FEFO allocation before consuming stock. |
| High | Formula/label edits could retain the previous approval and package verification. A failed label-match check could leave verification intact. | Label changes/new formulas require review and package verification again. Metadata-only edits preserve verification. Mismatch findings clear verification; editing a provenance date cannot establish verification. |
| High | Lineup activation archived the old lineup before the new activation succeeded; saves could leave partial versions or collide. | Atomic saves, version allocation and activation under a per-box lock. Failed saves preserve the old active lineup. Activation checks the actual saved recipe on the server. |
| Medium | Builder saves silently dropped existing extras. Extras were omitted from capacity, packed weight and readiness. | Extras persist when saving; cost, weight, capacity, eligibility and approval readiness include them. |
| Medium | Missing lot expiry put inventory on hold without a correction workflow. | Record/correct the printed expiry with a reason and an audit note, without receiving stock again. |
| Medium | A receipt error could report failure after successfully receiving the purchase, encouraging duplicate entry. Upload errors could be silent. | Validate before receiving; upload failures explicitly report that the purchase was saved. File size is checked before sending. |
| Medium | “Same product again” used stale stock and average cost after the first purchase. | Update the selected product as well as its list entry. Purchase logging uses physical quantities for physical average cost. |
| Medium | Database result caps could truncate inventory, prices, planned orders, label handoff or recall recipients. | Stable pagination for catalog, order planning/listing, dashboard, label import/export and recall trace. |
| Medium | Unpacking retained label cost, tracking, weight and postage from the previous pack. | Clear stale shipment/label snapshots when stock is returned. |
| Medium | Shipment state updates could report success despite updating no rows, or race with unpacking. Label imports could ship a box without tracking. | Check affected rows, constrain transitions to the current status, reject invalid costs/zones, and skip invalid/unpacked import rows. |
| Medium | Failed default-package edits could erase the old default. Invalid package cost could silently become zero. | Atomic package save/default switch; explicit cost validation. |
| Medium | Packing had no physical pick list or check-off workflow; unsaved swaps could coexist with the pack button. | Searchable swaps, specific FEFO lots/expiry/quantity, check-off progress, save/discard, and a pack button enabled after checks. Checks reset when items, lots or package change. |
| Medium | Selecting packaging and recording scale weight required workarounds. | Select a package on the planned shipment; optional sealed-box scale weight feeds label export and postage estimation. |
| Medium | Dashboard suggested prioritizing expired/short-dated lots or using them as gift extras. | Explicit held-stock instructions replace those recommendations. |
| Medium | Stock/admin functions had mutable search paths; an existing privileged maintenance function exposed execution to public API roles. | Fixed function search paths and revoked public execution of the maintenance function. Database advisors were rechecked. |
| Low | Impossible dates and negative nutrition could enter validation; nonpositive weight could pass shipping eligibility. | Validate real calendar dates, nonnegative nutrition and positive item/box weight. |
| Low | Phone-size product names were clipped and printed pages included navigation/actions. | Full selected names at phone width, labelled controls, and a cleaner printable checklist. |

## Useful existing safeguards retained

- Stock deduction, item trace and cost snapshots remain transactional; shortages roll back the entire pack.
- Unpacking returns units to their original lots.
- Admin tables use RLS with no public policies; stock/packing functions are available only to the server role.
- Product formula versions and shipment lot references preserve traceability.

## Verification

- TypeScript check, ESLint, 73 unit tests, and production build.
- Isolated PostgreSQL tests: FEFO across lots, 90-day boundary, held/old-formula stock, shortages and rollback, stale item/lot snapshots, approval gate, unpack cleanup, failed lineup/default-package saves, expiry correction without stock duplication, and restricted function access.
- Browser checks with sample items: check-off progress, pack enablement, swaps resetting progress, unsaved swap protection, replacement search, discard, and 390px phone layout. The temporary preview route was removed.
- Database safeguards and function hardening applied to Keniya; live service-role RPC/schema access and database advisors checked.
- Current database schema/access verification and read-only inventory counts. No real purchase or shipment was created by the audit.

## Operational boundary

At audit time the Keniya database contained 97 products, zero purchase lots and zero shipments. This verifies the implemented rules and workflow with test fixtures; it does not establish a completed physical packing cycle. Package labels, expiry dates, clinician decisions and customer free-text avoids still need human checking. Free-text matching is a curation aid, not a complete allergy interpretation system. Older-formula lots remain held pending separate review.

The application changes require deployment before the hosted admin shows the new workflow.

## Claude mobile follow-up and clinician export (2026-10-06 UTC)

Verified remote commit c7e8714 and integrated it while preserving all stock audit changes. The layout conflict retains both mobile grid shrinking and print-only exclusions. Corrected shared badges to wrap long content (the remote shared Badge still used whitespace-nowrap). Products at 375px have no document overflow, and the Pre-approved tab selects the correct stage.

Clinician export now has Start here, a nine-column Review queue, complete Details and Legend. Queue prioritizes Pre-approved, legacy approvals and active lineups; excludes rejected/retired only from the queue. Four yellow input columns, decision dropdown, reviewer/date fields, evidence hyperlinks, stable product/label-version IDs and explicit manual return workflow. Removed misleading Ready to pack column; Product verification describes only approval/UPC/package checks. Legend uses current configured limits, active lineup membership includes gift extras, CSV export pagination has deterministic ordering, and empty catalog export is supported. Live download verified 97 Details records and 78 Review records. No clinician decisions or label data changed.

Validation: 75 tests passed, typecheck/lint passed, production build passed; downloaded Excel sheets, queue ordering, validation fields and configured rule limits inspected. Native Excel rendering and returned-workbook import are not verified; returned decisions require manual entry. Application changes remain local, not deployed.
