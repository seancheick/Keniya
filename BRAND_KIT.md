# Keniya — Brand Kit

The single source of truth for how Keniya looks, sounds, and moves.
Code mirror: every value here lives in [`src/app/globals.css`](src/app/globals.css) (`@theme`) and [`src/lib/tokens.ts`](src/lib/tokens.ts).

---

## 1. Essence

| | |
|---|---|
| **Name** | Keniya — from *kɛnɛya*, "health" in Dioula (West Africa) |
| **One-liner** | Condition-aware snack boxes. Comfort, curated with a why. |
| **Feel** | Warm editorial pantry — calm, premium, nurturing. Never clinical, never "medical device". |
| **Emotional promise** | "Someone thought this through for you." |
| **Audience** | Pregnant women (T1 → postpartum, incl. gestational diabetes) + partners and gift-givers. Later: blood-sugar and heart-health customers. |

## 2. Wordmark

- Text wordmark only (for now): **Keniya** set in Fraunces, normal weight, tight tracking, followed by a terracotta period → `Keniya.`
- The period is the brand mark: always terracotta `#C2704E`, never another color.
- Never set the wordmark in Figtree, all-caps, or bold.
- Clear space: at least the height of the "K" on all sides.

## 3. Color

Ratio rule: roughly **60% cream / 30% support tones (deep cream, blush, sage) / 10% ink — and terracotta only as punctuation.**

| Token | Hex | Role | Rules |
|---|---|---|---|
| Cream | `#FAF5EE` | Page background | The "paper". Never pure white. |
| Deep cream | `#F1E8DC` | Alternate section bands | Section rhythm, footer. |
| Card cream | `#FFFDF8` | Cards on cream/blush | Warmest near-white we allow. |
| Line | `#E5DACB` | Hairline borders, dividers | 1px, everywhere; no gray borders. |
| Ink | `#33302B` | Headlines, body | ≈11.6:1 on cream (AAA). Never `#000`. |
| Soft ink | `#6B655C` | Secondary text | ≈4.9:1 on cream (AA). |
| Sage | `#97A68F` | Chips, illustration support | Decorative only — not for text on cream. |
| Deep sage | `#5F7057` | Eyebrows, secondary links, icons | ≈4.8:1 on cream (AA small text OK). |
| **Terracotta** | `#C2704E` | **CTAs only** | Max ONE filled element per viewport. Button text `#FBEFE8` at ≥16px medium. |
| Deep terracotta | `#A65A3D` | Hover, emphasized words, text links | ≈4.6:1 on cream (AA) — use this for terracotta *text*. |
| Blush | `#EBD8CD` | Tinted panels, quiz chips | Pairs with blush-ink text. |
| Blush ink | `#8A4E33` | Text on blush | ≈5.4:1 on blush (AA). |

**Don'ts:** no gradients, no pure black/white, no gray text on colored panels (use the panel's own ink), no terracotta backgrounds larger than a button/badge, never two terracotta CTAs visible at once.

## 4. Typography

