# Developer feedback: verified fixes

Audit date: October 6, 2026. Starting checkout: `015116e` (the feedback referenced older commit `f110261`). Implementation is committed and released to production. All six new migrations are applied; required Stripe events and separate clinician access are configured. Real payment/refund transactions were not performed.

## Findings and resolution

| Feedback finding | Verified resolution |
| --- | --- |
| Paid order lost despite webhook success | Strict service-role database access; transactional `save_paid_order`; persistence errors return 500 before emails. Duplicate delivery preserves existing refund status. |
| Arbitrary admin name grants clinician approval | Separate, distinct `CLINICIAN_PASSWORD`; signed role and fixed Laurie Pham identity; service-only approval RPC checks role and evidence. Old sessions and untrusted legacy attestations invalidate. |
| Refunds absent locally | Current Stripe charge/refund/dispute state synchronizes PaymentIntent and local status; full/partial refunds and disputes block packing and shipping. Legacy orders bind their PaymentIntent through Stripe session lookup. |
| Founding limit is only marketing | Atomic database reservations, durable capacity locks and paid-order consumption; public founding limits come from explicit settings. |
| Checkout without ready approved lineup | Request-time readiness gate plus atomic expected rules/settings/lineup/clinical approval checks before reservation. Unavailable boxes show waitlist. |
| Invalid active lineup plans orders | Planning rejects non-READY and provisional picks/extras; allergy replacement uses approved products and refuses an unresolved conflict. |
| Generated-column barcode trigger | The newer committed `20261007010000` migration already fixed the specific access bug. A global registry now additionally closes concurrent cross-table collisions. |
| New receiving turns outer barcode into verified UPC | Explicit unit/outer-box choice; outer identity stored separately; receiving remains unverified until physical checking. |
| Sweetened beverages pass alternative pathways | Configurable beverage added-sugar hard gate before pathways, zero by default for Blood Sugar, Heart, GDM and GLP-1. Public wording derives from the gate. |
| Pre-approval bypasses diligence | Database evidence gate requires source, ingredient/allergen label, complete nutrients/weight, explicit screening decisions and confirmed serving. |
| Internal decisions populate clinician fields | Separate internal diligence and clinical decision audit fields; Candidate/internal rejection/retirement clear clinical fields. Clinical changes requested and rejection have their own decision state. |
| Invalid check digits verify | GS1 checks in application and database; historical invalid identities downgrade provenance and verification/approval. |
| UPC edits preserve provenance | Changed identity clears barcode sources/date/status, package verification and clinical/diligence conclusions. |
| Metadata/formula partial update | One transactional save with locks and stale-write protection; failed formula write rolls back metadata and prior current-version closure. |
| Unknown ingredients earn nut exception | Missing or blank ingredients cannot earn the exception. |
| Unconditional clinician review public claim | Shop/landing display actual active-lineup review state; hero describes the required workflow; structured offers use actual sale availability. |
| Rule change publishes claims against stale lineup | Rule edits deactivate active lineups; reservation compares exact current rules/settings under locks. Public pages evaluate at request time. |
| Malformed rules/default fallback | Missing live rows, malformed stored rules, database failures and malformed settings fail closed. Explicit prices/capacity required for sales. Defaults remain available to initialize admin settings, not as implicit commerce capacity. |
| Export ignores verified outer identity | Unit UPC and verified outer-pack barcode are separate columns; package identity can use the verified pack; export approval uses canonical clinical state. |
| Formula-level P9 | P9 removed from stored formulas and package verification; expiry remains package/lot evidence and packing checks lot expiry. |
| Three sale prices drift | Checkout rejects settings versus advertised-price mismatch and configured Stripe Price mismatch. Price changes need matching public and Stripe settings. |
| Duplicate checkout after failed response | Stable browser request key, database retry record and Stripe idempotency key; last-slot retry recovers its own hold. |
| Public abuse/anonymous waitlist insert | Durable checkout and waitlist limits; request origin/body limits; anonymous waitlist insert path removed; duplicate waitlist submissions do not resend email. |
| Missing CI/database suite | Push/PR workflow runs lint, typecheck, unit tests, build, fresh PostgreSQL migrations and database integration/concurrency tests. |

## Additional issues found during implementation review

- Unknown lineup products/extras previously disappeared from the readiness summary; missing items now block it.
- A package label mismatch only revoked physical verification, leaving clinical approval valid. A single transaction now revokes verification, diligence and approval and records the finding.
- Name, brand and category edits retained prior approval. Material identity changes now invalidate it; pricing/vendor/notes edits preserve it.
- Wall-clock reservation expiry could oversell when a paid webhook arrived late. Holds remain occupied until Stripe confirms expiry without payment.
- Failed Stripe creation or lost session binding could permanently consume capacity. Expired unbound holds are reconciled through complete Stripe session enumeration after a grace period. Uncertain outcomes stay occupied.
- Public catalog requests also reconcile holds so a sold-out UI cannot prevent cleanup.
- Internal raw settings/rule snapshots used by admission are stripped from client-facing sale data.
- Rules/settings/lineup/product changes invalidate existing admissions in the database; admin actions and import/backfill tools expire the affected Stripe sessions through the shared helper, including partial script failure.
- Financial observation revisions prevent a stale in-flight webhook from undoing newer refund/dispute state.
- Public pages, email composition, checkout, and exports use the canonical rules, identity, and approval predicates; stale anonymous service fallback, duplicated config accessors, formula P9 fields, and the partial live database test command were removed.
- Waitlist emails no longer promise a reserved spot or open preorders. Checkout retry keys reset only after a confirmed expired/stale request.

