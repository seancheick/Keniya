# Screening system reset: plan (October 18, 2026)

**Decision (owner):** stop reviewing hypothetical products. A clinician approves the rules once. After that, Keniya screens any snack automatically from its verified label. Only genuine uncertainty is escalated.

**Approach:** don't rebuild. Most of the system already exists. These are the pieces that are missing.

## What exists vs. what's missing

| Directive | Today | Gap |
|---|---|---|
| One deterministic engine, six rule sets | `eligibleFor` (`src/lib/admin/rules.ts`). GDM inherits Pregnancy + Blood Sugar. Live rules are in `box_rules` | None |
| An exact reason for every result | Each reason has a code (`ReasonCode`, 23 codes) | None |
| ✅ PASS / ❌ FAIL / 🟡 HOLD | Results are yes/no only. Missing data and a broken rule both show as "doesn't fit" | **Add the three states.** Missing, estimated or unresolved data → HOLD; a confirmed violation → FAIL |
| Ingredient rulebook (BLOCK / REVIEW / ALLOW) | Built-in lists in `ingredients.ts` (no-gos, dyes, sugar alcohols, review flags) plus the `watchlist` table (ingredient, why, source, reviewed_on) | **Add action, boxes, basis (evidence or Keniya policy) and rule version.** Show code and table rules as one list |
| Missing data never passes | Already enforced: missing nutrition or ingredients, unknown caffeine and blank checks all block | Show these as HOLD, not FAIL |
| Rules versioned and signed once | `box_rules` has `updated_at` / `updated_by` only, with no version or sign-off | **Add a rule version with its sign-off** (reviewer, credentials, date). Every result records the rule version used |
| No per-product clinician approval | Packing needs `isClinicianApproved` (Laurie, per product). Purchases above `samplePurchaseMax` need a reason | **Change the gate:** a product is production-eligible when (a) the package has been verified in hand, (b) it PASSes, and (c) the rule version is signed |
| P1, P2, P7a, P7b, P8 need a person | Pre-filled once, in bulk, on 54 products by a script | **Have the engine derive them** from ingredients and the label every time. Judgment cases (jerky, botanicals) → HOLD |
| Snap a photo → yes/no | Barcode → USDA / Open Food Facts lookup (`lookup.ts`). The Verify flow checks the package. No photo reading | **Photo reading in the admin:** photograph the label, AI fills the fields, a person confirms, the engine screens. Unreadable fields stay empty → HOLD |
| Grid of boxes with ✓ / ✗ and why | The product page lists eligibility | One grid on the product page and the product list |
| Box builder uses only verified stock | Packing already requires lots, verification and eligibility | Remove the clinician step (see the gate above). Add nut and seed variety limits |
| Inventory kept separate from screening | Already separate: cost lives only on purchase lots and never affects eligibility | None |
| Recalls | `recall.ts` exists | Check its coverage in phase 4 |

## Phases (each one shipped, tested and merged on its own)

1. **Results and gate.**
   - PASS / FAIL / HOLD from the existing reason codes.
   - Box grid on the product page and list.
   - The engine derives P1/P2/P7a/P7b/P8.
   - The packing and purchase gate becomes "verified + PASS + signed rules" instead of per-product approval.
   - Fixture tests for each state, allergens, missing values and overlapping boxes (GDM).
2. **Versioned rulebook.**
   - Rule version and sign-off on `box_rules`.
   - Watchlist rows get an action, boxes and a basis.
   - `docs/screening-standard-v1.md` is **generated from the live rules and code**, so the spec can't drift from what runs.
   - That document is what Laurie signs, once.
3. **Photo intake.**
   - Admin → Add snack → photos (phone camera).
   - AI extraction → prefilled form showing which fields it couldn't read.
   - Confirm → screened instantly → save → log a purchase.
4. **Catalog reset and box builder.**
   - The current 109 products are samples: none has been verified in hand, so none can be packed. They stay as history.
   - Products that fit no box are retired (status change, reversible).
   - Box builder: at most 2 picks dominated by one ingredient, plus a nut and seed cap.
   - Drafts are rebuilt only from verified stock once purchases exist.

## The reviewer's corrections under the new system

- **Biena chickpeas in Heart:** the engine already refuses it (190 mg sodium > 140). It was placed in Blood Sugar only; the Heart swap was a manual suggestion. Once the gate is in place, a swap can't override a rule. This is the reviewer's own point.
- **HIPPEAS 18 g vs 15 g:** settled by the package in hand at scan time. Nothing to debate in advance.
- **Applesauce, ginger tea, cheese crackers, jerky:** no product debate. Each becomes a rulebook row (BLOCK / REVIEW / ALLOW, with a stated basis). Jerky stays REVIEW (HOLD) for pregnancy as Keniya policy, not as a claim that it's unsafe.
- **Chocolate caffeine:** already shown as an "estimate", never "verified". An estimate above half the cap is a HOLD until the maker's value is in.
- **GLP-1 tolerability:** `giTolerabilityFlags` exists. It stays information for the box builder, not a pass/fail.
- **Lactation claims:** the public copy makes none (checked in `landing.ts`, `box.ts`). The wording to avoid was only in the clinician document.
- **Nut and seed variety:** a box-builder rule, not a screening rule.

## Decisions (owner, October 18)

1. **Approval model:** a product is eligible when its package is verified in hand and it passes the rules. There is no per-product approval. Laurie's earlier validations are the sign-off for v1.0, and nothing more goes to her for routine products.
2. **Pregnancy and Postpartum sodium:** at most 360 mg per pack, as Keniya policy. FDA's 2024 "healthy" claim allows 230 mg for an individual food. Migration `20261019020000` is written but **not applied** until this is confirmed.
3. **Photo reading:** done in Claude Code with no API key. The `keniya-scan` skill transcribes the label, `pnpm screen` answers per box, and nothing is written.
4. **Samples that fit no box:** delete them permanently. The owner runs `pnpm products:delete <codes> --apply`; it is a dry run without `--apply`.
5. **Defaults kept without a new review:**
   - jerky and cured meat are out of the pregnancy family (Keniya policy);
   - concentrated botanicals hold;
   - Heart treats stay at 8 g added sugar;
   - sweeteners are information only.

## Done in this change (phases 1, 3 and part of 4)

- PASS / FAIL / HOLD per box (`screenResult`). The product list and product page show ✓ / ? / ✕ with the reason.
- P1, P2, P7a and P7b come from the ingredient screen, and P3–P6 from the label data. Only P8 is set by hand.
- A caffeine estimate over the limit is a HOLD (get the maker's value), not a FAIL.
- The gate is verified package + PASS:
  - in the app: lineups, orders, purchasing, checkout;
  - in the database: migration `20261019030000`, applied live October 18.
  The clinician review page stays as an optional record.
- Public copy now says the pharmacist reviewed the criteria, not each lineup.

**Next:** the box builder becomes one Snack Facts card per box, showing the live limits and each pick against them, with a simple scan → build → order → fix → pack flow.
