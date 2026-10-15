---
name: Keniya
description: Wrapped & Sealed. Condition-aware snack boxes presented as a snack boutique's wrapped gift.
colors:
  cream: "#fff8ef"
  cream-deep: "#fbeedc"
  cream-card: "#fffdf9"
  line: "#ebdfcd"
  ink: "#252525"
  ink-soft: "#5b554d"
  coral: "#ff796c"
  coral-deep: "#b23a2c"
  butter: "#ffe38a"
  mint: "#b7e5cc"
  mint-deep: "#1e6b4b"
  lilac: "#c5b3ee"
  sky: "#a9d4f5"
  rose: "#f7b8cc"
  lilac-ink: "#3b2a6b"
  sky-ink: "#123a5c"
  coral-ink: "#5a150d"
  mint-ink: "#14503a"
  butter-ink: "#5c4300"
  rose-ink: "#6b1e3e"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Figtree, ui-sans-serif, sans-serif"
    fontSize: "clamp(3rem, 1.6rem + 5.2vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.94
    letterSpacing: "-0.035em"
    fontVariation: "\"wdth\" 88, \"opsz\" 96"
  headline:
    fontFamily: "Bricolage Grotesque, Figtree, ui-sans-serif, sans-serif"
    fontSize: "clamp(2.1rem, 1.5rem + 2.4vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontVariation: "\"wdth\" 90, \"opsz\" 72"
  title:
    fontFamily: "Bricolage Grotesque, Figtree, ui-sans-serif, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-lead:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Bricolage Grotesque, Figtree, sans-serif"
    fontWeight: 800
    lineHeight: 0.9
    fontVariation: "\"wdth\" 75, \"opsz\" 24"
rounded:
  sheet: "3px"
  label: "4px"
  tag: "6px"
  photo: "10px"
  pill: "9999px"
spacing:
  gutter: "20px"
  container: "1152px"
  section: "64px"
  section-lg: "96px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "0 36px"
    height: "56px"
  button-outline:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 32px"
    height: "56px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
  sticker-price:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px"
  gift-tag-panel:
    backgroundColor: "{colors.cream-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    padding: "28px 20px 20px"
  snack-facts:
    backgroundColor: "{colors.cream-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.label}"
  example-chip:
    backgroundColor: "{colors.cream-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  input-email:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "48px"
  trust-ribbon:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.ink}"
    padding: "14px 32px"
---

# Design System: Keniya

## Overview

**Creative North Star: "Wrapped & Sealed"**

Opening a present, not reading a label. Every visible device is real packaging brought onto the page: the mailer photo, tissue sheets fanned under it, round kiss-cut sticker seals pressed over the corners, square-shouldered gift tags with a punched hole, and one printed label, Snack Facts. Because the box itself uses these materials (stickers, tissue, a card), the page and the parcel stay one object.

The ground is warm cream paper with charcoal type and charcoal buttons. Color comes in as fills, never as text: coral is the brand fill, butter seals the price, and each of the six boxes owns one tissue colorway. Tissue is translucent and multiplies where sheets overlap, so two colorways print a third, like spot inks on a riso. Fills carry a fine paper grain. Type is Bricolage Grotesque at its heaviest and slightly condensed, chunky and friendly, over Figtree for everything people read.

Density is low and confident: big display type, short paragraphs capped at 42 to 62 characters, generous section bands. Depth is soft and physical (things lie on things), never hard-edged. Motion has one authored moment, the hero's tissue unfolding and the seal landing; everything else is a quiet scroll reveal or a springy hover. The world rejects the retired cream-serif wellness editorial (Fraunces, terracotta) and the generic pastel template.

**Key Characteristics:**
- Cream paper ground, charcoal type and buttons, color only as fills.
- One tissue colorway per box, swapped through `data-colorway`.
- Round kiss-cut stickers with a dashed inner ring; tilted, overlapping a corner.
- Gift tags: 2px charcoal border, 6px corners, punched hole at top center.
- Snack Facts: the one signature label panel per surface.
- Soft charcoal drop shadows with negative spread; paper grain on fills.
- Every product photo labeled "Example box" on the image.

## Colors

A warm paper-and-charcoal base with a confectioner's set of tissue fills; contrast lives in charcoal, color lives in fills.

