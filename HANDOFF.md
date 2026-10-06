# Handoff: Keniya Admin (`/admin`)

**Status, Oct 6 2026, late night (2): barcode units vs packs, P9 is lot-level, composition from the recipe.**
- **P9 is no longer a product eligibility check** (team review): a product has no expiry, a purchased lot does. `PREGNANCY_BLOCKING` is P1–P8 (P9 stays as package/lot information, set at the package check); the ≥90-day rule is enforced per lot (`lotHold`, `pack_shipment`). The P9 PASS marks written at pre-screen earlier today were reverted. The "every snack" line now says "9 pregnancy screening checks".
- **Barcode bug fixed:** the backfill and today's inserts stripped leading zeros (`.replace(/^0+/, "")`), leaving three 11-digit UPCs (P097, P098, P106) that failed the check digit. `printedForm()` now stores the code as printed (UPC-A keeps its leading zero); matching uses `products.gtin14` (generated, unique). All 27 product UPCs pass the check digit (backup `ops/barcode-repair-backup-2026-10-06.json`).
- **Single pack vs outer box (migration `20261007000000_purchase_packs.sql`, applied):** `purchase_packs` (gtin, units_per_pack, barcode_status/sources) for the box you buy; a trigger keeps one barcode = one meaning across both tables; `pack_shipment` accepts a verified outer pack as identity for packets with no barcode of their own (patched in place; fails loudly if the function text changes). Moved off single packs: P100 (box of 10), P103/P104 (box of 4), P108/P109 (box of 10), P110 (box of 10, verified). P099's GTIN is described by USDA as a 200-count case, so it is now a candidate, not its UPC. The grandfathered codes now carry real USDA provenance.
- **Receiving:** scanning a registered box selects the product and fills units = boxes × packs per box (the lot note records the box). Scanning an unknown code offers "this is the outer box of a product we already have" (registers a verified pack) before "new product". **Verify:** an outer-box scan identifies the product without becoming its UPC; an unknown code asks whether it's on the single pack or the box.
- **Composition from the live recipe** (team review): `box.ts` keeps only copy per recipe category; `publicComposition()` derives the counts (achievable range after the other minimums and the drink cap), for the site and the order emails. Removed promises the engine doesn't enforce: tea, electrolytes on every sip, ginger/peppermint (GLP-1), "one treat" (Heart allows up to `treatMax`), "more hydration" (Postpartum). Count words in public copy fail `standards.test.ts`.
- **Audit wording:** True Lemon P108/P109/P110 are hydration aids, not electrolyte products; P039 is the electrolyte mix. P110's reason: its 1 g added sugar is under every sugar cap; it fails because a drink qualifies only through the unsweetened (0 g) drink pathway. Heart and GLP-1 now state that reason for drinks.
- **State:** all six lineups READY, no single point of failure; 97 tests, typecheck, lint, build clean.

