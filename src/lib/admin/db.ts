import "server-only";
import { getSupabaseAdminStrict } from "@/lib/supabase";
import { lotHold } from "./stock";
import { effectiveUnitCost } from "./costing";
import type { PostageSample } from "./postage";
import {
  BOX_SLUGS,
  resolveBoxRules,
  resolveSettings,
  type BoxRules,
  type BoxSlug,
  type Form,
  type ProductType,
  type RoleKey,
  type Settings,
  type Snack,
  type Status,
} from "./types";

export const db = () => getSupabaseAdminStrict();

/** Throw on a Supabase error so server components hit the error boundary, not empty data. */
export function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

/** Page through the Data API rather than silently dropping rows at its row limit. */
export async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, what: string): Promise<T[]> {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    const batch = must(await page(from, from + size - 1), what);
    rows.push(...batch);
    if (batch.length < size) return rows;
  }
}

export type ProductRow = {
  id: string;
  created_at: string;
  updated_at: string;
  code: string;
  name: string;
  brand: string | null;
  upc: string | null;
  type: ProductType;
  form: Form;
  categories: string[];
  url: string | null;
  default_vendor_id: string | null;
  retail_cents: number | null;
  estimate_cost_cents: number | null;
  quote_cost_cents: number | null;
  price_checked_on: string | null;
  status: Status;
  reject_reason: string | null;
  /** Clinician decision (Approved / Rejected). */
  reviewed_by: string | null;
  reviewed_at: string | null;
  /** Pre-screen (status Pre-approved, or a pre-screen rejection). */
  prescreened_by: string | null;
  prescreened_at: string | null;
  sensory: string | null;
  notes: string | null;
  created_by: string | null;
};

export type VersionRow = {
  id: string;
  created_at: string;
  product_id: string;
  version: number;
  is_current: boolean;
  effective_from: string;
  effective_to: string | null;
  calories: number | null;
  protein_g: number | null;
  fiber_g: number | null;
  carbs_g: number | null;
  added_sugar_g: number | null;
  sodium_mg: number | null;
  caffeine_mg: number | null;
  sat_fat_g: number | null;
  sugar_alcohols_g: number | null;
  unit_wt_oz: number | null;
  ingredients: string | null;
  allergens: string | null;
  free_from: Record<string, boolean>;
  shelf_life: string | null;
  pregnancy_checks: Record<string, string>;
  roles: Partial<Record<RoleKey, boolean>>;
  nutrition_source: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_by: string | null;
};

export type LotRow = {
  id: string;
  created_at: string;
  product_id: string;
  product_version_id: string;
  vendor_id: string | null;
  purchased_at: string;
  qty: number;
  total_paid_cents: number;
  unit_cost_cents: number;
  qty_remaining: number;
  expires_on: string | null;
  lot_code: string | null;
  receipt_path: string | null;
  note: string | null;
  created_by: string | null;
};

export type VendorRow = { id: string; name: string; notes: string | null };

export type VendorPriceRow = {
  id: string;
  product_id: string;
  vendor_id: string | null;
  unit_cost_cents: number;
  pack_qty: number | null;
  seen_at: string;
  source: "purchase" | "sighting" | "quote" | "estimate";
  note: string | null;
  created_by: string | null;
};

export type PackageProfile = {
  id: string;
  name: string;
  length_in: number;
  width_in: number;
  height_in: number;
  empty_weight_oz: number;
  cost_cents: number;
  is_default: boolean;
  active: boolean;
};

export type LineupRow = {
  id: string;
  created_at: string;
  box_slug: BoxSlug;
  version: number;
  status: "draft" | "active" | "archived";
  objective: string | null;
  notes: string | null;
  created_by: string | null;
  activated_at: string | null;
};

export type LineupItemRow = {
  id: string;
  lineup_id: string;
  position: number;
  product_id: string;
  category: string | null;
  is_extra: boolean;
};

const n = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

export async function loadSettings(): Promise<Settings> {
  const row = must(await db().from("admin_settings").select("data").eq("id", 1).maybeSingle(), "settings") as { data: unknown } | null;
  return resolveSettings(row?.data);
}

export async function loadBoxRules(): Promise<Record<BoxSlug, BoxRules>> {
  const rows = must(await db().from("box_rules").select("box_slug, rules"), "box rules") as {
    box_slug: string;
    rules: unknown;
  }[];
  const out = {} as Record<BoxSlug, BoxRules>;
  for (const slug of BOX_SLUGS) out[slug] = resolveBoxRules(slug, rows.find((r) => r.box_slug === slug)?.rules);
  return out;
}

export async function loadVendors(): Promise<VendorRow[]> {
  return must(await db().from("vendors").select("id, name, notes").order("name"), "vendors");
}

export async function loadPackageProfiles(): Promise<PackageProfile[]> {
  const rows = must(await db().from("package_profiles").select("*").order("is_default", { ascending: false }), "packages");
  return (rows as PackageProfile[]).map((p) => ({
    ...p,
    length_in: Number(p.length_in),
    width_in: Number(p.width_in),
    height_in: Number(p.height_in),
    empty_weight_oz: Number(p.empty_weight_oz),
  }));
}

export const defaultPackage = (ps: PackageProfile[]) => ps.find((p) => p.is_default && p.active) ?? ps.find((p) => p.active) ?? null;

/** Mailer + packaging weight that every box carries on top of its snacks. */
export const packagingOz = (settings: Settings, pkg: PackageProfile | null) =>
  (pkg?.empty_weight_oz ?? 0) + settings.packaging.reduce((s, p) => s + (p.weightOz ?? 0), 0);

