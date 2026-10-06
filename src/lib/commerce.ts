import "server-only";
import { loadAdminContext, type BoxSummary } from "@/lib/admin/summary";
import { isClinicianApproved } from "@/lib/admin/rules";
import { BOX_SLUGS, resolveBoxRules, resolveSettings, type BoxRules, type BoxSlug } from "@/lib/admin/types";
import { getSupabaseAdminStrict } from "@/lib/supabase";
import { site } from "@/lib/site";

export function saleEligible(box: BoxSummary): boolean {
  return Boolean(box.lineup && box.ready && box.picks.length &&
    [...box.picks.map(p => p.snack), ...box.extras].every(isClinicianApproved));
}
export type SaleState = { available: boolean; clinicianApproved: boolean; priceCents: number; founding: number; remaining: number; expectedRules: unknown; expectedSettings: unknown; lineupId: string | null };
export async function loadCommerceState(): Promise<{ rules: Record<BoxSlug, BoxRules>; sales: Record<BoxSlug, SaleState> }> {
  const db = getSupabaseAdminStrict();
  // Capture the exact stored rule version before evaluating it; admission compares it atomically.
  const { data: storedRules, error: rulesError } = await db.from("box_rules").select("box_slug, rules");
  if (rulesError || !Array.isArray(storedRules)) throw new Error(rulesError?.message ?? "Missing stored rules");
  const { data: storedSettings, error: settingsError } = await db.from("admin_settings").select("data").eq("id", 1).maybeSingle();
  if (settingsError || !storedSettings || BOX_SLUGS.some(slug =>
    !Number.isSafeInteger(storedSettings.data?.prices?.[slug]) || storedSettings.data.prices[slug] < 0 ||
    !Number.isSafeInteger(storedSettings.data?.runSize?.[slug]) || storedSettings.data.runSize[slug] < 0)) throw new Error(settingsError?.message ?? "Sale settings must explicitly configure every box price and capacity");
  const rules = Object.fromEntries(BOX_SLUGS.map(slug => {
    const row = storedRules.find(r => r.box_slug === slug);
    if (!row?.rules || typeof row.rules !== "object") throw new Error(`Missing live rules for ${slug}`);
    return [slug, resolveBoxRules(slug, row.rules)];
  })) as Record<BoxSlug, BoxRules>;
  const context = await loadAdminContext({ rules, settings: resolveSettings(storedSettings.data) });
  const { data, error } = await db.rpc("commerce_capacity");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || data.some(row => !row || typeof row.box_slug !== "string" || !Number.isSafeInteger(row.used) || row.used < 0)) throw new Error("Invalid commerce capacity response");
  const sales = Object.fromEntries(BOX_SLUGS.map(slug => {
    const used = (data as { box_slug: string; used: number }[]).find(r => r.box_slug === slug)?.used ?? 0;
    const founding = context.settings.runSize[slug];
    const priceCents = context.settings.prices[slug];
    const remaining = Math.max(0, founding - used);
    return [slug, { expectedSettings: storedSettings.data, expectedRules: storedRules.find(r => r.box_slug === slug)?.rules, lineupId: context.boxes[slug].lineup?.id ?? null, clinicianApproved: saleEligible(context.boxes[slug]), available: saleEligible(context.boxes[slug]) && remaining > 0 && priceCents === site.preorderPriceUSD * 100, priceCents, founding, remaining }];
  })) as Record<BoxSlug, SaleState>;
  return { rules, sales };
}
export async function loadSaleSnapshot(): Promise<Record<BoxSlug, SaleState>> {
  return (await loadCommerceState()).sales;
}
