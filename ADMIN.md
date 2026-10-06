# Keniya Admin

`/admin` is where Keniya runs day to day. The flow is **buy → receive → qualify → build → sell → pack → ship → learn**, and it replaces the Box Builder workbook.

## One-time setup

1. **Environment variables (Vercel, plus `.env.local` for local work)**

   | Variable | Required | Purpose |
   |---|---|---|
   | `ADMIN_PASSWORD` | yes | The shared admin password. Changing it signs everyone out. |
   | `SUPABASE_SERVICE_ROLE_KEY` | yes | Admin tables are service-role only. The admin never falls back to the anon key. |
   | `USDA_API_KEY` | recommended | USDA FoodData Central barcode lookups. Free key at api.data.gov. |
   | `ADMIN_SESSION_SECRET` | optional | At least 16 characters. When unset, sessions are signed with a key derived from the password. |
   | `UPSTASH_REDIS_REST_URL` / `_TOKEN` | optional | Login rate limiting across instances. |

2. **Database.** Apply the migrations in order (Supabase SQL editor or `supabase db push`):
   - `supabase/migrations/0006_admin.sql` adds products (versioned), lots, the ledger, FEFO packing, lineups and shipments.
   - `supabase/migrations/0007_admin_storage_and_fees.sql` adds the private `keniya-admin` photo bucket and the Stripe fee columns.
   - Apply the later pre-screen migrations and `20261006025542_packing_safeguards.sql` for checked-lot packing, atomic lineup/package saves, manual-shipment avoid lists and recorded expiry corrections. Apply `20261006030933_admin_function_hardening.sql` afterwards to pin function search paths and restrict maintenance-function access.

   To check the migrations against a scratch database: `psql -d <scratch> -f supabase/tests/fefo.sql`.

3. **Import the workbook (local only; the workbook stays in `/ops`, which is gitignored)**
   ```bash
   pnpm import:workbook ./ops/keniya-box-builder.xlsx --dry-run   # report only
   pnpm import:workbook ./ops/keniya-box-builder.xlsx             # write
   ```
   - What gets imported:
     - all products, with nutrition, P1–P9 checks, roles and estimates;
     - Settings;
     - each box's current Builder picks, as an active lineup;
     - category ranges, taken from Slots;
     - the ingredient watchlist.
   - Re-running is safe: products upsert by `P###` code. Settings, rules and lineups are only written the first time, unless you pass `--force`.
   - The workbook's Vendor column is sourcing research, not a store you bought from. It is saved to each product's notes instead of the vendor list.

## Daily use

- **Log purchase** (header button, built for the phone):
  1. Scan the barcode or search.
  2. Enter the store, units and total paid. Unit cost is calculated for you.
  3. Optionally add the expiry date, lot code and a receipt photo.
  - An unknown barcode is looked up in USDA FoodData Central first, then Open Food Facts. The new product is prefilled and marked unverified, so check it against the label.
- **Verify** (package in hand, phone or packing table): the last step before a product can be packed.
  1. Scan the barcode: a handheld USB/Bluetooth scanner types into the box at the top (it's focused for you), or tap **Camera**, or type the digits. A known barcode opens its product; an unknown one is attached to the product you tap.
  2. Compare the label with what's on file (nutrition per pack, ingredients, allergen statement), confirm it's one sealed single-serve pack, and enter the expiry date (at least 90 days left).
  3. **Verify package** saves the UPC, marks it package-verified and sets P8/P9 to PASS. A mismatch is refused with the reason: fix the product first. Answering "not single-serve" records P8 FAIL, so the product drops out of the boxes.
  - Ready to pack = clinician-approved (named) + package-verified. Boxes show CLEARED TO PACK once every pick is ready; packing is blocked until then.
- **Products**
  - Eligibility badges per box, with the reason a snack isn't eligible.
  - Pre-approve (pre-screen), Approve (clinician; re-attest legacy approvals), reject (reason required) or retire.
  - Photos: front, nutrition facts, ingredients and barcode.
  - A provenance record ("Verified on · source · by").
  - "Reformulated?" saves a new formula version, so past shipments keep the nutrition they actually had. Label/formula edits clear approval and package verification; metadata-only edits preserve them. Verify again with the package in hand.
- **Boxes**
  - **Build box** fills all picks in one click (objective, allergen "Leave out", optional one-off snack mix).
  - **Products table** under the lineup: one row per product with stock, ✓ per box, approval, package check and expiry. **Add** puts it in a category with room; **Remove** takes it out; tap a row for the evidence (eligibility reasons, nutrition, allergens, pre-screen finding, links to the product and Verify). By default it shows only products eligible for this box.
  - Box recipe (category ranges, hard limits, type limits, box-specific minimums).
  - Live checks, an itemized landed cost and **Can build N**.
  - Save & activate creates a new lineup version.
- **Orders**
  1. **Plan.** Paid Stripe preorders become planned shipments. Avoid-list conflicts are swapped automatically when possible.
  2. **Pack.** Open the shipment, select its package, and pull the lots shown on its checklist. Check off each sealed pack; save swaps before checking. Optional scale weight is used for the shipping label. Packing requires current-formula lots with at least 90 days left, named clinician approval and package verification. Changed lots/items require a fresh checklist. Stock is deducted FEFO and costs are captured. **Unpack** returns stock and clears the old label/weight snapshots.
  3. **Pirate Ship.** Export the packed boxes and use Pirate Ship's *Import spreadsheet* (Order ID = `KEN-######`). Buy the labels there, then import Pirate Ship's shipment-history CSV back here. The actual label cost and tracking fill in and the boxes move to Shipped. You can also type them in on a shipment.
  - Gifts, samples and replacements are $0-revenue shipments, packed the same way; enter their allergies / foods to avoid when planning.
- **Purchasing.** A run planner merged across boxes: required + buffer − on hand, at the cheapest recent vendor price. Log shelf prices and quotes on a product's page.
- **Inventory**
  - Lots in FEFO order, with 30/60/90-day expiry tiers. Physical inventory includes held lots; builder capacity and purchasing count only current-formula units with at least 90 days left. Filter **Held — needs attention** to review blocked stock.
  - **Record / correct expiry** saves the printed date with a reason and audit note, without logging another purchase.
  - Waste, count corrections and returns, each with a reason. Every change is in the ledger.
  - **Recall / trace**: lot → shipments → customers, with a CSV export.
- **Reports**
  - P&L by month and by box, from what was actually packed and the real label cost.
  - Shipping analytics: by zone and carrier, delivery days, damage and loss rates, estimate vs actual.
  - Spend by vendor.
  - Other expenses.
  - CSV exports.
- **Postage estimates learn.** Once 5 real labels exist in a weight band, the estimate becomes their median, so surcharges show up on their own.

Curation aid only, not medical advice: final lineups need clinical sign-off.

The findings and validation boundary are recorded in [the stock and packing audit](docs/admin-stock-audit.md).

### Clinician export

Products → Export for clinician downloads an Excel snapshot. Start here gives instructions; Review prioritizes Pre-approved and legacy approvals with four yellow input columns (Decision, Comments, Reviewer, Review date). Clicking a product opens its evidence row on Details. Details includes all products, nutrition, Pregnancy checks, sources, product and label-version IDs. Legend explains current configured limits. Editing the workbook does not update approval in the admin: record returned decisions manually after checking the label version is still current. Product verification is not shipment readiness.
