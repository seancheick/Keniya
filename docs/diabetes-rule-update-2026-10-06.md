# Blood Sugar / GDM rule correction — 2026-10-06

Applied to shared defaults, configurable admin rules, live Blood Sugar/GDM rows, eligibility, optimizer, public copy and clinician review. All 110 current products replayed against all six boxes. Other four live rule rows unchanged; their eligibility results unchanged.

Regular snacks: ≤15 g total carbs / ≤3 g added sugar per pack. Hydration: ≤3 g total carbs per stick, without a zero-added-sugar gate. Zero added sugar receives a small optimizer preference when options are comparable. GDM independently retains the complete Pregnancy screening.

## Catalog changes

| Box | Eligible before | Eligible after | Newly eligible | Newly ineligible |
| --- | ---: | ---: | --- | --- |
| pregnancy_comfort | 31 | 31 | None | None |
| blood_sugar | 36 | 33 | P110 | P015, P017, P030, P103 |
| heart | 35 | 35 | None | None |
| gestational_diabetes | 17 | 16 | P110 | P030, P103 |
| glp1 | 36 | 36 | None | None |
| postpartum | 31 | 31 | None | None |

P110 (3 g total carbs / 1 g added sugar) now passes Blood Sugar hydration and GDM based on its currently recorded Pregnancy checks. It remains Candidate with incomplete internal diligence, including the sugar-alcohol field and exact-label evidence, and is excluded from Laurie’s packet. No clinical approval or physical package verification was manufactured.

P015 and P017: 16 g carbs / 4 g added sugar. P030: 17 g carbs / 0 g added sugar. P103: 17 g carbs / 4 g added sugar. All now fail the new snack ceiling in the listed boxes. P015/P017 were already outside GDM because of separate screening holds.

All 14 rejected products were reviewed; none was rejected solely because a hydration stick had 1–2 g added sugar. Their shipping, single-serve and other existing holds remain. The 10 exact-pack exclusions from the prior evidence audit remain excluded from every regenerated proposal. P021 remains outside Heart at 180 mg sodium.

## Lineups and N-1

No active lineup before or after. All six current operator proposals were rebuilt from scratch under their own effective rules and saved as new drafts; old drafts archived. No activation or approval.

| Box | Optimizer candidates before → after | Filled picks before → after | New draft | Remaining blocking checks |
| --- | --- | --- | --- | --- |
| pregnancy_comfort | 28 → 28 | 14 → 14 | v5 | Unreviewed picks (Candidate): 14 (need ≤ 0) |
| blood_sugar | 34 → 31 | 14 → 14 | v5 | Unreviewed picks (Candidate): 14 (need ≤ 0) |
| heart | 33 → 33 | 14 → 14 | v6 | Unreviewed picks (Candidate): 14 (need ≤ 0) |
| gestational_diabetes | 15 → 14 | 12 → 11 | v4 | Selections filled: 11 (need 14); Unreviewed picks (Candidate): 11 (need ≤ 0); Savory picks: 1 (need 3–6); Substantial selections: 6 (need ≥ 8); Protein- or fiber-forward picks: 4 (need ≥ 5) |
| glp1 | 34 → 34 | 14 → 14 | v3 | Unreviewed picks (Candidate): 14 (need ≤ 0) |
| postpartum | 28 → 28 | 14 → 14 | v4 | Unreviewed picks (Candidate): 14 (need ≤ 0) |

N-1 resilience remains unqualified for every box: each baseline lineup fails a blocking check before removing any product. Blood Sugar still fills 14 operator picks; GDM falls from 12 to 11 with composition gaps. A product being rule-eligible does not establish a feasible, reviewed lineup.

## Public copy and clinician packet

Blood Sugar and GDM now distinguish snack limits from “Hydration picks: 3 g total carbs or less per stick.” They describe zero added sugar as preferred, never required. Individual manufacturer claims are unchanged. The admin hydration ceiling, public standards, recipe copy and packet limits share `beverageCarbsMax`. Heart, Pregnancy, Postpartum and GLP-1 public standards retain their own limits.

The clinician packet now excludes incomplete evidence, failed lineups, held extras and unresolved clinician changes. It currently contains zero review-ready products, because no current product has completed internal diligence. The operator workbook retains every hold and proposed pick. Laurie’s account opens a focused finished-review page and cannot browse the unfinished catalog or download internal exports. Her decisions are also checked against current packet admission.

## Verification

Regression coverage includes inclusive snack/hydration boundaries, configurable hydration ceilings, food-role bypass prevention, live rule cache separation, GDM pregnancy screening, unchanged Heart/GLP-1 beverage gates, optimizer zero-sugar preference with sugared fallback, held-product packet exclusion and clinician route isolation. Full test suite, lint, type checking and production build are checked before release. See the final handoff for deployment/CI confirmation.

Operator artifacts: `outputs/2026-10-06-diabetes-rule-update/`. Detailed replay: `docs/diabetes-rule-replay-2026-10-06.json`. No costs, credentials or customer records are included in this report.
