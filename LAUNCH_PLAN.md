# Keniya — Launch Plan: Validation Sprint + Website Build

> **Status:** plan finalized and saved (2026-07-15). Execution deferred — build starts when Sean says go.

## Context

Sean's wife is pregnant and can't figure out what snacks are safe/tolerable — the classic founder-market-fit moment. The ChatGPT conversation landed on a sound thesis: **condition-aware curated snack boxes** (pregnancy first, blood sugar second), where the box is the first delivery mechanism for an ingredient-intelligence brand that later connects to PharmaGuide. Research (July 2026) confirms the white space: **no pregnancy-snack-specific or gestational-diabetes-specific box exists**; Bump Boxes is alive but bleeding trust (Trustpilot complaints); GD prevalence is 8.3% and up 36% since 2016; 3.63M US births/yr. It also confirms the danger: food boxes are the worst-churning subscription category (12–18%/mo) and food/bev paid CAC averages $47.50 — so we validate with **one-time preorders + organic content**, not subscriptions + ads.

**Decisions made (user-confirmed):**
- **Brand:** Keniya (from *kɛnɛya*, "health" in Dioula) — domain **keniyahealth.com** ($11.25, available via Vercel; also grab keniyabox.com defensively). No trademark conflicts found; formal USPTO knockout search before LLC/trademark filing.
- **Scope:** Preorder MVP — animated marketing site showing the full 3-box line (Pregnancy Comfort · Balanced Blood Sugar · Heart Wellness). **Sell one, show three:** Pregnancy Comfort is purchasable (one-time preorder via Stripe Checkout); Blood Sugar + Heart are "coming soon" with per-box waitlists. Whichever waitlist grows faster becomes box #2 (~2–3 weeks later — flipping it on just means adding a Stripe price). Single-SKU ops for the first batch, full platform vision on the site.
- **PharmaGuide:** subtle trust line only ("Curated with PharmaGuide ingredient intelligence" on About + why-cards). No co-branding yet.
- **Box format:** 12 items · $47 · **one-time purchase only at launch**. Category structure (constant across all boxes, items rotate per condition): 3 comfort/gentle · 3 protein/fiber · 2 hydration · 2 sweet · 2 savory. Validation-batch COGS at retail (~$22–28 items + ~$5 packaging + ~$9–12 shipping) ≈ break-even at $47 — acceptable, first 50 boxes are paid market research; Faire wholesale later cuts item cost 30–50%. Tiers later, not at launch: Mini 8 items ($29–32), Deluxe 16–18 items ($69–79). Subscriptions deferred (food boxes churn 12–18%/mo): add "Subscribe & save" ($39–44/mo, trimester-adaptive contents) only when ≥30% of first-batch buyers reorder or request it — the post-purchase survey collects that signal from day one.

- **Box roadmap filter:** a new box qualifies only if (1) eating is genuinely confusing or scary for that condition, (2) there's a diagnosis-moment or life-stage urgency, (3) the niche is underserved, and (4) ingredient intelligence adds real value. Passing candidates for later: **Gestational Diabetes variant, GLP-1 companion box (Ozempic/Wegovy users — tiny appetite, protein-dense small portions, nausea; same psychology as T1 pregnancy and a wide-open niche), Menopause, Postpartum Recovery, PCOS, TTC.** Rejected: protein/workout-recovery boxes — the most saturated snack category alive, no confusion/urgency, Amazon variety packs own it on price, and every Keniya box already carries 3 protein/fiber items. Mechanic: every future box appears first as a coming-soon waitlist tile (zero inventory); waitlist size decides what goes live; max one new live box per month.

**Goal:** preorders live in ~2 weeks; 25 preorders in the first 14 days = go signal.

---

## Part 1 — Business validation sprint (Week 0, runs parallel to build)

**Owners: Sean + wife (physical/ops), Claude (digital/copy/design).**

