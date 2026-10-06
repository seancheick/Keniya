"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { db, must } from "@/lib/admin/db";
import { loadAdminContext } from "@/lib/admin/summary";
import { blockingFailures, checkLineup, eligibleFor } from "@/lib/admin/rules";
import { BOX_SLUGS, OBJECTIVES, boxRulesSchema } from "@/lib/admin/types";

export type BoxState = { error?: string; ok?: boolean; id?: string };

const lineupSchema = z.object({
  slug: z.enum(BOX_SLUGS),
  objective: z.enum([...OBJECTIVES, "manual"]).nullable(),
  notes: z.string().max(1000).nullable(),
  activate: z.boolean(),
  items: z
    .array(z.object({ product_id: z.uuid(), category: z.string().max(40).nullable(), is_extra: z.boolean().default(false) }))
    .min(1)
    .max(40),
});

/** Save a lineup as a new version (draft, or active, archiving the previous active one). */
export async function saveLineup(input: z.input<typeof lineupSchema>): Promise<BoxState> {
  const admin = await requireAdmin();
  const parsed = lineupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.activate) {
    const error = await activationProblem(d.slug, d.items);
    if (error) return { error };
  }
  const ins = await db().rpc("save_box_lineup", { p_slug: d.slug, p_objective: d.objective, p_notes: d.notes, p_activate: d.activate, p_actor: admin.name, p_items: d.items });
  if (ins.error) return { error: ins.error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, id: ins.data as string };
}

async function activationProblem(slug: typeof BOX_SLUGS[number], items: { product_id: string; category: string | null; is_extra: boolean }[]): Promise<string | null> {
  const ctx = await loadAdminContext();
  if (items.some((i) => !ctx.catalog.byId.has(i.product_id))) return "Lineup contains an unknown product";
  const picks = items.filter((i) => !i.is_extra).map((i) => ({ snack: ctx.catalog.byId.get(i.product_id)!, category: i.category }));
  if (picks.some((p) => p.category && !p.snack.categories.includes(p.category))) return "A selected snack does not belong to its assigned category";
  const extras = items.filter((i) => i.is_extra).map((i) => ctx.catalog.byId.get(i.product_id)!);
  const invalidExtra = extras.find((s) => !eligibleFor(slug, s, ctx.rules[slug], ctx.settings.policy, s.rejectReason).fits);
  if (invalidExtra) return `Extra ${invalidExtra.name} is not eligible for this box`;
  const fails = blockingFailures(checkLineup(slug, ctx.rules[slug], picks, ctx.settings, ctx.packOz + extras.reduce((s, e) => s + (e.unit_wt_oz ?? 0), 0)));
  return fails.length ? `Save as a draft first: ${fails.map((c) => `${c.label}: ${c.value}`).join("; ")}` : null;
}

export async function activateLineup(fd: FormData) {
  await requireAdmin();
  const id = z.uuid().parse(fd.get("id"));
  const row = must(await db().from("box_lineups").select("box_slug").eq("id", id).single(), "lineup") as { box_slug: typeof BOX_SLUGS[number] };
  const items = must(await db().from("lineup_items").select("product_id, category, is_extra").eq("lineup_id", id), "items");
  const error = await activationProblem(row.box_slug, items);
  if (error) throw new Error(error);
  const res = await db().rpc("activate_box_lineup", { p_id: id });
  if (res.error) throw new Error(res.error.message);
  revalidatePath("/admin", "layout");
}

const int = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number.parseInt(String(v), 10));
const dec = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? null : Number(v));

export async function saveBoxRules(_prev: BoxState, fd: FormData): Promise<BoxState> {
  const admin = await requireAdmin();
  const slug = z.enum(BOX_SLUGS).safeParse(fd.get("slug"));
  if (!slug.success) return { error: "Unknown box" };
  const names = fd.getAll("cat_name").map(String);
  const mins = fd.getAll("cat_min");
  const maxs = fd.getAll("cat_max");
  const categories = names
    .map((name, i) => ({ name: name.trim(), min: int(mins[i]) ?? 0, max: int(maxs[i]) ?? 0 }))
    .filter((c) => c.name);
  const rules = boxRulesSchema.safeParse({
    total: int(fd.get("total")),
    categories,
    substantialMin: int(fd.get("substantialMin")),
    miniMax: int(fd.get("miniMax")),
    beverageMax: int(fd.get("beverageMax")),
    proteinOrFiberMin: int(fd.get("proteinOrFiberMin")),
    wholeFoodMin: int(fd.get("wholeFoodMin")),
    nutSeedMin: int(fd.get("nutSeedMin")),
    fiberMin: int(fd.get("fiberMin")),
    treatMax: int(fd.get("treatMax")),
    carbsMax: dec(fd.get("carbsMax")),
    addedSugarMax: dec(fd.get("addedSugarMax")),
    treatAddedSugarMax: dec(fd.get("treatAddedSugarMax")),
    sodiumMax: dec(fd.get("sodiumMax")),
    satFatMax: dec(fd.get("satFatMax")),
    satFatNutMax: dec(fd.get("satFatNutMax")),
    caffeineMax: dec(fd.get("caffeineMax")),
  });
  if (!rules.success) return { error: rules.error.issues[0].message };
  const r = rules.data;
  if (r.categories.some((c) => c.min > c.max)) return { error: "A category's minimum is above its maximum" };
  const sumMin = r.categories.reduce((s, c) => s + c.min, 0);
  const sumMax = r.categories.reduce((s, c) => s + c.max, 0);
  if (r.categories.length && (sumMin > r.total || sumMax < r.total))
    return { error: `Category ranges must allow exactly ${r.total} picks (minimums add to ${sumMin}, maximums to ${sumMax})` };
  const res = await db().from("box_rules").upsert({ box_slug: slug.data, rules: r, updated_at: new Date().toISOString(), updated_by: admin.name });
  if (res.error) return { error: res.error.message };
  revalidatePath("/admin", "layout");
  // The public site prints these rules (src/lib/public-rules.ts), so a save re-renders it too.
  revalidatePath("/", "layout");
  return { ok: true };
}
