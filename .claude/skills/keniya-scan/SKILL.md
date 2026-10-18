---
name: keniya-scan
description: Screen a snack for the Keniya boxes from package photos. Use whenever the user sends snack label photos (front, Nutrition Facts, ingredients, barcode) or asks whether a store product fits a Keniya box ("does this work?", "can we use this?", "scan this"). Transcribes the label, runs it through the live Keniya rules with `pnpm screen`, and answers PASS / FAIL / HOLD per box with the reasons.
---

# Keniya scan: photo → yes / no / hold

The rules engine decides; you only read the package. You never approve, waive or estimate
anything yourself, and you don't send products to the clinician (owner decision 2026-10-18).

## 1. Read the photos

You need the **front** (brand, name, net weight), the **Nutrition Facts**, the **ingredients
and allergen lines**, and the **barcode** digits. If one is missing or unreadable, still screen.
The missing value becomes a HOLD. Then ask for that one photo.

Transcribe exactly what is printed:
- **Per pack.** Use the values for one pack. Record `servings_per_pack` exactly as printed:
  "1 serving per container" → 1, "about 2.5" → 2.5.
  For a multi-serve pack, enter the per-serving column; the engine fails it as multi-serve.
- **Missing means `null`.** Never calculate, round or look up a value that isn't printed. A
  "less than 1 g" entry is `0.5`, and "0 g" is `0`.
- **Caffeine:** only when printed. Otherwise `null`; the engine estimates cocoa itself.
- **Ingredients:** verbatim, including the sub-ingredients in parentheses.
- **Allergens:** the Contains and may-contain / same-facility lines verbatim. If the package
  prints no allergen statement, write `"None declared on package"`.
- **Weight:** net weight of one pack, in ounces (grams ÷ 28.35).
- **Type:** `Beverage` for drinks and drink mixes, `Mini` for a small taste (about 100 cal or
  less, e.g. chews), `Substantial` otherwise. **Form:** Solid, Powder, Tea, Spread, Puree or Liquid.
- **Roles** are your judgment from the ingredients. Set only the ones that are clearly true:
  - `NS`: first ingredient is a nut or seed.
  - `UF`: the fat is mainly unsaturated (nuts, seeds, olive or avocado oil).
  - `WG`: whole grain first.
  - `MF`: minimally processed fruit, no added sugar.
  - `CT`: a portioned sweet treat.
  - `WHOLE_FOOD`: a single-food snack (plain nuts, roasted chickpeas, cheese).

## 2. Screen it

Write the label to the session scratchpad as JSON, in the format at the top of
`scripts/screen.ts`, then run from the repo root:

```bash
pnpm screen <scratchpad>/label.json
```

The command reads the live rules and watchlist and writes nothing.

## 3. Answer

Reply with the product name, then the result table exactly as printed: ✅ PASS, ❌ FAIL or
🟡 HOLD per box, with the reason. Then add one line on each of these:
- **Each HOLD:** what would settle it, e.g. "photo of the allergen line" or "maker's caffeine value".
- **Calculated-looking values:** re-read that row of the Nutrition Facts.
- **Already in Keniya:** if the command says the UPC is on file, say so.

Keep it short; the user is standing in a store. Don't add health claims. A PASS means the
product meets Keniya's rules, not that it is safe for every person.

To keep a product, add it in the admin (Products → New) with the same values. After buying it,
log the purchase and verify the package in hand before it can be packed.
