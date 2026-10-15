# Product

<!-- Living doc owned by Sean. Update it in the same change whenever product rules or copy change. -->

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two equal primary users; every page must work for either.

- **The person navigating it:** someone pregnant, watching carbs (type 1, type 2, prediabetes), or eating for heart health. Situation: tired of reading labels and second-guessing snacks while managing a condition. Job: get snacks that fit, without doing the research.
- **The gift buyer:** a partner, parent, sister, daughter, friend or coworker buying for that person. Job: send something genuinely useful and caring without knowing the rules themselves.

## Product Purpose

Keniya is a condition-aware snack box that does the screening, label reading and selection so the customer has one less thing to figure out. Success: a customer (or gift recipient) opens a box of 14 snacks that fit their condition, with a Packed for You card on how we choose, and trusts it.

## Positioning

Condition-aware curation, not three generic boxes with different branding:

customer condition / life stage → applicable Keniya screening rules → eligible product pool → preferences and allergies → available inventory and substitutions → curated box → Packed for You card explaining how the box is chosen.

- Each condition has its own written screening; a snack must qualify for that condition before it can go in.
- Condition decides eligibility; preferences decide which eligible snacks are chosen.
- Keniya never diagnoses, treats, promises a clinical outcome, or gives individualized medical or nutritional advice.
- Clinical review: Laurie Pham, PharmD (PharmaGuide's clinical reviewer) reviews Keniya's box criteria and each season's lineups. It is a review of the box, not of the customer.

## Operating Context

- Boxes: six (Pregnancy Comfort, Blood Sugar (`blood_sugar`), Heart Wellness, Gestational Diabetes, GLP-1 Companion, Postpartum & Nursing). $47 each, 14 snack selections, free US shipping, refundable until it ships. First boxes ship November 11, 2026; after that orders ship as packed. The site says "order now", not "preorder"; a box opens for orders only when its lineup is clinician-approved, priced at $47 and has run size > 0, otherwise it shows a "Notify me" list form.
- Offers (Admin → Settings → Offers; all off by default, and the site shows only what is on): WELCOME20 first-box offer (20% off one one-time box or gift, one per email with no earlier order, applied as a Stripe coupon to a checkout locked to that email; claimed through the pop-up, which checks the email domain, adds the visitor to the list and emails the code); founding bonus (first N admitted orders, never renewals); Monthly Snack Club ($39/month, never gifts, no codes, skip 1–3 months / pause / cancel online at /club, a renewal for a box without an approved lineup is voided, not charged).
- Box composition: 14 snacks; "little extras" (drink sticks, tea, a sample) are promised on a box only when its live recipe sets an extras range in Admin → Boxes, and the site says "+ 2–4 little extras" only when all six do. Until then drink sticks count toward the 14.
- Gifting: any box can be a gift (home "It's a gift" toggle, /gifts, or each box page); the buyer's message is printed on a note in the box; receipts go to the buyer. "Send a hint" on /gifts shares a link that opens a box in gift mode. Corporate & team gifts (10+ boxes) are quote-based through /corporate-gifts; health boxes are chosen by each recipient, never assigned by condition.
- Checkout (Stripe) collects optional "Allergies or foods to avoid" and "Sweet or salty?" answers, stored on the order (`avoid`, `craving`). Quiz answers prefill them.
- One Packed for You card per box type (not personalized, not per snack): a welcome, what the box focuses on, 2–3 label tips, a QR code to the box page. Nutrient numbers come from each snack's sealed label.
- Box contents rotate by season; the site shows categories and counts, never specific snacks.
- Screening source of truth: the shared rule model and live box rules. Blood Sugar / GDM regular snacks: ≤15 g total carbs and ≤3 g added sugar per pack. Hydration: ≤3 g total carbs per stick, with 0 g added sugar preferred but not required. GDM also requires the complete Pregnancy screen. Heart, Pregnancy, Postpartum and GLP-1 retain their own standards. Exact-pack evidence and internal diligence must be complete before Keniya pre-approval and Laurie’s final review.
- Sister platform: PharmaGuide (pharmaguide.io), supplement and ingredient intelligence.

## Capabilities and Constraints

- Counting rule: 14 distinct selections; a multipack (chews, two tea bags) counts as one; small complimentary extras never count.
- Not supported yet: combining rule sets. Gestational diabetes (pregnancy + carb-conscious rules together) is waitlist-only until that intersection exists and is reviewed. Postpartum, GLP-1 and menopause are waitlist-only.
- Allergies: sealed original packaging, full labels; not an allergen-free facility; cannot rule out manufacturer cross-contact.
- Stack: Next.js on Vercel, Stripe Checkout + webhook, Supabase, Resend.
- Undecided: moving from 14 to more selections (waiting on real COGS); blood-sugar numeric thresholds (awaiting clinical confirmation).

## Brand Commitments

- Name: Keniya, from kɛnɛya, "health" in Dioula.
- Current headline: "Better snacks. Less guesswork." (October 2026 revamp; Wrapped & Sealed visual world, see DESIGN.md.)
- Footer: no FDA dietary-supplement disclaimer (Keniya sells conventional packaged food and makes no supplement claims); keep "not medical or nutritional advice" and the allergen reminder.
- Consumer terms: "Heart Wellness" / "heart-conscious" (not "heart healthy" in copy); "Carb Conscious", chosen with diabetes in mind (no keto or "low carb" promise, no outcome claims); "Keniya Pregnancy Screening"; "reviewed by a pharmacist" (Laurie is PharmD, not a dietitian).
- Voice: plain, warm, direct; short sentences; no medical claims.

## Evidence on Hand

- Clinical reviewer: Laurie Pham, PharmD; photo at public/images/laurie-pham.webp (from PharmaGuide's team page).
- Box images: public/images/box-*.jpg and hero-guide.jpg are placeholders (mockups that still show the old guide and "Balanced Blood Sugar"). Real photography is being swapped in: closed box, open box with all 14, the Packed for You card, lifestyle/unboxing (slot: public/images/lifestyle-gift.jpg), packaging detail, founder photo.
- No customers, reviews, testimonials, sales figures or press yet. Do not fabricate any of them; the only scarcity to show is the real 50 per box.

## Product Principles

1. Condition first: the customer's condition shapes the box, and the site should make that visible without becoming a technical explainer.
2. Honest by default: no invented proof, no outcome promises, no hidden counting tricks; claims stay bounded to what the screening and review actually do.
3. Do the reading for them: every surface should remove effort (clear choice, clear price, one card that explains).
4. Built for the giver too: gifting is a first-class path, not an afterthought.
5. Depth where it belongs: the homepage stays short and conversion-focused; methodology and condition detail live on the box pages.

## Accessibility & Inclusion

WCAG AA contrast (verified with Lighthouse: 100 accessibility on the key pages); reduced-motion users get a fully visible, non-animated page.
