# Handoff: Keniya Admin (`/admin`)

**Status, Oct 4 2026 (production set up).**
- The code for phases 1–5 of the plan is written, tested locally and merged to `main`; production runs it (Vercel deploy of `7b8194e`).
- **Live Supabase is set up.** Migrations 0006/0007 were applied by the owner and verified object by object: a catalog fingerprint of the live DB (349 columns, constraints, indexes, triggers, function bodies, grants, RLS, seeds, buckets) is identical to a fresh Postgres 17 built from `supabase/migrations/*`.
- **Workbook imported** from `ops/keniya-box-builder.xlsx` (v5): 97 products, Approved 11 / Candidate 84 / Rejected 2, 95 estimate prices, 3 active lineups of 14, 26 watchlist rows. Read back from the DB and spot-checked against the cells.
- The importer now finds Products columns by header (v5 inserted six stock columns after "Your quote $"; the old fixed letters read e.g. calories from "On hand"). v4 and v5 parse to byte-identical data.
- Smoke test: every `/admin` page renders 200 against live data with no server errors (local `next start` + live DB, throwaway password). Production: logged-out redirects, `noindex`, `robots.txt`, and anon REST/storage reads return nothing.

Read `ADMIN.md` (the operator guide) and `AGENTS.md` (Next 16 is different from what you know; read `node_modules/next/dist/docs/`) before changing code.

---

## 1. Finish setup (blocking, do first)

The previous session ran in a cloud container. It had no access to the owner's `.env`, and Vercel refused to show env vars (403). You need:

| What | Where | Why |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens. Owner creates it. | DDL via the Management API. The service-role key cannot run migrations. |
| `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` | Owner's `.env.local` | Import script and the app |
| `ADMIN_PASSWORD` | Vercel: set for **Production and Preview**. Owner says Production is done. Check Preview. | Admin login |
| `USDA_API_KEY` | Vercel. Owner says done. | Barcode lookups. `DEMO_KEY` is a rate-limited fallback. |
| Workbook | Owner's `ops/keniya-box-builder.xlsx` (gitignored; never commit it, the repo is public) | Import |

Steps:
1. Apply the migrations: `SUPABASE_ACCESS_TOKEN=... pnpm db:migrate`.
   - It applies 0006 and 0007 through `POST /v1/projects/{ref}/database/query`, then verifies: tables exist, RLS is on with no policies, the RPCs are not executable by anon, and the photo bucket is private.
   - It should end with **"Database ready for the admin."**
   - Never run against a live API so far: check its output carefully. If the API rejects `begin; … commit;` wrapping, strip it.
   - Direct Postgres (port 5432/6543) was blocked from the cloud container. The HTTPS Management API was reachable.
   - The alternative is to paste the two SQL files into the Supabase SQL editor.
2. Import the workbook:
   - Dry run first: `pnpm import:workbook ops/keniya-box-builder.xlsx --dry-run`. Expected: **97 products, 12 missing nutrition, 2 no cost, Approved 11 / Candidate 84 / Rejected 2, all three boxes READY**. Landed cost: Pregnancy ≈ $34.41, Carb ≈ $38.22, Heart ≈ $35.44. Pregnancy was verified by hand against the Price Calculator.
   - Then run it without `--dry-run`. Re-running is safe; `--force` overwrites settings, rules and lineups.
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
- **Pure logic (unit-tested, `pnpm test`, 46 tests)** in `src/lib/admin/`:
  - `rules.ts`: workbook formulas for box fit + lineup checks;
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

**P0: production readiness**
1. §1 setup is done except `ADMIN_PASSWORD` on Vercel **Preview** (could not be checked: Vercel API returns 403 for env listing). Owner: confirm in Vercel → Settings → Environment Variables.
   - New in v5, not enforced: Settings "Min days to expiry when packing" (90). `pack_shipment` uses FEFO regardless of expiry; add a min-days setting and skip near-expiry lots (needs an RPC change).
