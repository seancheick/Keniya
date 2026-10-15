# October 2026 revamp: what's built, and the switches that need Sean

Built in code (nothing deployed until approved): the Wrapped & Sealed storefront, Snack Facts label,
confident ordering copy, WELCOME20 pop-up and checkout coupon, founding bonus, Monthly Snack Club
(checkout, webhook renewals, renewal hold, reminders, /club self-service with skip 1–3 months /
pause / cancel and an optional reason), gifts "Send a hint", /corporate-gifts quote form, and the
"little extras" recipe range. Every offer ships switched off.

## Before turning anything on

1. **Database.** Done 2026-10-15: `20261015010000_snack_club.sql` applied to production with
   `pnpm db:migrate` (verified first on a scratch database with `pnpm db:test`).
2. **Stripe webhook events.** Done 2026-10-15: the live endpoint now also receives `invoice.created`,
   `invoice.paid`, `invoice.upcoming`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. **Stripe Billing settings.** Done 2026-10-15 by Sean (Dashboard only, Settings → Billing → Subscriptions and emails):
   Prevent failed payments → Upcoming renewal events → "Create an event for upcoming invoices", 7 days.
   Customer emails: leave Stripe's "upcoming renewals" email off (Keniya sends its own with the skip link);
   turn on expiring-card and failed-card emails. Payment method updates: "Link to a Stripe-hosted page".
4. **Clinician approval.** Boxes stay on "Notify me" until each lineup is approved and ready.

## Switches (Admin → Settings → Offers)

- **Promo codes (Admin → Promo codes):** create vendor/partner codes with % off, an optional cap and
  expiry; customers type them at checkout on one-time boxes. Orders record the code, so the page shows
  each code's orders and revenue.
- **First-box offer (WELCOME20):** on/off, code, percent, max uses. A new percent or cap starts a new
  Stripe coupon, created on the first qualifying checkout.
- **Founding bonus:** on/off, first N orders (set N to the bonus stock you have), description.
- **Monthly Snack Club:** on/off, price. Check each box's cost card first (target ≥25% contribution).

## Recipes (Admin → Boxes → recipe)

To promise "14 snacks + 2–4 little extras": set the box's Hydration range to 0, set Little extras
2 and 4, add 2–4 eligible extras in the box builder, re-activate, and send the lineup for review. The
site switches its copy per box automatically, and site-wide once all six promise extras.

## After November 11

Capacity is the run size per box (it counts one-time boxes and each Snack Club first box, never
renewals). Raise run sizes in Settings as stock allows so the shop stays open.

## Still open

- Real photography to replace the rendered example images (Sean).
