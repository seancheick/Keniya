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

   To check the migrations against a scratch database: `psql -d <scratch> -f supabase/tests/fefo.sql`.

3. **Import the workbook (local only; the workbook stays in `/ops`, which is gitignored)**
   ```bash
   pnpm import:workbook ./ops/keniya-box-builder_v4.xlsx --dry-run   # report only
   pnpm import:workbook ./ops/keniya-box-builder_v4.xlsx             # write
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
- **Products**
  - Fit badges per box, with the reason a snack doesn't fit.
  - Approve, reject (reason required) or retire.
  - Photos: front, nutrition facts, ingredients and barcode.
  - A provenance record ("Verified on · source · by").
  - "Reformulated?" saves a new formula version, so past shipments keep the nutrition they actually had.
- **Boxes**
  - Composition rules (category ranges, type limits, box-specific minimums).
  - "Suggest lineup" with an objective: best margin, use expiring stock, use overstock, customer favorites, or balanced.
  - Live checks, an itemized landed cost and **Can build N**.
  - Save & activate creates a new lineup version.
- **Orders**
  1. **Plan.** Paid Stripe preorders become planned shipments. Avoid-list conflicts are swapped automatically when possible.
  2. **Pack.** Stock is deducted earliest-expiry-first (FEFO) and the actual costs are captured. **Unpack** returns the stock.
  3. **Pirate Ship.** Export the packed boxes and use Pirate Ship's *Import spreadsheet* (Order ID = `KEN-######`). Buy the labels there, then import Pirate Ship's shipment-history CSV back here. The actual label cost and tracking fill in and the boxes move to Shipped. You can also type them in on a shipment.
  - Gifts, samples and replacements are $0-revenue shipments, packed the same way.
- **Purchasing.** A run planner merged across boxes: required + buffer − on hand, at the cheapest recent vendor price. Log shelf prices and quotes on a product's page.
- **Inventory**
  - Lots in FEFO order, with 30/60/90-day expiry tiers.
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
