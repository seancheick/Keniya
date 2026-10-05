import "server-only";
import { landedCost, type LandedCost } from "./costing";
import { defaultPackage, loadActiveLineups, loadBoxRules, loadCatalog, loadPackageProfiles, loadPostageHistory, loadSettings, packagingOz, type Catalog, type LineupRow, type PackageProfile } from "./db";
import { canBuild } from "./optimizer";
import { estimatePostage } from "./postage";
import { checkLineup, isReady, packedWeightOz, type Check, type Pick } from "./rules";
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
export async function loadAdminContext(): Promise<AdminContext> {
  const [catalog, settings, rules, lineups, packages, history] = await Promise.all([
    loadCatalog(),
    loadSettings(),
    loadBoxRules(),
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
    const checks = checkLineup(slug, rules[slug], picks, settings, packOz);
    const weightOz = packedWeightOz(picks, packOz);
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
      canBuild: canBuild(picks),
      postageNote: postage.note,
    };
  }
  return { catalog, settings, rules, packages, pkg, packOz, boxes };
}