| # | Task | Owner | Notes |
|---|------|-------|-------|
| 1 | Buy keniyahealth.com + keniyabox.com (~$23) | Sean | Via Vercel domains. Also claim @keniyahealth on IG/TikTok (manual). |
| 2 | LLC filing + EIN (async, don't block launch) | Sean | Separate entity from PharmaGuide. |
| 3 | State sales-tax permit → resale certificate | Sean | Needed to buy inventory tax-free later; Stripe Tax handles collection. |
| 4 | Food liability insurance | Sean | FLIP ~$299/yr or similar ($25–45/mo). Reseller of sealed goods = low end. |
| 5 | Sourcing run: Trader Joe's + Costco (~$190) | Wife | Build 2–3 physical Pregnancy Comfort prototypes per the 12-item list, plus a small flat-lay set of representative Blood Sugar / Heart items for the coming-soon imagery. Keep ALL manufacturer packaging intact (allergen labels must stay visible). |
| 6 | Packaging order (~$250) | Wife | Amazon kraft mailer boxes + crinkle filler; Sticker Mule logo stickers + insert cards. |
| 7 | Photo/video day | Both | Natural light flat-lays + unboxing video. Premium feel dies with bad photos. |
| 8 | "Why it's in your box" cards — design + copy | Claude | The signature differentiator. Print via Sticker Mule/Canva. |
| 9 | Legal one-pager check | Sean | 30-min consult (or async service) on allergen disclosure for resold sealed goods — the one genuinely unclear regulatory point. |

**Copy guardrails (enforced everywhere, site + cards + social):** "curated for," "designed with X in mind," "many women reach for…" — never "treats," "relieves," "controls blood sugar," "safe for all pregnancies." FDA disclaimer near footer. FDA facility registration NOT required (retail establishment exemption — we resell sealed products direct-to-consumer only).

---

## Part 2 — Website build (Week 1, days D1–D7)

### Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 (CSS-first `@theme`) · shadcn/ui + 21st.dev components (+ Magic MCP for custom sections) · **GSAP 3.14 only** (fully free incl. SplitText/ScrollTrigger — no framer-motion) · Lenis smooth scroll · Supabase (waitlist + preorders) · Stripe hosted Checkout (`mode:'payment'`) · Resend + React Email · Upstash rate limiting · Vercel.

Repo: **/Users/seancheick/Keneya** (currently empty). Port patterns (not files) from `/Users/seancheick/PharmaGuide Website`: `src/lib/env.ts` (boot-validated env), `src/lib/rate-limit.ts`, `src/lib/resend.ts`, server-action form pattern (`src/actions/subscribe.ts`), `robots.ts`/`sitemap.ts`/`opengraph-image.tsx`, security headers in `next.config.ts`, tokens-as-CSS-variables convention (values re-created for v4 `@theme`, NOT the v3 config).

### Bootstrap
```bash
cd /Users/seancheick/Keneya
npx create-next-app@latest . --typescript --tailwind --app --src-dir --turbopack --eslint --import-alias "@/*"
npx shadcn@latest init && npx shadcn@latest add button accordion dialog input label radio-group checkbox sonner
pnpm add gsap @gsap/react lenis stripe @supabase/supabase-js resend @react-email/components @upstash/ratelimit @upstash/redis zod @vercel/analytics
```

### Design system (globals.css `@theme`)
Warm, premium, calm — differentiated from sans-first competitors (Perelel/Needed/Ritual) by a **serif display font**:
- Colors: cream `#FAF5EE` bg, deep cream `#F1E8DC`, ink `#33302B`, sage `#97A68F`/`#5F7057`, **terracotta `#C2704E` accent (CTAs only, ≤1 per viewport)**, blush `#EBD8CD` card tint.
- Palette rationale: warm neutrals + one earthy accent is the proven visual language of premium women's wellness (Perelel taupe/mauve, Needed cream/charcoal, Ritual white/gold) — it signals calm and safety to an anxious buyer. Terracotta reads warm and appetizing next to food photography (blue suppresses appetite) and no direct competitor owns it; cream makes snack colors pop in photos. Everything is a CSS token: full re-skin (warmer blush-forward or calmer sage-forward) takes under an hour after the D2 mockup review — validate with the wife + 3–5 target-audience friends, not founder taste.
- Fonts (next/font/google): **Fraunces** (serif display, headings/prices) + **Figtree** (humanist sans body).
- Motion tokens mirrored in `lib/tokens.ts` for GSAP (`--ease-out-soft: cubic-bezier(0.22,1,0.36,1)`, base 0.6s).

### Structure
```
src/app/: layout, page (all home sections), about, thanks (Stripe success), privacy, terms,
          robots.ts, sitemap.ts, opengraph-image.tsx, api/stripe/webhook/route.ts
src/actions/: checkout.ts, waitlist.ts
src/components/: layout/{Header,Footer,SmoothScroll} · quiz/MatchQuiz · ui/ (shadcn) ·
  sections/{Hero,HowItWorks,WhatsInside,WhyCards,GiftSection,ComingSoonBoxes,Testimonials,Faq,PreorderCta}
src/lib/: env, stripe, supabase, resend, rate-limit, site, tokens, jsonld
src/emails/: WaitlistConfirmEmail, PreorderThanksEmail
supabase/migrations/0001_init.sql
```
One page sells one box — no separate product pages until box #2 ships.

### GSAP choreography (all inside `gsap.matchMedia()`; reduced-motion → opacity fades only; mobile → shorter distances, no pinning/scrub)
- **SmoothScroll:** Lenis `autoRaf:false`, driven by `gsap.ticker`; `ScrollTrigger.refresh()` after client-side nav.
- **Hero:** SplitText masked line-rise on load ("Comfort, curated for every trimester"), box photo scale 1.05→1. <1s total.
- **How it works:** 3 cards y+fade, ScrollTrigger `top 75%`, `once:true`.
- **What's inside:** 12-item grid via `ScrollTrigger.batch`; hover (desktop) / tap (mobile) flips item to its "why it's in your box" copy.
- **Why-cards feature:** card mock rotates −4°→0 + fade; PharmaGuide trust line lives here + About.
- **Gift section:** dual-audience panels ("For you / For someone you love") slide ±40px — partners/gift-givers are explicit buyers.
- **Coming soon:** Balanced Blood Sugar + Heart Wellness teasers side by side, each with its own waitlist (`box_interest:'blood_sugar'|'heart'`) — the waitlist race picks box #2.
- **Preorder CTA:** subtle bg-color scrub (desktop only); FAQ = shadcn Accordion (no GSAP); footer = disclaimer, no animation.

### Match quiz (MatchQuiz.tsx — client-only, no accounts)
3 questions: Who's it for? (pregnancy — with trimester chips / blood sugar / heart health / "it's a gift") · Allergies (nuts/gluten/dairy/none — **captured from day 1**, boxes hand-swapped accordingly) · Cravings (sweet/salty/mixed). Result recommends the matching box — Pregnancy routes to the preorder CTA; Blood Sugar/Heart route to their waitlists — with 2 personalized "we'd tuck in…" lines + email capture → waitlist row (`source:'quiz'`, answers stored).

### Data (Supabase — apply via Supabase MCP)
`waitlist` (email, source, box_interest, quiz_stage, quiz_allergies text[], quiz_craving, unique(email, box_interest)) and `preorders` (**stripe_event_id unique** = idempotency, stripe_session_id unique, email, name, amount_total, shipping jsonb, status). RLS enabled, **zero anon policies** — all writes server-side via service role (no client-side Supabase at all).

Env: `NEXT_PUBLIC_SITE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PREGNANCY_BOX, RESEND_API_KEY, RESEND_FROM_EMAIL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN` — boot-validated in `lib/env.ts`.

### Stripe (the money path — highest-care code)
- Dashboard: Product "Pregnancy Comfort Box (Preorder)", one-time price **$47**, Stripe Tax enabled with an explicit **food tax code** per SKU (mixed snack boxes vary by state — don't leave "general").
- `actions/checkout.ts`: server action → Checkout Session (`mode:'payment'`, `automatic_tax`, US shipping address collection, optional gift-note custom field, success `/thanks?session_id=…`, cancel `/#preorder`) → redirect.
- `api/stripe/webhook/route.ts`: raw body → `constructEvent` signature check → on `checkout.session.completed`, insert preorder with `onConflict('stripe_event_id').ignoreDuplicates()`; send thank-you email **only on fresh insert**; email failure logged, never 500s the webhook. **Fulfillment ONLY here** — `/thanks` is display-only.

### Emails (Resend)
Verify keniyahealth.com (SPF/DKIM/DMARC); from `Keniya <hello@keniyahealth.com>`. `WaitlistConfirmEmail` (echoes quiz answers) + `PreorderThanksEmail` (order summary, ship window, why-cards teaser). Supabase = source of truth; Resend Audience sync deferred.

### SEO/analytics
Metadata + OG image (box on cream, serif wordmark), JSON-LD `Product` (`availability: PreOrder`) + `Organization` + `FAQPage`, sitemap/robots, security headers, Vercel Analytics. Meta/TikTok pixels: stub component with TODO — wire only when paid ads start.

### Build order (each day ends with a verifiable milestone)
- **D1:** scaffold, tokens, fonts, Header/Footer + disclaimer, env.ts → skeleton live on vercel.app.
- **D2:** all sections static with real copy + placeholders, About, quiz UI → full page clean at 375px + desktop; copy passes claims audit.
- **D3:** Supabase migration, waitlist action + rate limit, quiz submit, both waitlists, waitlist email → quiz submission lands a row + email arrives.
- **D4:** Stripe product, checkout action, webhook + idempotency, /thanks, receipt email → `stripe listen` test purchase creates row + email; **replayed event = no duplicate**.
- **D5:** GSAP: SmoothScroll, hero SplitText, section reveals, matchMedia/reduced-motion → animations verified both modes.
- **D6:** SEO/JSON-LD/OG, real photos in, polish → Lighthouse ≥90 perf / ≥95 SEO+a11y, LCP <2.5s.
- **D7:** full QA, custom domain, live Stripe keys + live webhook, real $47 purchase + refund → launch-ready.

**Cut lines if slipping:** animations reduce to hero SplitText + one shared fade-up utility, drop Lenis (native scroll fine). Never cut webhook tests. Use `frontend-design` / `ui-ux-pro-max` skills + Magic MCP during D2/D5 for section quality.

---

## Part 3 — Launch (Week 2) + gates

1. Soft launch to friends/family + wife's network; then organic content: 14-day TikTok/Reels calendar ("Building my pregnant wife the ultimate first-trimester snack box" build-in-public angle), careful Reddit/Facebook pregnancy-community participation (value-first, no spam).
2. **Go gate: 25 preorders in 14 days** (waitlist→paid benchmark is 5–25%; >20% = strong PMF). 10–24 = iterate messaging/audience, try the **gestational-diabetes wedge** (diagnosed weeks 24–28, urgent need, zero competitors). <10 with 3k+ visits = stop before spending more.
3. Week 3–4: pack/ship first batch (cap 50; Pirate Ship/USPS cubic for labels), feedback survey in-box, testimonials replace placeholders, then decide subscription build + Blood Sugar Box launch. Wholesale via **Faire** (tiny minimums, net-60) before UNFI/KeHE.

**Budget (pre-revenue):** domains $23 · LLC $50–500 (state) · insurance ~$300/yr · packaging ~$250 · prototype groceries ~$150 · software $0 (all free tiers) ≈ **$775–1,225**. First-batch COGS funded by preorder revenue.

---

## Verification (website)

1. **Forms:** quiz all paths spot-checked, both waitlists, duplicate email → friendly message, rate limit trips.
2. **Money path:** Stripe test cards 4242 + decline 9995; webhook via Stripe CLI including a **replayed event** (must not duplicate); cancel path returns to `/#preorder`.
3. **Responsive/motion:** 375px no horizontal scroll, tap-flip works; macOS reduced-motion → fades only.
4. **Perf/SEO:** Lighthouse ≥90/95, LCP <2.5s (priority hero image, `display:swap` fonts), CLS <0.1.
5. **Compliance:** grep built output for banned phrases ("treat", "cure", "relief", "controls"); disclaimer present on every page.
6. **Live:** one real purchase + refund on production before announcing.