### Primary
- **Charcoal Ink** (ink): headlines, body, borders of tags and labels, and every primary button (cream text on charcoal, 14.5:1). Also the footer ground.
- **Gift Coral** (coral): the brand fill. Trust ribbon, closing CTA band, "Ships free" and "% off" stickers, the default tissue. Charcoal text on coral is 6.0:1. Coral as text on cream is only 2.4:1, so it never carries text there.
- **Coral Deep** (coral-deep): coral when it has to be text: the wordmark and headline period, link hover, error messages, focus ring, caret. 5.6:1 on cream.

### Secondary
- **Butter Seal** (butter): price stickers, the revealed WELCOME20 code slip, applied-code notes, text selection. Charcoal on butter 12.1:1.
- **Mint Deep** (mint-deep): checkmarks, availability dots, secondary-link color. 6.1:1 on cream, 6.3:1 on card cream.

### Tertiary: the six tissue colorways
Each box sets `data-colorway`, which swaps `--tissue` and `--tissue-ink`. The ink is the only colored text allowed on its fill; charcoal also passes on every fill.

| Box | Colorway | Fill | Ink on fill | Charcoal on fill |
|---|---|---|---|---|
| Pregnancy Comfort | lilac | lilac | lilac-ink 6.4:1 | 8.1:1 |
| Blood Sugar | sky | sky | sky-ink 7.5:1 | 9.8:1 |
| Heart Wellness | coral | coral | coral-ink 5.3:1 | 6.0:1 |
| Gestational Diabetes | mint | mint | mint-ink 6.7:1 | 11.0:1 |
| GLP-1 Companion | butter | butter | butter-ink 7.4:1 | 12.1:1 |
| Postpartum & Nursing | rose | rose | rose-ink 6.7:1 | 9.3:1 |

### Neutral
- **Cream Paper** (cream): page ground, button text on charcoal, input fields, punched holes.
- **Deep Cream** (cream-deep): alternate section band (How it works), photo placeholders, hover fills, muted notes.
- **Card Cream** (cream-card): tags, Snack Facts body, example chips, stickers in the cream tone.
- **Warm Line** (line): hairline default border.
- **Soft Ink** (ink-soft): secondary text, 7.0:1 on cream, 6.4:1 on deep cream.

### Named Rules
**The Fill-Not-Ink Rule.** Coral, butter, mint, lilac, sky and rose are fills. Text on them is charcoal or that colorway's own ink; coral as text is always coral-deep.

**The One Colorway Per Box Rule.** A box's surfaces (card, Snack Facts header, status slip, box page, its stickers) take its color from `data-colorway`, never a hard-coded hex. Mixed-tissue fans (hero, gift, welcome card) belong to no box.

**The Coral Period Rule.** The wordmark is `Keniya.` with the period in coral-deep on cream and coral on charcoal; the hero headline repeats it.

## Typography

**Display Font:** Bricolage Grotesque (variable wdth and opsz axes, falling back to Figtree)
**Body Font:** Figtree (with ui-sans-serif, system-ui)
**Label Font:** Bricolage Grotesque condensed (wdth 75, opsz 24)

**Character:** A chunky, slightly squeezed grotesque that reads like printing on a gift box, over a round, clear sans for everything the visitor reads.

### Hierarchy
- **Display** (800, clamp 3rem to 5.5rem, 0.94, -0.035em, wdth 88): the hero headline only, one per page.
- **Headline** (800, clamp 2.1rem to 3.5rem, 1.0, -0.03em, wdth 90): section heads, box page h1, footer line, closing CTA.
- **Title** (800, 1.25rem to 1.5rem, leading tight, tracking tight): box card names, step titles, buy panel box name, gift note, "Not ready to order?". Box page h2s step up to 1.875rem to 2.25rem.
- **Body** (Figtree 400, 1rem, 1.625): running copy in ink-soft; leads at 1.125rem. Measure 42 to 62ch.
- **Small** (Figtree 13 to 14px): fine print, notes, chips (11px semibold).
- **Label** (Bricolage 800, wdth 75): numbers and short words on stickers, Snack Facts counts and heading, discount codes. Tabular numerals for counts.

### Named Rules
**The Heavy Voice Rule.** Bricolage appears only at 700 to 800. It is never set at regular weight; running text is Figtree.

**The Condensed Label Rule.** The condensed label face is reserved for stickers, Snack Facts and codes. It is not a general heading style.