2. Not tested against live USDA (shared DEMO_KEY was rate-limited, own key not available in the container), live Stripe balance-transaction lookup, real phone camera scanning (BarcodeDetector on Android, ZXing fallback on iOS), real Supabase Storage uploads, or a real Pirate Ship CSV. Header matching is pattern-based and was tested only on a synthetic CSV; get a real export from the owner and adjust `readLabelCsv`.
3. Add `error.tsx` under `src/app/admin/(protected)/`. Loaders throw on Supabase errors (`must()`), and `createShipmentForPreorder` throws (it's a form action). Today the user sees the generic error page.

**P1: correctness / robustness**
4. **Non-atomic multi-step writes.** `saveLineup` (insert lineup, then items, then activate), `updateProduct` with a new version (close old, insert new), and `createProduct` (product, then version) use compensating deletes, not transactions. Move them into Postgres RPCs.
5. **PostgREST 1000-row cap.** `loadCatalog` (`vendor_prices` grows with every purchase), the orders page (shipments `limit(1000)`), reports, `loadPostageHistory` (500) and preorder lists don't paginate. Fix this before roughly 1000 purchases or shipments. The CSV export already pages.
6. **Avoid-list matching (`avoid.ts`) is a heuristic.** Packing is **not blocked** when a conflict can't be auto-swapped: the shipment gets a note and staff must swap by hand. Consider blocking the pack button until conflicts are resolved, and showing conflicts per item on the shipment page. Note "may contain peanuts" labels make most nut products conflict with "peanuts".
7. The optimizer with "Only in-stock" returns <14 picks when stock is thin, and the UI warns. `createShipmentForPreorder` falls back to the lineup when the avoid-optimizer fails. Revisit.
8. Dates use UTC (`toISOString`, `daysUntil`). Expiry tiers and "this month" can be off by a day near midnight in US time zones.
9. The import script overwrites product `notes` and nutrition on every run (it's a sync). Edits made in the UI to imported products are lost if it's re-run. Document this or add a `--products-only-new` mode.
10. `ensureVendor` matches by `ilike` and is not race-proof beyond a retry.
11. The session has no revocation except changing the password. The rate limiter is per-instance without Upstash.

**P2: features in the approved plan, not built**
12. **Phase 6, customers and feedback:**
    - `customers`, `feedback` and `customer_prefs` tables (migration 0008);
    - a public `/feedback/[token]` page (signed token, QR on the Packed-for-You card) where the customer rates each item (loved / good / okay / not for me) and picks send again / never send;
    - feed `Snack.loveRate` (currently always `null`, so the "Customer favorites" objective scores 0.5 for everything) and never-send exclusions into `planItems`.
13. Watchlist (26 ingredients imported into `watchlist`) is **not shown anywhere**. Surface it on the product form next to P7a, and flag ingredient matches.
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
- [ ] Logged out: `/admin/*` and `/admin/reports/export?table=preorders` redirect to login. POSTing a server action without the cookie redirects and does not mutate.
- [ ] Headers: `/admin` has `camera=(self)` and `X-Robots-Tag: noindex`; the public site still has `camera=()`. `robots.txt` disallows `/admin`.
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

- **Business:** Keniya sells condition-aware snack boxes (Pregnancy, Carb Conscious = `blood_sugar`, Heart), 14 snacks each, $47, founding run 50 per box, ships Nov 11 2026.
- **Owner wants:** phone-first purchase logging, accurate per-box and per-order cost, inventory, and shipments. Box fit follows clinical-style rules plus manual review.
- **Shipping:** Pirate Ship, USPS Ground Advantage / Cubic, default box 12×9×4. Pirate Ship appears to have **no public API**, so the integration is a CSV round trip. Live in-app label quotes would need Shippo, EasyPost or ShipEngine; ask the owner before adding a paid service.
- **Repo is public:** never commit costs, vendors or the workbook. Defaults in `types.ts` keep business costs at 0 on purpose.
