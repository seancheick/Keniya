import { allergenConflict, isAllergen, parseAvoid, type Allergen } from "./allergens";
import { avoidConflict } from "./avoid";
import { blockingFailures, checkLineup, eligibleFor, extrasCheck, packBlockers, type AlsoMeet, type Pick } from "./rules";
import { BOX_LABEL, isBoxSlug, type BoxRules, type BoxSlug, type Settings, type Snack } from "./types";

type PackingProduct = { snack: Snack; upc: string | null; verifiedAt: string | null; ingredients?: string | null };

/** Assign multi-category products without falsely failing a feasible recipe. */
export function recipePicks(snacks: Snack[], rules: BoxRules): Pick[] | null {
  if (!rules.categories.length) return snacks.map((snack) => ({ snack, category: null }));
  const ordered = snacks.map((snack, index) => ({ snack, index, cats: rules.categories.filter((c) => snack.categories.includes(c.name)) }))
    .sort((a, b) => a.cats.length - b.cats.length);
  const result: Pick[] = [];
  const counts = new Map<string, number>();
  const failed = new Set<string>();
  function assign(i: number): boolean {
    if (i === ordered.length) return rules.categories.every((c) => (counts.get(c.name) ?? 0) >= c.min);
    const key = `${i}:${rules.categories.map((c) => counts.get(c.name) ?? 0).join()}`;
    if (failed.has(key)) return false;
    if (rules.categories.some((c) => (counts.get(c.name) ?? 0) + ordered.slice(i).filter((x) => x.cats.some((cat) => cat.name === c.name)).length < c.min)) return false;
    const { snack, index, cats } = ordered[i];
    for (const c of cats) {
      const n = counts.get(c.name) ?? 0;
      if (n >= c.max) continue;
      counts.set(c.name, n + 1);
      result[index] = { snack, category: c.name };
      if (assign(i + 1)) return true;
      counts.set(c.name, n);
    }
    failed.add(key);
    return false;
  }
  return assign(0) ? result : null;
}

export function packingProblems(input: {
  slug: BoxSlug; ids: string[]; products: Map<string, PackingProduct>; rules: BoxRules;
  settings: Settings; packagingOz: number; extraCount: number; avoid: string | null;
  /** Structured allergen exclusions: contains or cross-contact conflicts; unverifiable labels block. */
  avoidAllergens?: readonly Allergen[];
  /** Other boxes' screening every item must also pass. */
  alsoMeet?: AlsoMeet[];
  /** Substitutions proposed for this shipment that still need an admin's confirmation. */
  unconfirmedSubstitutions?: boolean;
}): string[] {
  const { slug, ids, products, rules, settings, packagingOz, extraCount, avoid } = input;
  const problems: string[] = [];
  const items: PackingProduct[] = [];
  for (const id of ids) {
    const item = products.get(id);
    if (!item) { problems.push(`Unknown product: ${id}`); continue; }
    items.push(item);
    const conflict = avoidConflict({ ...item.snack, ingredients: item.ingredients }, avoid);
    if (conflict) problems.push(`${item.snack.name}: ${conflict} (customer asked to avoid “${avoid}”)`);
    const allergen = itemAllergenConflict(item, input.avoidAllergens ?? []);
    if (allergen) problems.push(`${item.snack.name}: ${allergen} (customer allergen exclusion)`);
    for (const b of input.alsoMeet ?? []) {
      const fit = eligibleFor(b.slug, item.snack, b.rules, settings.policy, item.snack.rejectReason);
      if (!fit.fits) problems.push(`${item.snack.name}: fails ${BOX_LABEL[b.slug]} screening (${fit.reasons.join("; ")})`);
    }
  }
  if (input.unconfirmedSubstitutions) problems.push("Confirm the proposed substitutions before packing");
  problems.push(...packBlockers(slug, items, rules, settings.policy));
  const mainCount = ids.length - extraCount;
  if (mainCount !== rules.total) problems.push(`Need ${rules.total} distinct snacks plus ${extraCount} extras; currently ${mainCount} snacks`);
  const main = ids.slice(0, Math.max(0, mainCount)).flatMap((id) => products.get(id)?.snack ?? []);
  const extras = ids.slice(Math.max(0, mainCount)).flatMap((id) => products.get(id)?.snack ?? []);
  const extrasRange = extrasCheck(rules, extras.length);
  if (extrasRange && !extrasRange.pass) problems.push(`${extrasRange.label}: ${extrasRange.value}`);
  const picks = recipePicks(main, rules);
  if (!picks) problems.push("Snack mix does not fit the box recipe; choose a replacement from the same category");
  else problems.push(...blockingFailures(checkLineup(slug, rules, picks, settings, packagingOz + extras.reduce((s, x) => s + (x.unit_wt_oz ?? 0), 0))).map((c) => `${c.label}: ${c.value}`));
  return [...new Set(problems)];
}

/** Allergen conflict for one packing item (label text from the current version). */
export const itemAllergenConflict = (item: PackingProduct, excluded: readonly Allergen[]) =>
  allergenConflict({ allergens: item.snack.allergens, ingredients: item.ingredients ?? item.snack.ingredients }, excluded);

/** The needs columns a shipment carries (migration 20261018020000). */
export type ShipmentNeedsRow = {
  avoid_allergens: string[] | null;
  also_meet: string[] | null;
  substitution_review: unknown;
  substitution_confirmed_by: string | null;
};

/**
 * packingProblems inputs from a shipment row: allergen exclusions, other boxes, unconfirmed swaps.
 * Allergens named in the free-text avoid answers (shipment and preorder) always count too, so
 * shipments planned before structured exclusions existed get the same fail-closed check.
 */
export function shipmentNeeds(ship: ShipmentNeedsRow, slug: BoxSlug, rules: Record<BoxSlug, BoxRules>, avoidAnswers: (string | null | undefined)[] = []) {
  const parsed = avoidAnswers.flatMap((a) => parseAvoid(a));
  return {
    avoidAllergens: [...new Set([...(ship.avoid_allergens ?? []).filter(isAllergen), ...parsed])],
    alsoMeet: (ship.also_meet ?? []).filter(isBoxSlug).filter((b) => b !== slug).map((b) => ({ slug: b, rules: rules[b] })),
    unconfirmedSubstitutions: Boolean(ship.substitution_review) && !ship.substitution_confirmed_by,
  };
}