## Layout

A single centered column, max width 1152px with 20px gutters. Sections breathe at 64px vertical padding, 96px from 1024px up. The hero is a two-column grid (1.15fr / 1fr) on desktop with named areas (title, copy, visual); on mobile it stacks title, visual, copy so the box shows before the paragraph. The hero visual bleeds toward the right viewport edge on desktop. Shop is a 1/2/3-column card grid that folds into a pill switcher once a box is chosen, followed by Snack Facts (1.2fr) beside a sticky buy tag (1fr). Sections alternate rhythm: cream, a tilted coral ribbon (-1.2deg), cream, a deep-cream grain band, cream, coral close, charcoal footer. Breakpoints: 640, 768, 1024px. On mobile a fixed bottom buy bar appears and the welcome card sits above it.

## Elevation & Depth

Depth is physical: paper lying on paper. Shadows are always charcoal at low alpha, offset downward with negative spread, so they read as contact shadows rather than glow. Overlap carries as much depth as shadow: stickers overlap photo corners, tissue fans out from behind photos, the gift note tucks over the image. No hard offset shadows; no colored glows.

### Shadow Vocabulary
- **Sticker** (`box-shadow: 0 10px 18px -10px rgb(37 37 37 / 0.55), 0 2px 4px -2px rgb(37 37 37 / 0.25)`): every sticker seal.
- **Photo** (`box-shadow: 0 24px 40px -24px rgb(37 37 37 / 0.55)`): photos sitting on tissue.
- **Tag / Label** (`box-shadow: 0 18px 30px -22px rgb(37 37 37 / 0.6)`): buy tag, Snack Facts, reviewer card.
- **Card rest / hover** (`0 14px 24px -20px rgb(37 37 37 / 0.7)` to `0 26px 34px -22px rgb(37 37 37 / 0.75)`): box cards.
- **Floating card** (`box-shadow: 0 28px 50px -24px rgb(37 37 37 / 0.7)`): the welcome offer card.
- **Ribbon** (`box-shadow: 0 10px 20px -14px rgb(37 37 37 / 0.6)`): trust ribbon.

### Named Rules
**The Soft Lift Rule.** Shadows are soft charcoal contact shadows with negative spread. A hard offset block shadow is out of world.

**The Grain Rule.** Colored fills (tissue, coral bands, stickers, the butter code slip, box cards) carry the paper grain; the plain cream page does not.

## Shapes

Three shape families, each tied to a real object. Round: stickers are perfect circles with a 1.5px dashed charcoal ring (30% alpha) printed just inside the edge, always rotated between -12 and 12 degrees. Pill: every button, switcher, chip, input and colorway link. Square-shouldered: tags and cards at 6px, Snack Facts and gift note at 4px, tissue sheets and inset photos at 3px, hero and gift photos at 10px. Borders are 2px charcoal on tags, labels and outline buttons; dashed 2px borders mark tear-off or soft zones (code slip, waitlist box, buy tag fine print).

## Components

### Buttons
Tactile charcoal pills.
- **Shape:** fully round pill, 56px tall in hero and close, 48px in sections, 44px minimum elsewhere.
- **Primary:** charcoal fill, cream text, Figtree semibold; hero adds a soft charcoal shadow. Hover lightens to charcoal at 85%.
- **Outline:** 2px charcoal border, transparent, charcoal text; hover fills charcoal with cream text.
- **Focus:** 3px ring in coral-deep at 50% alpha.
- **Note:** the shadcn Button base is rounded-md; every storefront use overrides it to a pill.

### Chips
- **Example chip:** card-cream pill at 95%, 11px semibold charcoal, bottom-left of every product photo (10px on small cards).
- **Status chip:** card-cream pill at 80% with a mint-deep dot (open) or charcoal 40% dot (waitlist).
- **Colorway link:** pill in the box's tissue with grain, charcoal text and arrow; lifts 2px on hover.

### Cards / Containers
- **Box card:** a 6px tissue-fill card with grain, photo on a tilted card-cream backing sheet (-2.5deg), butter price sticker on the photo's lower-right corner, round check in the top-left; selected state is a 3px charcoal ring.
- **Gift tag (buy panel):** card cream, 2px charcoal border, 6px corners, a 14px punched hole at top center, Tag shadow; sticky at 96px on desktop.
- **Gift note:** smaller tag at 4px corners, rotated 4deg, overlapping the gift photo.