**Display: [Fraunces](https://fonts.google.com/specimen/Fraunces)** (variable, optical size on) — headlines, prices, pull quotes, the wordmark. Weight 400–600 only.
**Body/UI: [Figtree](https://fonts.google.com/specimen/Figtree)** — everything else. Weight 400–500 only (600 for tiny labels max).

*Italic Fraunces is the emotional highlighter* — one italic phrase per screen, usually in deep terracotta (`every trimester`, `the why`). Never italicize Figtree.

| Style | Font | Size | Notes |
|---|---|---|---|
| Display / H1 | Fraunces 400–500 | `clamp(2.75rem → 5.25rem)` | line-height 1.04, tracking −0.02em |
| Headline / H2 | Fraunces 400–500 | `clamp(1.9rem → 3rem)` | line-height 1.12 |
| Card title | Fraunces 500 | 1.25–1.5rem | |
| Body large | Figtree 400 | 1.125rem | line-height 1.65, max width ~46ch |
| Body | Figtree 400 | 1rem | secondary in soft ink |
| Small / meta | Figtree 400–500 | 0.875rem | |
| Eyebrow | Figtree 500 | 0.75rem | UPPERCASE, tracking 0.22em, deep sage |
| Legal | Figtree 400 | 0.75rem | soft ink at 80% |

## 5. Layout & space

- Container: max-width 72rem (1152px), 1.5rem side padding.
- Section rhythm: `py-16` mobile → `py-20/24` desktop; alternate cream / deep-cream bands separated by hairlines.
- Left-aligned, asymmetric compositions. Editorial rows and lists over card grids; never cards-inside-cards.
- Radius: cards 1rem–1.75rem; buttons and chips fully rounded (pill).
- Shadows: essentially none — hairline borders + color tints do the work.

## 6. Motion (GSAP)

- Personality: **soft, unhurried, once.** Elements settle like things being set down gently — no bounce, no elastic, no spin.
- Ease: `cubic-bezier(0.22, 1, 0.36, 1)` (power3/4-out family). Durations: 0.3s micro / 0.6s base / 0.9s reveals.
- Signature moves: masked line-rise headline (SplitText), staggered fade-up reveals (~0.09s stagger), gentle parallax drift (≤40px), floating item chips (±8px, 3s sine loops), 3D flip on "why" tiles, slow marquee.
- Scroll: Lenis smooth scroll, driven by GSAP ticker. Reveals fire once at ~82% viewport and stay.
- **Always:** `prefers-reduced-motion` → everything visible, no transforms, no smooth scroll. Mobile: shorter distances, no pinning, no scrub.

## 7. Voice & copy

Smart friend who did the research so she doesn't have to. Warm, plain, specific. Contractions yes; exclamation points almost never; sentence case everywhere (headlines too).

**Compliance vocabulary — hard rules (FDA/FTC):**

| Say | Never say |
|---|---|
| "curated for", "designed with X in mind" | "treats", "cures", "prevents" |
| "many women reach for…" | "relieves nausea", "controls blood sugar" |
| "pregnancy-conscious", "protein-smart" | "safe for all pregnancies", "doctor-approved" |
| "chosen around how you feel" | any disease claim |

Every page carries the footer disclaimer (FDA statement + "not medical advice" + allergen/sealed-packaging note). Items are named generically on-site ("ginger chews", "protein bar") — no third-party brand names without permission.

## 8. Photography & imagery (for the prototype shoot)

Natural window light on cream/linen surfaces; warm undertones. Real hands opening boxes, items arranged loosely (not grid-perfect); the "why" cards visible in shots. No clinical white sweeps, no neon props, no stock-smiley models. Until real photos exist: blush/sage color panels + typographic compositions — never fake stock.

## 9. Components

- **Primary button:** terracotta fill, cream text, pill, generous x-padding; hover → deep terracotta. One per viewport.
- **Secondary action:** text link in deep sage with `→`, or outline pill (hairline border, ink text).
- **Chips (quiz, categories):** pill, hairline border on cream; selected = deep sage fill with cream text.
- **Why-card:** card-cream, hairline border, slight rotation (−3° to −6°), eyebrow + Fraunces item name + soft-ink reason + tracking-wide card number.
- **Accordion (FAQ):** hairline dividers, no boxes.

## 10. The "Packed for You" guide (packaging insert)

One folded 5×7 insert per box — never twelve loose cards (clutter contradicts the
remove-the-mental-load promise). Four panels:

1. **Cover:** `Packed for You` in Fraunces + one-line welcome ("…one more decision off
   your plate").
2. **Personalized block:** Packed for {name} · Box · Preferences · Packed by {founder} ·
   `Founding Release 01`.
3. **The fourteen:** item grid, one-line claims-safe why per item, category structure
   shown (proof of intentional composition).
4. **Founder note** + signature + QR code → digital page (full labels, ingredients,
   allergens, substitutions, loved-it feedback, reorder).

Print: thick matte cream stock, ink text, terracotta period, rounded corners.
Counting promise (site + insert must match ops): 14 selections, ≥8 substantial single
servings, multi-piece packs count as one, accents never counted.
