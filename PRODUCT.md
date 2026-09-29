# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two equal primary users; every page must work for either.

- **The person navigating it:** someone pregnant, watching blood sugar (type 1, type 2, prediabetes), or eating for heart health. Situation: tired of reading labels and second-guessing snacks while managing a condition. Job: get snacks that fit, without doing the research.
- **The gift buyer:** a partner, parent, sister, daughter, friend or coworker buying for that person. Job: send something genuinely useful and caring without knowing the rules themselves.

## Product Purpose

Keniya is a condition-aware snack box that does the screening, label reading and selection so the customer has one less thing to figure out. Success: a customer (or gift recipient) opens a box of 14 snacks that fit their condition, with a guide explaining why each one is there, and trusts it.

## Positioning

Condition-aware curation, not three generic boxes with different branding:

customer condition / life stage → applicable Keniya screening rules → eligible product pool → preferences and allergies → available inventory and substitutions → curated box → Packed for You guide explaining the selection.

- Each condition has its own written screening; a snack must qualify for that condition before it can go in.
- Condition decides eligibility; preferences decide which eligible snacks are chosen.
- Keniya never diagnoses, treats, promises a clinical outcome, or gives individualized medical or nutritional advice.
- Clinical review: Laurie Pham, PharmD (PharmaGuide's clinical reviewer) reviews Keniya's box criteria and each season's lineups. It is a review of the box, not of the customer.

## Operating Context

- Boxes: Pregnancy Comfort, Balanced Blood Sugar, Heart Wellness. $47 each, 14 snack selections, free US shipping, one-time purchase (no subscription), refundable until it ships. Founding release: 50 of each; ships November 11, 2026.
- Gifting: "It's a gift" at checkout; the buyer's message is printed in the recipient's Packed for You guide; receipts go to the buyer.
- Checkout (Stripe) collects an optional "Allergies or foods to avoid" answer, stored on the order.
- One Packed for You guide per box (not 14 cards): name, box/condition, preferences, what's inside, why each was chosen, relevant label info, QR for more, thank-you note.
- Box contents rotate by season; the site shows categories and counts, never specific snacks.
- Screening source of truth: the Box Builder workbook (Pregnancy P1–P9; Blood Sugar four qualifying pathways, thresholds pending clinical confirmation; Heart roles plus enforced box-level limits).
- Sister platform: PharmaGuide (pharmaguide.io), supplement and ingredient intelligence.

## Capabilities and Constraints

- Counting rule: 14 distinct selections; a multipack (chews, two tea bags) counts as one; small complimentary extras never count.
- Not supported yet: combining rule sets. Gestational diabetes (pregnancy + blood-sugar rules together) is waitlist-only until that intersection exists and is reviewed. Postpartum, GLP-1 and menopause are waitlist-only.
- Allergies: sealed original packaging, full labels; not an allergen-free facility; cannot rule out manufacturer cross-contact.
- Stack: Next.js on Vercel, Stripe Checkout + webhook, Supabase, Resend.
- Undecided: moving from 14 to more selections (waiting on real COGS); blood-sugar numeric thresholds (awaiting clinical confirmation).

## Brand Commitments

- Name: Keniya, from kɛnɛya, "health" in Dioula.
- Headline to keep: "The snack box that did the label reading for you."
- Consumer terms: "Heart Wellness" / "heart-conscious" (not "heart healthy" in copy); "Balanced Blood Sugar" (not "diabetes-friendly"); "Keniya Pregnancy Screening".
- Voice: plain, warm, direct; short sentences; no medical claims.

## Evidence on Hand

- Clinical reviewer: Laurie Pham, PharmD; photo at public/images/laurie-pham.webp (from PharmaGuide's team page).
- Box images: public/images/box-*.jpg and hero-unboxing.jpg are placeholders (their mock lists show old snack names). Real photography is pending: closed box, open box with all 14, the guide, lifestyle/unboxing (slot: public/images/lifestyle-gift.jpg), packaging detail, founder photo.
- No customers, reviews, testimonials, sales figures or press yet. Do not fabricate any of them; the only scarcity to show is the real 50 per box.

## Product Principles

1. Condition first: the customer's condition shapes the box, and the site should make that visible without becoming a technical explainer.
2. Honest by default: no invented proof, no outcome promises, no hidden counting tricks; claims stay bounded to what the screening and review actually do.
3. Do the reading for them: every surface should remove effort (clear choice, clear price, one guide that explains).
4. Built for the giver too: gifting is a first-class path, not an afterthought.
5. Depth where it belongs: the homepage stays short and conversion-focused; methodology and condition detail live on the box pages.

## Accessibility & Inclusion

WCAG AA contrast (verified with Lighthouse: 100 accessibility on the key pages); reduced-motion users get a fully visible, non-animated page.