### Inputs / Fields
- **Style:** cream pill, 48px tall, 2px charcoal border at 20%, charcoal text, ink-soft placeholder.
- **Focus:** border goes full charcoal plus a 3px coral-deep ring at 40%.
- **Error:** coral-deep semibold message below.

### Navigation
Sticky 64px header, cream at 90% with backdrop blur and a 2px charcoal 10% bottom rule. Wordmark in Bricolage 800 at 1.75rem with the coral-deep period; links in Figtree 14px medium ink-soft, charcoal on hover; a charcoal pill "Find my box" from 768px. Links hide below 640px, where the bottom buy bar takes over. Footer is charcoal with cream text at 75%, coral period, a headline line, and uppercase 12px column labels.

### Sticker Seal (signature)
A round kiss-cut seal in butter (price), coral (offers, shipping), cream, or the box's tissue (step numbers on box pages). Content is the label face; charcoal on every tone. It always overlaps something (a photo corner, a card edge, a band edge) and is always tilted.

### Tissue Sheets (signature)
Up to three translucent sheets (opacity 90%, multiply blend, grain) behind a photo or panel, offset by [-7%, 5%, -8deg], [6%, -6%, 6deg], [2%, 8%, -2deg], scaled by a `--fan` value from 0 (stacked) to 1 (fanned). Three mixed colorways on the hero and gift; two on the welcome card; box pages fan butter, deep cream and the box's own tissue.

### Snack Facts (signature)
A snack label: card-cream body with a 2px charcoal border at 4px corners; header in the box's tissue with "Snack Facts" in the label face and the box name in the tissue ink; a 10px rule under "Snacks per box", 5px rules closing each block, hairline dividers between categories; standards as mint-deep checks under "Every snack in this box"; the closing line in Bricolage 800 and the not-medical fine print.

### Named Rules
**The Snack-Not-Nutrition Rule.** Snack Facts describes the snack experience (counts by category, extras, standards) from the live recipe. It never shows calories, nutrients or a nutrition-declaration grid; each snack's own sealed label carries those.

**The One Label Rule.** One Snack Facts panel is visible per surface. The homepage renders one per box in the HTML for crawlers and screen readers, but only the selected box's panel is shown.

**The Example Box Rule.** Every product photo carries the "Example box" chip on the image itself, not only in fine print.

**The One Authored Moment Rule.** Only the hero has a timeline: headline lines rise (yPercent 40, 0.9s, 0.08s stagger, expo out), the tissue fans from 0 to 1 over 1.2s, then the seal drops in from 1.6x scale and -40deg (0.7s, back-out). Elsewhere: scroll reveals (28px rise, 0.9s, power3 out, once at 82% viewport); How it works steps alternate right, left, right from 90px, 0.12s apart; box cards spring up 8px with a 0.8deg alternating tilt over 500ms on an overshoot curve; the welcome card slides up, its tissue fans over 900ms and its sticker spins in.

**The Still Page Rule.** With reduced motion, the page is complete and still: GSAP timelines and Lenis do not run, the `fx` class that pre-hides reveals is never added, and CSS collapses animation and transition durations to 0.01ms.

## Do's and Don'ts

### Do:
- **Do** set charcoal text and charcoal pill buttons on cream; use coral-deep whenever coral must be text.
- **Do** give every box surface its colorway through `data-colorway`, and use that colorway's ink for colored text on its tissue.
- **Do** tilt stickers (-12 to 12deg) and let them overlap a corner; keep their content in the condensed label face.
- **Do** place the "Example box" chip on every product photo.
- **Do** keep Snack Facts to categories, counts, extras and standards, with one visible per surface.
- **Do** gate entrance motion behind reduced-motion so the default render is fully visible.

### Don't:
- **Don't** set text in coral, butter, mint, lilac, sky or rose on cream; coral on cream is 2.4:1.
- **Don't** put nutrient numbers, calories or a nutrition grid in Snack Facts.
- **Don't** use hard offset block shadows or colored glows; shadows are soft charcoal contact shadows.
- **Don't** set Bricolage at regular weight or reuse the condensed label face for ordinary headings.
- **Don't** bring back the retired world: Fraunces, terracotta CTAs, sage eyebrows.
- **Don't** add a second authored timeline beside the hero's tissue and seal.