export function toSnack(
  p: ProductRow,
  v: VersionRow | undefined,
  lots: Pick<LotRow, "qty_remaining" | "unit_cost_cents" | "expires_on" | "product_version_id">[],
  latestSeenCents: number | null,
): Snack {
  const live = lots.filter((l) => l.qty_remaining > 0 && !lotHold(l, v?.id));
  const expiries = live.map((l) => l.expires_on).filter((d): d is string => Boolean(d)).sort();
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    brand: p.brand,
    type: p.type,
    form: p.form,
    status: p.status,
    rejectReason: p.reject_reason,
    categories: p.categories ?? [],
    calories: n(v?.calories),
    protein_g: n(v?.protein_g),
    fiber_g: n(v?.fiber_g),
    carbs_g: n(v?.carbs_g),
    added_sugar_g: n(v?.added_sugar_g),
    sodium_mg: n(v?.sodium_mg),
    caffeine_mg: n(v?.caffeine_mg),
    sat_fat_g: n(v?.sat_fat_g),
    sugar_alcohols_g: n(v?.sugar_alcohols_g),
    unit_wt_oz: n(v?.unit_wt_oz),
    pregnancy_checks: v?.pregnancy_checks ?? {},
    roles: v?.roles ?? {},
    allergens: v?.allergens ?? null,
    ingredients: v?.ingredients ?? null,
    freeFrom: v?.free_from ?? {},
    unitCostCents: effectiveUnitCost({
      lots: live.map((l) => ({ qty_remaining: l.qty_remaining, unit_cost_cents: Number(l.unit_cost_cents) })),
      quoteCents: n(p.quote_cost_cents),
      latestSeenCents,
      estimateCents: n(p.estimate_cost_cents),
    }),
    retailCents: p.retail_cents,
    onHand: live.reduce((s, l) => s + l.qty_remaining, 0),
    earliestExpiry: expiries[0] ?? null,
    loveRate: null,
    clinicianApprovedBy: p.status === "Approved" ? p.reviewed_by : null,
    packageVerified: Boolean(p.upc && v?.verified_at),
  };
}

export type Catalog = {
  products: ProductRow[];
  versions: Map<string, VersionRow>;
  lots: LotRow[];
  prices: VendorPriceRow[];
  snacks: Snack[];
  byId: Map<string, Snack>;
};

/** Everything the builder, dashboard and purchasing need, in four queries. */
export async function loadCatalog(): Promise<Catalog> {
  const [P, versionRows, lotRows, priceRows] = await Promise.all([
    allRows<ProductRow>((from, to) => db().from("products").select("*").order("code").order("id").range(from, to), "products"),
    allRows<VersionRow>((from, to) => db().from("product_versions").select("*").eq("is_current", true).order("id").range(from, to), "versions"),
    allRows<LotRow>((from, to) => db().from("purchase_lots").select("*").gt("qty_remaining", 0).order("id").range(from, to), "lots"),
    allRows<VendorPriceRow>((from, to) => db().from("vendor_prices").select("*").order("seen_at", { ascending: false }).order("created_at", { ascending: false }).order("id").range(from, to), "prices"),
  ]);
  const V = new Map(versionRows.map((v) => [v.product_id, v]));
  const L = lotRows.map((l) => ({ ...l, unit_cost_cents: Number(l.unit_cost_cents) }));
  const PR = priceRows.map((p) => ({ ...p, unit_cost_cents: Number(p.unit_cost_cents) }));
  const lotsBy = new Map<string, LotRow[]>();
  for (const l of L) lotsBy.set(l.product_id, [...(lotsBy.get(l.product_id) ?? []), l]);
  const latestSeen = new Map<string, number>();
  for (const p of PR) if (!latestSeen.has(p.product_id)) latestSeen.set(p.product_id, p.unit_cost_cents);
  const snacks = P.map((p) => toSnack(p, V.get(p.id), lotsBy.get(p.id) ?? [], latestSeen.get(p.id) ?? null));
  return { products: P, versions: V, lots: L, prices: PR, snacks, byId: new Map(snacks.map((s) => [s.id, s])) };
}

export async function loadActiveLineups(): Promise<Record<BoxSlug, { lineup: LineupRow; items: LineupItemRow[] } | null>> {
  const lineups = must(await db().from("box_lineups").select("*").eq("status", "active"), "lineups") as LineupRow[];
  const ids = lineups.map((l) => l.id);
  const items = ids.length
    ? (must(await db().from("lineup_items").select("*").in("lineup_id", ids).order("position"), "lineup items") as LineupItemRow[])
    : [];
  const out = {} as Record<BoxSlug, { lineup: LineupRow; items: LineupItemRow[] } | null>;
  for (const slug of BOX_SLUGS) {
    const l = lineups.find((x) => x.box_slug === slug);
    out[slug] = l ? { lineup: l, items: items.filter((i) => i.lineup_id === l.id) } : null;
  }
  return out;
}

export async function loadPostageHistory(): Promise<PostageSample[]> {
  const rows = must(
    await db()
      .from("shipments")
      .select("packed_weight_oz, label_cost_cents, package_profile_id, zone")
      .not("label_cost_cents", "is", null)
      .order("shipped_at", { ascending: false })
      .limit(500),
    "postage history",
  ) as PostageSample[];
  return rows.map((r) => ({ ...r, packed_weight_oz: n(r.packed_weight_oz) }));
}

/** Signed URLs (1 hour) for private photos/receipts. */
export async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!paths.length) return out;
  const { data } = await db().storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

export const PHOTO_BUCKET = "keniya-admin";
