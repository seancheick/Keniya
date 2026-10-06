import "server-only";
import { landedCost, type LandedCost } from "./costing";
import { defaultPackage, loadActiveLineups, loadBoxRules, loadCatalog, loadPackageProfiles, loadPostageHistory, loadSettings, packagingOz, type Catalog, type LineupRow, type PackageProfile } from "./db";
import { canBuild } from "./optimizer";
import { estimatePostage } from "./postage";
import { checkLineup, eligibleFor, isReady, packedWeightOz, type Check, type Pick } from "./rules";
import { BOX_SLUGS, type BoxRules, type BoxSlug, type Settings, type Snack } from "./types";

export type BoxSummary = {
  slug: BoxSlug;
  lineup: LineupRow | null;
  picks: Pick[];
  extras: Snack[];
  checks: Check[];
  ready: boolean;
  cost: LandedCost | null;
  weightOz: number;
  canBuild: { n: number; limiting: Snack | null };
  postageNote: string;
};

export type AdminContext = {
  catalog: Catalog;
  settings: Settings;
  rules: Record<BoxSlug, BoxRules>;
  packages: PackageProfile[];
  pkg: PackageProfile | null;
  packOz: number;
  boxes: Record<BoxSlug, BoxSummary>;
};

/** Everything the dashboard and box pages show, computed once per request. */
export async function loadAdminContext(inputs?: { settings: Settings; rules: Record<BoxSlug, BoxRules> }): Promise<AdminContext> {
  const [catalog, settings, rules, lineups, packages, history] = await Promise.all([
    loadCatalog(),
    inputs ? Promise.resolve(inputs.settings) : loadSettings(),
    inputs ? Promise.resolve(inputs.rules) : loadBoxRules(),
    loadActiveLineups(),
    loadPackageProfiles(),
    loadPostageHistory(),
  ]);
  const pkg = defaultPackage(packages);
  const packOz = packagingOz(settings, pkg);
  const boxes = {} as Record<BoxSlug, BoxSummary>;
  for (const slug of BOX_SLUGS) {
    const active = lineups[slug];
    const picks: Pick[] = (active?.items ?? [])
      .filter((i) => !i.is_extra && catalog.byId.has(i.product_id))
      .map((i) => ({ snack: catalog.byId.get(i.product_id)!, category: i.category }));
    const extras = (active?.items ?? []).filter((i) => i.is_extra && catalog.byId.has(i.product_id)).map((i) => catalog.byId.get(i.product_id)!);
    const checks = checkLineup(slug, rules[slug], picks, settings, packOz + extras.reduce((s, e) => s + (e.unit_wt_oz ?? 0), 0));
    const missing = (active?.items ?? []).filter(i => !catalog.byId.has(i.product_id)).length;
    if (missing) checks.push({ key: "missing_lineup_items", label: "Missing lineup products", value: String(missing), level: "block", pass: false, deficit: missing });
    for (const extra of extras) {
      const fit = eligibleFor(slug, extra, rules[slug], settings.policy, extra.rejectReason);
      checks.push({ key: `extra:${extra.id}`, label: `Extra: ${extra.name}`, value: fit.fits ? "Eligible" : fit.reasons.join("; "), level: "block", pass: fit.fits, deficit: fit.fits ? 0 : 1 });
    }
    const weightOz = packedWeightOz(picks, packOz + extras.reduce((s, e) => s + (e.unit_wt_oz ?? 0), 0));
    const postage = estimatePostage({ settings, slug, weightOz, packageProfileId: pkg?.id, history });
    boxes[slug] = {
      slug,
      lineup: active?.lineup ?? null,
      picks,
      extras,
      checks,
      ready: picks.length > 0 && isReady(checks),
      cost: picks.length
        ? landedCost({
            slug,
            settings,
            pickCosts: picks.map((p) => p.snack.unitCostCents),
            extraCosts: extras.map((e) => e.unitCostCents),
            mailer: pkg ? { name: pkg.name, cents: pkg.cost_cents } : null,
            postageCents: postage.cents,
            postageNote: postage.note,
          })
        : null,
      weightOz,
      canBuild: canBuild([...picks, ...extras.map((snack) => ({ snack, category: null }))]),
      postageNote: postage.note,
    };
  }
  return { catalog, settings, rules, packages, pkg, packOz, boxes };
}