## Validation

Local checks passed: lint, TypeScript, 154 unit/action/email tests across 27 files and production build. The database suite applies every migration to a fresh PostgreSQL 16 database, runs ten SQL suites, and exercises actual parallel transactions for global barcode collision, founding capacity and physical-stock packing. CI runs the same database runner. Live verification additionally passed all 15 public-page/redirect checks, signed inert webhook delivery, rejection of unsigned webhooks, checkout rejection for all six unapproved boxes, and actual clinician/admin role sign-in. Arbitrary submitted names cannot change the clinician identity or grant an admin the clinician role. The staged release was tested with Vercel protection bypass before promotion. Payment/refund/dispute lifecycles were verified with mocked Stripe responses and real database tests, not live charges. PostgreSQL 16 test tooling was installed locally; the temporary scratch server was stopped after validation, and no background service was enabled.

To repeat database validation, create an empty local database named `keneya_test_<name>`, then set `DATABASE_URL` and run `pnpm db:test`. The runner refuses non-local hosts, non-test database names, and nonempty schemas. `PSQL` can name the PostgreSQL executable. Test-only Supabase roles/storage stubs are intentionally minimal; deployed REST/auth delivery still needs release verification.

## Release receipt

- Core implementation: `7e43c4c`; deployment artifact exclusion: `e98e3d5`. Changes are pushed to `main`; GitHub validation passed lint, TypeScript, all 154 tests, production build, fresh migrations and the database/concurrency suite. CI actions are pinned to verified Node 24 releases on Ubuntu 24.04.
- Production: https://keniyahealth.com. The tested release deployment `dpl_2miHco6FTZ4wmPSFXW7KL3Eod3Yo` (source `e98e3d5`) was built READY and promoted after schema and authenticated-role verification. Subsequent documentation/CI-only Git deployments use identical application source.
- Supabase project: `issfvpyewzlnxxdqrzqc`. All six `202610080*` migrations applied; 20 admin tables have RLS without public policies, 20 required RPCs exist with no anonymous/authenticated execution, and the photo bucket remains private.
- Preflight: 110 products, zero paid orders, zero barcode collision groups, and zero invalid barcode lengths. A private application-data snapshot of 20 existing tables plus function/schema metadata is saved under `ops/release-20261006T190427Z/`; this is a logical application snapshot, not a provider disaster-recovery backup.
- Final production log scan showed only the deliberate invalid-signature test (400), with no server failures.
- Missing live rules were explicitly initialized from the canonical rules module. Existing prices/capacities were preserved; missing prices were initialized to the advertised price and missing capacities to zero. Commerce never supplies these defaults during a request.
- Stripe endpoint `we_1UKqAhE2hXH694McjM2Ws9RV` now subscribes to all ten required checkout/refund/dispute events. The existing signing secret was verified against production with an inert signed event.
- Separate clinician access and session signing are configured. The clinician credential is stored privately in `ops/clinician-password.txt`; provide it to Laurie through a private channel and rotate/delete the local handoff copy afterward. It is excluded from Git and deployments.

Legacy workbook/internal approvals were revoked because they did not establish authenticated clinician approval. Checkout correctly remains on the waitlist until internal diligence, package evidence, genuine Laurie approval, and a compliant active lineup satisfy the shared gate. Those clinical decisions are business workflow, not unfinished engineering work.

## Legacy payment recovery containment

The old Stripe integration generated 15 still-valid recovery URLs, among 33 expired sessions (zero paid). Stripe rejects changing `after_expiration` through its session update API, and its expire endpoint only accepts open sessions. The new application never creates or distributes these URLs. Any legacy/recovered payment without an exact valid bound reservation is durably stored as `admission_hold`, receives no reserved-box confirmation, and cannot be planned, packed, or shipped. Financial updates cannot restore fulfillment eligibility. The operator must review/refund such a payment; the implementation does not automatically refund money. See [Stripe session update](https://docs.stripe.com/api/checkout/sessions/update) and [expiration rules](https://docs.stripe.com/api/checkout/sessions/expire).

See [checkout reconciliation operations](commerce-reconciliation.md) for safe handling of uncertain Stripe outcomes. Full refunds free founding capacity; partial refunds and unresolved/lost disputes retain capacity and block fulfillment.