**Status, Oct 6 2026, late night: barcode identity pipeline; True Lemon hydration; P9 fix (P9 part superseded below).**
- **Barcode identity is now its own verified thing** (team's design). Migration `0010_product_barcode_provenance.sql` (applied live) adds `products.barcode_status` (unverified / candidate / provisional / high / conflict / verified), `barcode_sources` (provenance: source, gtin, exact_variant, checked_at, note) and `barcode_checked_at`; `upc` stays the printed barcode. Rules in `src/lib/admin/barcode.ts` (GS1 check digit, GTIN-14 normalization, consumer-unit indicator 0 only, verdict). `pnpm barcode:backfill [--apply] [P0xx]` looks up USDA FDC → Open Food Facts (search-a-licious) → UPCitemdb (trial, 100/day, cached in `ops/upcitemdb-cache.json`, budget via `UPCITEMDB_BUDGET`); a match needs brand + symmetric name overlap + the individual pack size; only exact hits establish identity (USDA exact or two agreeing sources = provisional, three = high); name-only hits stay candidates and are never written to `upc`; disagreeing exact hits = conflict for GS1 / manufacturer / the package. The Verify screen and a scan on the receiving screen set `verified` with a `package` source. Only `USDA_API_KEY` exists in `.env`; no UPCitemdb/GS1 keys (GS1 Verified is manual, ~30 searches/day).
- **Backfill applied:** 21 products got a provisional UPC (evidence in `barcode_sources`), 18 candidates, 11 conflicts, 28 with no hit; backup `ops/barcode-backfill-backup-2026-10-06.json`. Conflicts and candidates are resolved by scanning the package when it's bought.
- **Hydration:** P108/P109 True Lemon water-enhancer packets (0 cal, no sweetener; pass every box) and P110 True Lemon Strawberry Lemonade (1 g added sugar + stevia: Pregnancy and Postpartum only; barcode verified from the owner's box photo + USDA + OFF). Pregnancy/GDM/Postpartum recipes now require **2 hydration picks** (the public cards promise two sips); the stored Pregnancy rule row was updated (backup `ops/box-rules-pregnancy-backup-2026-10-06b.json`).
- **Feasibility now:** every box builds, and **no box has a single point of failure any more** (`pnpm box:feasibility`): Pregnancy v3, GDM v2 and Postpartum v2 each carry P039 + P108, and the catalog has 110 products in the pool. Clinician packet regenerated: 29 products in the six lineups (23 Pre-approved, 6 legacy Approved, 0 Candidates, 0 FAIL results).
- **Bug found and fixed:** products added today had no P9 (expiry window) check, which silently made them ineligible for the pregnancy-based boxes. P9 is now set PASS at pre-screen for shelf-stable packaged snacks (the package check still refuses anything under 90 days). Lesson: a new product needs all of P1–P9 before it can serve a pregnancy box; the pre-screen insert should set P9 explicitly.

**Status, Oct 6 2026, night: cost no longer gates lineups; clinician packet; stage ladder.**
- **Operating model (owner + team, now enforced in code):** catalog (exact SKU, label, eligibility, evidence; no required cost) → lineup (the shopping list; must pass every rule and composition check; reaches READY without a cost) → buy list (Purchasing: units per box × boxes planned − packable stock) → purchase lot (the only source of cost: what you actually paid ÷ usable units; FEFO at packing) → packable → clinician final approval. "Picks with no purchase cost" is now a **warning**, not a blocker (`checkLineup`); the Boxes/Dashboard cost tiles flag "n uncosted" so the estimate reads as incomplete. `box:feasibility` no longer excludes uncosted products.
- **Lineup ladder:** FIX → READY · PROVISIONAL (Keniya pre-approved, awaiting the clinician) → **READY · CLINICIAN APPROVED** (new: every pick approved, package checks pending) → CLEARED TO PACK.
- **Clinician packet** (`Products → Clinician packet`, `?table=clinician_packet`, `src/lib/admin/clinical-packet.ts`): only the products in the active lineups (31 today: 24 Pre-approved, 7 legacy Approved, 0 Candidates, 0 FAIL results), each with exact pack, the per-pack rule applied for every box it serves, PASS rationale (pathway), exceptions (treat, nut allowance, failed P-checks, P7c flags), label source, in-hand verification date, and decision cells; plus a Lineups sheet with each box's validation result and composition. File: `ops/keniya-clinician-packet-2026-10-06.xlsx`. The full-catalog workbook stays as the internal audit ("Full catalog review").
- **P040 rationale corrected** to cumulative-headroom wording (does not itself exceed the 35 mg/day UL).
- **Next, in order:** source 2+ hydration products for the pregnancy-based boxes (different manufacturers); buy from the Purchasing list and log lots (costs appear then); photograph the three new boxes; Laurie signs the packet. Don't change the standards unless she flags something.

**Status, Oct 6 2026, late: all six lineups active, site reads live rules, team's release-hardening pass done.**
- **Working agreement (owner):** the team pre-approves properly and the clinician converts pre-approvals to approvals; don't gate work on her. Price is $47 for every box.
- **Lineups (all READY · PROVISIONAL, built with Build box "balanced", actor Sean):** Pregnancy v2, Blood Sugar v3 (unchanged), **Heart v4** (rebuilt under 140 mg), **Gestational Diabetes v1, GLP-1 v1, Postpartum v1**. `pnpm box:feasibility` proves each box builds from the live catalog, but only **one disjoint lineup per box**: every box leans on the same anchors. Hydration: P039 was the only product past pre-screen; **P040 (Key Nutrients) is now Pre-approved for Blood Sugar, Heart and GLP-1** from the manufacturer's label image (110 mg sodium; P7a FAIL for the pregnancy-based boxes on Keniya's cumulative supplemental-niacin screen: 20 mg per serving doesn't exceed the NIH 35 mg/day pregnancy/lactation UL by itself but leaves only 15 mg of headroom for a prenatal; backup `ops/p040-backup-2026-10-06.json`). The pregnancy-based boxes (Pregnancy, GDM, Postpartum) still have a single hydration SKU: the three ginger teas P032–P034 are a clinician call, or source a vitamin-free electrolyte mix. `pnpm box:feasibility` lists single points of failure per box: Blood Sugar, Heart and GLP-1 survive any one product going out of stock; Pregnancy, GDM and Postpartum all fail without P039. Latest clinician export: `ops/keniya-clinician-review-2026-10-06-evening.xlsx`.
- **Rule fixes today:** "treat-only" no longer counts unsweetened fruit or whole-grain picks (`ccTreatOnly`); MF role set on P035/P036/P042/P043 (fruit only, 0 g added sugar; backup `ops/roles-backup-2026-10-06.json`). Postpartum Hydration range opened to 1–3 until a second hydration product exists. Live `box_rules` rows were synced to the defaults for the standard fields (only diff: Blood Sugar `treatMax` null → 3; backup `ops/box-rules-backup-2026-10-06.json`).
- **Single source of truth (team's point, done):** public pages read the **live** rules (`src/lib/public-rules.ts` → `loadBoxRules`, defaults only as a logged fallback). Every limit in public copy is a token like `{{heart.sodiumMax}}` filled by `fillStandards`; a literal number in `box.ts`/`landing.ts` fails `standards.test.ts`; an unset rule referenced by copy throws at render (the build caught exactly this for Blood Sugar `treatMax`). `saveBoxRules` revalidates `/` (layout), and the pages also revalidate hourly. Nothing to remember after an admin edit.
- **Products added from the team's sourcing list (verified against USDA FDC label records, Pre-approved, prescreened_by Sean):** P098 Harvest Snaps 1.75 oz (28 g carbs: Pregnancy + Heart only; the 1 oz pack isn't in FDC), P099 SunButter Natural pouch, P100 KIND Minis Caramel Almond (caffeine-free sweet), P101/P102 That's It minis (the "strawberry banana" mini doesn't exist; these are apples+strawberries / apples+blueberries), P103/P104 MadeGood minis (choc chip scaled from the 29 g label; confirm on pack), P105 IQBAR (Blood Sugar + GLP-1 only: coconut oil, lion's mane → P7a FAIL), P106 Lärabar mini. P107 Artisana = Candidate (FDC record has no nutrients). Not added: SkinnyPop White Cheddar and ALOHA mini (no single-serve FDC record). **None have a cost yet**, so they can't enter a READY lineup until costs are logged. List: `ops/new-products-2026-10-06.json`.
- **Release hygiene:** `rm -rf .next && pnpm build && pnpm tsc --noEmit` → exit 0. `pnpm smoke:prod` asserts the canonical URLs (200) and old URLs (308). Caffeine caps are documented in `types.ts` as Keniya per-pack numbers informed by ACOG/CDC daily guidance, never as their cutoffs.

**Status, Oct 6 2026, evening: six boxes, published standards, Blood Sugar rename (branch `boxes-v2` → main).**
- **Decision (owner, with the clinician):** no customers and no stock yet, so everything changed at once. Six founding boxes: Pregnancy Comfort, **Blood Sugar** (was Carb Conscious; same slug `blood_sugar`, `/blood-sugar-snack-box`, old URL redirects), Heart Wellness (now names high blood pressure and cholesterol), **Gestational Diabetes** (= Pregnancy screening ∩ Blood Sugar standard), **GLP-1 Companion**, **Postpartum & Nursing**. Menopause and kidney stay as requests. Founding runs 50 / 50 / 50 / 20 / 20 / 20 (`DEFAULT_SETTINGS.runSize`; the public `box.founding` reads the same default).
- **Standards are Keniya curation thresholds with sources** (comments in `types.ts`); the clinician reviews lineups, not arithmetic. Laurie chose the lower sodium number. Per pack: Blood Sugar ≤20 g total carbs, ≤5 g added sugar (ADA 15–20 g snack pattern; total carbs, never net). Heart ≤**140 mg sodium** (FDA "low sodium" / AHA snack line; was 230), sat fat ≤2 g or ≤4 g only when the nut/seed role is set **and** the label has no palm, palm-kernel, coconut or partially hydrogenated oil (`hasAddedTropicalOil`), added sugar ≤5 g core / ≤8 g on a controlled treat (`treatAddedSugarMax`). Pregnancy `caffeineMax` 50 mg (ACOG <200 mg/day; not an ACOG cutoff). Postpartum caffeineMax 100 mg. Blood Sugar `treatMax` 3 counts treat-only picks. The old 300 mg "higher-sodium picks" check is gone. (Superseded the same evening: the site now reads the live rules, see the status above.)
- **Catalog after the change (live data, 78 live products):** eligible Pregnancy 40, Blood Sugar 34, Heart **29** (was 40: 5 nut products with added palm/coconut oil, 3 over 5 g sugar, 2–3 between 140 and 230 mg sodium), Gestational Diabetes 24, GLP-1 34, Postpartum 40. 40 products pass more than one box.
- **Lineups:** Pregnancy v2 and Blood Sugar v3 still READY · PROVISIONAL. **Heart v3 is FIX: 4 picks are no longer eligible** (rebuild with "Build box"). The three new boxes have **no lineup yet** (build, then clinician approval, then package checks).
- **Not done / needs the owner:** photography for the three new boxes (they render a tinted name panel, `BoxVisual`); optional Stripe prices `STRIPE_PRICE_{GESTATIONAL_DIABETES,GLP1,POSTPARTUM}_BOX` (checkout falls back to an ad-hoc $47 line item, so the boxes sell without them); the sold-out check per box is still missing (HANDOFF §3). The GLP-1 and Postpartum rule numbers (protein/fiber minimums, 150 cal small-treat line, 100 mg caffeine) are founder-set from the 2025 ASN/OMA/TOS/ACLM GLP-1 guidance and ACOG/CDC nursing caffeine guidance; the clinician reviews the first lineups.
- **Verified:** 83 tests, typecheck, lint, production build (all six landing routes static). Live probes of eligibility and lineup state were run with `npx tsx` on Node 22 (`NODE_OPTIONS=--conditions=react-server`); the shell's default Node 18 can't run vitest or the Supabase client.

**Status, Oct 6 2026, end of day: stock/packing audit deployed; state of play.**
- **Production runs `fce25bc`** (Vercel success). It contains: Codex's stock and packing audit fixes (`571d713`), both mobile passes, the box-builder table, Verify screen and approval ladder. Tests: **75 pass**; typecheck, lint and production build are clean.
- **The audit** is written up in `docs/admin-stock-audit.md` (full finding-by-finding table). In short:
  - Packing only uses **current-formula lots with ≥ 90 days left**, earliest expiry first. Held lots (expired, undated, short-dated, old formula) stay visible in Inventory but are not planned, packed or purchased against. Logic in `src/lib/admin/stock.ts`, enforced again in the database.
  - Packing checks the **whole box** (recipe, distinct snacks, categories, weight incl. extras, named approval, package verification, customer avoids) in `src/lib/admin/packing.ts`; the database re-checks item/package/lot snapshots before consuming stock (`pack_shipment_checked`).
  - Atomic lineup saves/activation and package-profile saves (`save_box_lineup`, `activate_box_lineup`, `save_package_profile`), lot-expiry correction without re-receiving (`set_lot_expiry`), pagination past the 1,000-row cap (`allRows`), unpack clears stale label data, label/formula edits clear verification.
  - New migrations `20261006025542_packing_safeguards.sql` and `20261006030933_admin_function_hardening.sql` (function search paths; one privileged function no longer callable by public roles). Both are applied to the live database and listed in `scripts/migrate-admin.ts`.
- **What the audit found in my (Claude's) work, now fixed** (so a future session doesn't repeat it):
  - The Verify screen left an earlier verification standing when you answered "label doesn't match".
  - `packBlockers` checked each product alone, not the whole box.
  - "Package verified" was built on `verified_at`, a field the product edit form could set by hand, and label/formula edits kept approval and verification.
  - Lesson: any new gate needs a full pack cycle on test data before it's called done.
- **Not verified:** a physical packing cycle (the database has 0 lots, 0 shipments, 0 orders, 0 verified products). The SQL tests in `supabase/tests/*.sql` need a scratch Postgres and have not been run in this environment; they were run by Codex only. `loadPostageHistory` is still capped at 500 recent labels.
- **Clinician file:** `ops/keniya-clinician-review-2026-10-06.xlsx` is the current export (97 products: 54 Pre-approved, 11 legacy Approved, 13 Candidate, 19 Rejected; 25 products in the active lineups, none Candidate, none ready to pack yet). Re-export any time from Products → Export for clinician.
- **Active lineups:** Pregnancy v2, Carb Conscious v3, Heart v3, all READY · PROVISIONAL (every pick still needs a named clinician approval and a package check).
- **Working agreements that came up:** another agent (Codex) edits this repo in the same folder: check `git status` before editing, use a separate worktree if it has uncommitted changes, and never commit its work without the owner's say-so.

**Status, Oct 6 2026, later: mobile pass on box builder, orders, inventory.**
- Box page 11,264 px → ~8,000 px on a phone. Secondary controls (stock/approval filters, "Leave out", snack mix) fold behind **Options**; lineup rows are compact; passing checks are folded (failures always shown); a fixed bottom bar shows `N/14 picked`, the stage and **Save draft / Activate**; the box switcher is a full-width 3-up; Box recipe and Saved lineups are collapsible (`Disclosure` in `ui.tsx`); the products table shows the 14 picks plus 12 more with "Show all".
- Orders: pill tabs (`PillTabs`, shared with Products), order and shipment cards on phones, Pirate Ship and Gift/Sample folded. Packing checklist: one name per row (dropdown behind **Swap**), progress + **Mark packed** pinned to the bottom, scale weight folded.
- Inventory: lots, movements and the expiry tiles are cards/3-up on phones; Adjust and Correct-expiry forms are full width.
- Admin-wide on phones: every button ≥ 44 px (`max-sm:[&_[data-slot=button]]:min-h-11` on `<main>`), inputs 44 px (`fieldClass`).
- Not run on real data: inventory and orders have no rows yet. The phone layouts were checked with a throwaway fixture route (deleted) rendering the real page code and the real checklist component with fake rows.

**Status, Oct 6 2026: mobile polish (branch `ui-mobile-polish`, merged to main).**
- Root cause of the "product page looks off on phones": `PageHeader` let the title share a row with the action buttons (title squeezed to ~70 px), and grid tracks grew to their widest child (a 990 px card on a 375 px screen). Fixes: `PageHeader` stacks on phones; `<main>` has `[&_.grid>*]:min-w-0`; long badges wrap; card headers wrap. Every admin page was measured at 375 px: no sideways scroll.
- Products list: review-stage tabs with counts (All, Candidate, Pre-approved, **Approved = named clinician only**, **Legacy approval**, Rejected, Retired when non-empty); search always visible, other filters behind "More filters"; phones get one card per product (status, ✓ boxes, flags, stock, cost) instead of the table. `?status=Legacy` is a view, not a DB status.
- Dashboard "Library health" now shows Clinician-approved and Legacy approvals separately, linking to those tabs.
- Tap targets ≥ 44 px on phones: nav tabs, logo, Log purchase, search/filters, status buttons; nav scrolls the current tab into view.

**Status, Oct 5 2026, latest: simpler box-builder table.**
- `src/components/admin/box-product-table.tsx`, rendered full-width under the builder on `/admin/boxes/[slug]`. Columns: product (front photo, categories, cost), stock, ✓ per box (`eligibleFor`; this box uses the one-off mix), approval (Clinician / Legacy / Pre-approved / Candidate), package verified, earliest expiry, Add/Remove. A row expands to show the evidence.
- Candidates and allergen "Leave out" conflicts can't be added. Add picks a category with room (below its minimum first, then below its maximum).
- On phones the wide columns fold into a chip line under the product name.
- The per-pick product dropdown and "+ Add pick" were removed from the lineup list; swapping is now Remove + Add in the table.
- The page passes `allRules`, signed front-photo URLs and pre-screen findings (`splitNotes`) to `BoxBuilder`.

**Status, Oct 5 2026: pack-floor Verify screen.**
- `/admin/verify` (nav tab "Verify"): `src/app/admin/(protected)/verify/page.tsx`, `src/components/admin/verify-flow.tsx`, action `src/actions/admin/verify.ts`, pure checks `src/lib/admin/verify.ts` (+ tests).
- Scan with a handheld scanner (keyboard input, auto-focused), the camera (`BarcodeScanner`) or by typing. Then confirm the nutrition, ingredients/allergens and single-serve format, and enter an expiry ≥ `MIN_DAYS_TO_EXPIRY` (90).
- Success sets `products.upc` (if empty), `verified_at/by`, P8/P9 PASS, and adds an audit line under the pre-screen line in notes. Refused when: the barcode differs from the one on file, the barcode belongs to another product, the label doesn't match, or the date is too short. "Not single-serve" records P8 FAIL.
- Tested: rejection paths in the browser against live data (nothing written), unit tests for every rule. **Not yet run:** a successful verification (it would mark a real product verified). The owner's first real check is that test.
- Not built yet: photo capture inside the flow (use the product page's photo upload), lot creation from the verified package (use Log purchase).

**Status, Oct 5 2026, later (clinician review #2 applied).**
- **Approval ladder:** Candidate → Pre-approved (pre-screen) → Approved (named clinician) → package verified (UPC + label in hand) → ready to pack. `lineupStage()` in `rules.ts` drives the box badges: FIX → READY · PROVISIONAL → CLEARED TO PACK.
- **P8 blank = unknown, not a pass:** Carb and Heart eligibility now need P8 = PASS. P8 was set to PASS on 21 products whose USDA label shows one serving per pack (noted in each pre-screen line). 15 non-rejected products are still unknown. P044's workbook PASS was cleared because no 1 oz pack is confirmed.
- **Candidates can't be in a lineup** (blocking check). Legacy workbook approvals (`status Approved` with no `reviewed_by`) count as not clinician-approved: they show "Legacy workbook approval: re-attestation needed" and get a **Re-attest approval** button. The pack gate requires a named approver.
- `Snack` now carries `clinicianApprovedBy` and `packageVerified` (from `toSnack`).
- The export has a **Ready to pack** column, and the Legend explains the ladder and the P8 rule.
- **Active lineups:** Pregnancy v2, Carb Conscious v3, Heart v3. They have no Candidates and no unconfirmed P8 picks, and all show READY · PROVISIONAL (14 picks each need clinician approval and a package check). Previous versions are archived (re-activate from Saved lineups). Backup: `ops/p8-backup-2026-10-05.json`.
- Eligible now: Pregnancy 40, Carb Conscious 34, Heart 40.

**Status, Oct 5 2026 (pre-screen + eligibility gates live; awaiting clinician).**
- **Box builder:** one-click **Build box**, "Leave out" allergen chips (same matcher as order avoid lists), a one-off snack mix (exact counts that must total the box size; the saved recipe is untouched), and plain-language recipe copy.
- **Clinician export:** Products → **Export for clinician** downloads a formatted `.xlsx` (`src/lib/admin/clinical.ts` rows + `clinical-xlsx.ts` formatting). The Review sheet puts decision columns first (status, pre-screen finding, yellow verdict/comment columns), then eligibility per box with reasons, P1–P9 with their meanings, nutrition, allergens and sources; a Legend sheet explains statuses, P1–P9 and the hard limits. No costs or vendors. Blank cells are written as truly empty, because `""` cells showed up as "66" in some viewers.
- **New status `Pre-approved`** (migration 0008): passed the source/ingredient pre-screen and is waiting for the clinician. Only `Approved` means clinician-approved; the lineup check still counts Pre-approved as not approved.
- **Pre-screen of all 97 products (Oct 5),** checked against USDA FDC branded label data, manufacturer sites, NIH DSLD, Open Food Facts and openFDA recalls (none relevant in 24 months).
  - Statuses: 54 Pre-approved; 17 "not recommended" set to Rejected with the reason (liquids, multi-serve bags, maltitol, 2,142 mg sodium…).
  - Data fixes: nutrition corrected in place on 52 versions, ingredients filled on 84 (there were none before), sat fat filled on 12 from sources.
  - Allergen flags fixed: P030 contains milk, P031/P051 contain wheat, P061 contains soy and wheat. Cocoa items' caffeine changed from 0 to blank.
  - Each product's notes start with a `[Pre-screen 2026-10-05 …]` verdict line, which the export shows as "Pre-screen finding".
  - `verified_at`/`verified_by` were left blank on purpose: they mean "label checked with the package in hand".
- **Eligibility gates (after the clinician's first review):**
  - "Eligible" = nutrition rules qualify (`fitFor`) + box hard limits + shipping policy + single-serve (P8 FAIL blocks every box) + status. `eligibleFor`/`eligibleBoxes`/`gateFailures` in `rules.ts` now drive badges, the box builder, the optimizer, orders, lineup checks and the export.
  - Hard limits live in `box_rules` (editable in each box recipe), defaults in `DEFAULT_BOX_RULES`. Current numbers are in the Oct 6 evening status at the top (Heart sodium is 140 mg since then, not 230).
  - Carb "fiber-forward" now also needs ≥3 g protein or nut/seed fat.
  - Eligible counts: Pregnancy 41, Carb Conscious 48 (was 80), Heart 50 (was 69).
- **Provisional lineups and the pack gate:** a READY lineup with any non-Approved pick shows **READY · PROVISIONAL**. `packShipment` refuses unless every pick is eligible, Approved, has a UPC and has `verified_at` (`packBlockers` in `rules.ts`).
- **Audit trail** (migration 0009): `prescreened_by/at` (pre-screen) is separate from `reviewed_by/at` (clinician decision). The product page has **Pre-approve** and **Approve (clinician)** buttons. The 11 workbook approvals show "Approved in workbook (approver not recorded)" and need the clinician to re-confirm them.
- **Lineups:** Carb Conscious and Heart v2 are active (built with minimal swaps after the gates; v1 archived). Pregnancy is still v1. All three are READY · PROVISIONAL (10 / 12 / 12 picks not yet Approved).
- **Undo/audit files** (gitignored, in `ops/`): `prescreen-backup-2026-10-05.json` and `gates-backup-2026-10-05.json` (rows before each change), `prescreen-plan-2026-10-05.json`, `prescreen-verdicts-2026-10-05.py`, and the latest `keniya-clinician-review-2026-10-05.xlsx`.

**Status, Oct 4 2026 (production set up).**
- The code for phases 1–5 of the plan is written, tested locally and merged to `main`; production runs it (Vercel deploy of `7b8194e`).
- **Live Supabase is set up.** Migrations 0006/0007 were applied by the owner and verified object by object: a catalog fingerprint of the live DB (349 columns, constraints, indexes, triggers, function bodies, grants, RLS, seeds, buckets) is identical to a fresh Postgres 17 built from `supabase/migrations/*`.
- **Workbook imported** from `ops/keniya-box-builder.xlsx` (v5): 97 products, Approved 11 / Candidate 84 / Rejected 2, 95 estimate prices, 3 active lineups of 14, 26 watchlist rows. Read back from the DB and spot-checked against the cells.
- The importer now finds Products columns by header (v5 inserted six stock columns after "Your quote $"; the old fixed letters read e.g. calories from "On hand"). v4 and v5 parse to byte-identical data.
- Smoke test: every `/admin` page renders 200 against live data with no server errors (local `next start` + live DB, throwaway password). Production: logged-out redirects, `noindex`, `robots.txt`, and anon REST/storage reads return nothing.

Read `ADMIN.md` (the operator guide) and `AGENTS.md` (Next 16 is different from what you know; read `node_modules/next/dist/docs/`) before changing code.

---

## 1. Setup (done Oct 4–5; kept for reference)

The previous session ran in a cloud container. It had no access to the owner's `.env`, and Vercel refused to show env vars (403). You need:

| What | Where | Why |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens. Owner creates it. | DDL via the Management API. The service-role key cannot run migrations. |
| `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` | Owner's `.env.local` | Import script and the app |
| `ADMIN_PASSWORD` | Vercel: set for **Production and Preview**. Owner says Production is done. Check Preview. | Admin login |
| `USDA_API_KEY` | Vercel. Owner says done. | Barcode lookups. `DEMO_KEY` is a rate-limited fallback. |
| Workbook | Owner's `ops/keniya-box-builder.xlsx` (gitignored; never commit it, the repo is public) | Import |

Steps:
1. Apply the migrations: `SUPABASE_ACCESS_TOKEN=... pnpm db:migrate` (0006–0009 are applied on production; the script skips applied ones).
   - It applies each missing migration through `POST /v1/projects/{ref}/database/query`, then verifies: tables exist, RLS is on with no policies, the RPCs are not executable by anon, and the photo bucket is private.
   - It should end with **"Database ready for the admin."**
   - Never run against a live API so far: check its output carefully. If the API rejects `begin; … commit;` wrapping, strip it.
   - Direct Postgres (port 5432/6543) was blocked from the cloud container. The HTTPS Management API was reachable.
   - The alternative is to paste the two SQL files into the Supabase SQL editor.
2. Import the workbook:
   - Dry run first: `pnpm import:workbook ops/keniya-box-builder.xlsx --dry-run`. Expected: **97 products, 12 missing nutrition, 2 no cost, Approved 11 / Candidate 84 / Rejected 2, all three boxes READY**. Landed cost: Pregnancy ≈ $34.41, Carb ≈ $38.22, Heart ≈ $35.44. Pregnancy was verified by hand against the Price Calculator.
   - Then run it without `--dry-run`. `--force` overwrites settings, rules and lineups.
   - **Don't re-run it casually any more:** it re-syncs products from the workbook and would overwrite the Oct 5 pre-screen corrections, statuses and notes.
3. Smoke-test production `/admin` (§4) and confirm with the owner.

## 2. What exists (map)

- **DB:**
  - `supabase/migrations/0006_admin.sql` creates:
    - products + `product_versions` (one `is_current` per product) + `product_photos`;
    - vendors, `vendor_prices`, `purchase_lots` (generated fractional `unit_cost_cents`) and the append-only `stock_movements`;
    - `box_rules` (jsonb), `box_lineups` (one active per box) and `lineup_items`;
    - `package_profiles` (seeded 12×9×4 default);
    - `shipments` (`code` KEN-######) and `shipment_items`;
    - `expenses`, `admin_settings` (single jsonb row) and `watchlist`.
  - RPCs: `pack_shipment` (FEFO, row-locked, aborts with `SHORTAGE` + JSON detail), `unpack_shipment`, `adjust_lot`.
  - Triggers: auto `P###` codes; receive ledger row + `vendor_prices` row on each lot insert.
  - `0007` adds the private bucket `keniya-admin` and `preorders.stripe_fee_cents` / `amount_net_cents`.
  - `0008` adds the `Pre-approved` product status.
  - `0009` adds `products.prescreened_by/at` and moves the pre-screen stamp out of `reviewed_by/at`.
  - `20261006025542_packing_safeguards.sql` + `20261006030933_admin_function_hardening.sql` (Codex audit): RPCs `pack_shipment_checked`, `activate_box_lineup`, `save_box_lineup`, `save_package_profile`, `set_lot_expiry`; `pack_shipment` now enforces current-formula, ≥ 90-day lots (same signature, so older app code still works); `shipments.avoid` column.
- **Pure logic (unit-tested, `pnpm test`, 75 tests)** in `src/lib/admin/`:
  - `rules.ts`: workbook formulas for "qualifies" (`fitFor`), final eligibility with hard limits (`eligibleFor`), the pack gate (`packBlockers`) and lineup checks;
  - `clinical.ts` + `clinical-xlsx.ts`: the clinician review export;
  - `verify.ts` (package-in-hand checks), `stock.ts` (held vs packable lots, pick lists), `packing.ts` (whole-box recipe and packing problems);
  - `costing.ts`: landed cost, Price Calculator port;
  - `optimizer.ts`: greedy + swap local search, 5 objectives, `canBuild`;
  - `purchasing.ts`, `postage.ts` (learns the median of ≥5 real labels per 4 oz band), `avoid.ts`, `pirateship.ts` (CSV in/out), `reports.ts`;
  - `openfoodfacts.ts`, `fdc.ts`, `lookup.ts` (USDA first, Open Food Facts fills gaps).
- **Server-side:**
  - `db.ts` (loaders), `summary.ts` (per-request context for the boxes and dashboard), `auth.ts` / `session.ts` (HMAC cookie; key derived from `ADMIN_PASSWORD` unless `ADMIN_SESSION_SECRET` is set), `ratelimit.ts` (Upstash or in-memory), `recall.ts`, `vendors.ts`.
  - `src/proxy.ts` gates `/admin/*`. Every server action in `src/actions/admin/*` also calls `requireAdmin()` (audited).
- **Pages:** `src/app/admin/(protected)/**`. Public pages moved to `src/app/(site)/`; URLs are unchanged.
- **Scripts:** `scripts/import-workbook.ts` + `scripts/workbook.ts`, `scripts/migrate-admin.ts`, `scripts/local-stack/` (local PostgREST harness + Playwright e2e).
- **Webhook:** `src/app/api/stripe/webhook/route.ts` stores the actual Stripe fee (`src/lib/stripe-fee.ts`). Planning a shipment retries the fee lookup if it's missing.

## 3. Not done / gaps (prioritized)

**P0: before the Nov 11 ship (owner / clinician)**
- Clinician (Laurie Pham, PharmD) reviews the export: confirms or changes the hard limits, approves products (**Approve (clinician)**), and re-confirms the 11 workbook approvals.
- Package verification: for every lineup pick, use **Verify** (`/admin/verify`) with the package in hand: scan the UPC, confirm label, serving format and expiry (≥ 90 days). Packing is blocked until this is done. (The Verify screen and the simpler box-builder table suggested by the clinician are built.)
- Do one real purchase → verify → pack → label → unpack cycle on a few products before the 150-box run; nothing has been run on real stock yet.
- Confirm P8 (single-serve) for the 15 products still unknown.
- Pre-screen follow-ups:
  - P044/P026: the brand's site lists only multi-serve bags; confirm a 1 oz pack exists.
  - P061: confirm the exact product (in the Carb lineup).
  - P097 (the single-serve size of P058) has no cost, so P084 replaced P058 in the Carb lineup; add a cost and swap it in.
  - Cocoa items need a caffeine estimate before any Pregnancy use.
  - Ginger teas (P032–P034) need a clinician call (the labels say to consult a practitioner if pregnant).
  - Chews and tea bags repacked from bags don't carry the full label, which the site promises.
- The site promises "only 50 of each" but checkout never stops at 50 (`src/actions/checkout.ts`); add a sold-out check.
- No live-money checkout has been tested yet (Stripe is live): buy one box and refund it.

**P0: production readiness**
1. §1 setup is done except `ADMIN_PASSWORD` on Vercel **Preview** (could not be checked: Vercel API returns 403 for env listing). Owner: confirm in Vercel → Settings → Environment Variables.
   - The 90-day minimum is now enforced when packing (fixed Oct 6), but it is a code constant (`MIN_DAYS_TO_EXPIRY` / `src/lib/admin/stock.ts`), not yet the Settings value from the workbook.
2. Not tested against live USDA (shared DEMO_KEY was rate-limited, own key not available in the container), live Stripe balance-transaction lookup, real phone camera scanning (BarcodeDetector on Android, ZXing fallback on iOS), real Supabase Storage uploads, or a real Pirate Ship CSV. Header matching is pattern-based and was tested only on a synthetic CSV; get a real export from the owner and adjust `readLabelCsv`.
3. Add `error.tsx` under `src/app/admin/(protected)/`. Loaders throw on Supabase errors (`must()`), and `createShipmentForPreorder` throws (it's a form action). Today the user sees the generic error page.

**P1: correctness / robustness**
4. **Non-atomic multi-step writes (partly fixed Oct 6).** Lineup saves/activation and package-profile saves are now atomic Postgres RPCs. Still compensating-delete style: `updateProduct` with a new formula version (close old, insert new) and `createProduct` (product, then version).
5. **PostgREST 1000-row cap (mostly fixed Oct 6).** The catalog, order planning/listing, dashboard, label import/export and recall trace now page through `allRows`. Not re-checked: reports queries; `loadPostageHistory` is capped at the latest 500 labels.
6. **Avoid-list matching (`avoid.ts`) is a heuristic**, now rechecked on swaps, extras, gifts/samples and again when packing (a conflict blocks planning/packing). Free-text matching is a curation aid, not an allergy interpreter: "may contain peanuts" labels make most nut products conflict with "peanuts", and customer free text still needs a person.
7. The optimizer with "Only in-stock" returns <14 picks when stock is thin, and the UI warns. `createShipmentForPreorder` falls back to the lineup when the avoid-optimizer fails. Revisit.
8. Dates use UTC (`toISOString`, `daysUntil`). Expiry tiers and "this month" can be off by a day near midnight in US time zones.
9. The import script overwrites product `notes` and nutrition on every run (it's a sync). Edits made in the UI to imported products are lost if it's re-run. Document this or add a `--products-only-new` mode.
10. `ensureVendor` matches by `ilike` and is not race-proof beyond a retry.
11. The session has no revocation except changing the password. The rate limiter is per-instance without Upstash.

**P2: features in the approved plan, not built**
12. **Phase 6, customers and feedback:**
    - `customers`, `feedback` and `customer_prefs` tables (next free migration number: 0010);
    - a public `/feedback/[token]` page (signed token, QR on the Packed-for-You card) where the customer rates each item (loved / good / okay / not for me) and picks send again / never send;
    - feed `Snack.loveRate` (currently always `null`, so the "Customer favorites" objective scores 0.5 for everything) and never-send exclusions into `planItems`.
13. Watchlist (26 ingredients imported into `watchlist`) is **not shown anywhere**. Ingredients are now filled on 84 products, so auto-flagging watchlist matches for P7a is possible: surface it on the product form.
14. Edit and delete for expenses, package profiles (deactivate) and vendors. There is no vendor detail page; price history per vendor exists only inside the product pages and the Purchasing summary.
15. A box size experiment helper (compare package profiles by actual label cost). Data is captured (`package_profile_id` on shipments) but there is no report yet.
16. Shipping analytics: zone is only known after the label. The postage estimate ignores zone pre-ship.
17. Individual admin accounts: `*_by` columns hold a free-text name from the login form. Swap in Supabase Auth later.
18. The public site's category counts in `src/lib/box.ts` could read the active lineups (plan item, optional).

## 4. Audit checklist (do this before calling it done)

- [x] `pnpm lint && npx tsc --noEmit && pnpm test && pnpm build` all pass. `next build` typechecks `scripts/` too.
- [x] `pnpm db:migrate --check` reports everything ✓ on production.
- [x] With the anon key: `select` on `products`, `purchase_lots`, `shipments` returns nothing, and `rpc('pack_shipment')` is denied.
- [ ] Photo bucket `keniya-admin` is private, and photos load only via signed URLs (product page).
- [ ] Logged out: `/admin/*` and `/admin/reports/export?table=preorders` (and `?table=clinical_review`) redirect to login (**verified by curl on production Oct 5**). Still to do: POSTing a server action without the cookie redirects and does not mutate.
- [x] Headers: `/admin` has `camera=(self)` and `X-Robots-Tag: noindex`; the public site still has `camera=()`. `robots.txt` disallows `/admin` (verified on production Oct 5).
- [ ] Pack gate: packing a shipment with a non-Approved or unverified pick returns the blocker list (unit-tested; not yet run end to end).
- [ ] Log purchase: 24 units for $11.99 shows $0.50/unit, the lot is created, and the ledger has a `receive` row and a `vendor_prices` row with `source=purchase`.
- [ ] Scan an unknown UPC on a real phone (iOS + Android). Prefill comes from USDA (with `USDA_API_KEY`) and from Open Food Facts, and the source is shown as unverified.
- [ ] Boxes: "Suggest lineup" gives READY for each box once there's stock. Save & activate creates a new version and archives the old one.
- [ ] Orders, with a Stripe **test** checkout:
  - [ ] the preorder appears and has `stripe_fee_cents`;
  - [ ] Plan, then Pack: stock drops by exactly 14, earliest expiry first;
  - [ ] Unpack restores it;
  - [ ] Pack again, export the Pirate Ship CSV, import the real Pirate Ship history CSV;
  - [ ] the label cost fills in, the status becomes shipped, and the order P&L is correct by hand.
- [ ] Recall from a lot lists the shipment; the CSV opens cleanly (formula injection is escaped).
- [ ] Reports: monthly P&L total equals the sum of the order P&L cards.
- [ ] Owner sign-off on the margin numbers vs the workbook Dashboard.

## 5. Local verification recipe (what the previous session did)

See `scripts/local-stack/README.md`: Postgres 16 + PostgREST 12 + `proxy.mjs`. Seed data used:

```sql
-- stock for each Heart lineup item (30 units) + one early-expiring lot to prove FEFO
insert into purchase_lots (product_id, product_version_id, purchased_at, qty, total_paid_cents, qty_remaining, expires_on, lot_code)
select li.product_id, pv.id, '2026-09-01', 30, 3000, 30, '2027-03-01', 'LOT-'||p.code
from lineup_items li join box_lineups bl on bl.id=li.lineup_id and bl.status='active' and bl.box_slug='heart'
join products p on p.id=li.product_id join product_versions pv on pv.product_id=p.id and pv.is_current;
insert into preorders (stripe_event_id, stripe_session_id, email, customer_name, amount_total, shipping, status, box_slug, avoid)
values ('evt_test1','cs_test_1','ana@example.com','Ana Test',4700,
 '{"name":"Ana Test","address":{"line1":"1 Main St","city":"Austin","state":"TX","postal_code":"78701","country":"US"}}','paid','heart','peanuts');
```

Results last run: every tab returned 200; `$0.50/unit`; optimizer READY; pack used `EARLY-*` first; 14 units deducted; an $8.14 label gave a profit of $12.75 (27.1%), which matches by hand; recall found 1 shipment; no page errors.

## 6. Owner context

- **Business:** Keniya sells condition-aware snack boxes (Pregnancy, Blood Sugar = `blood_sugar`, Heart, Gestational Diabetes, GLP-1, Postpartum), 14 snacks each, $47, founding runs 50 / 50 / 50 / 20 / 20 / 20, ships Nov 11 2026.
- **Owner wants:** phone-first purchase logging, accurate per-box and per-order cost, inventory, and shipments. Box fit follows clinical-style rules plus manual review.
- **Shipping:** Pirate Ship, USPS Ground Advantage / Cubic, default box 12×9×4. Pirate Ship appears to have **no public API**, so the integration is a CSV round trip. Live in-app label quotes would need Shippo, EasyPost or ShipEngine; ask the owner before adding a paid service.
- **Repo is public:** never commit costs, vendors or the workbook. Defaults in `types.ts` keep business costs at 0 on purpose.
