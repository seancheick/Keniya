"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/admin/db";
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
  const latest = await db().from("box_lineups").select("version").eq("box_slug", d.slug).order("version", { ascending: false }).limit(1).maybeSingle();
  const ins = await db()
    .from("box_lineups")
    .insert({ box_slug: d.slug, version: (latest.data?.version ?? 0) + 1, status: "draft", objective: d.objective, notes: d.notes, created_by: admin.name })
    .select("id")
    .single();
  if (ins.error) return { error: ins.error.message };
  const items = await db()
    .from("lineup_items")
    .insert(d.items.map((it, i) => ({ lineup_id: ins.data.id, position: i + 1, product_id: it.product_id, category: it.category, is_extra: it.is_extra })));
  if (items.error) {
    await db().from("box_lineups").delete().eq("id", ins.data.id);
    return { error: items.error.message };
  }
  if (d.activate) {
    const act = await activate(ins.data.id, d.slug);
    if (act.error) return act;
  }
  revalidatePath("/admin", "layout");
  return { ok: true, id: ins.data.id };
}

async function activate(id: string, slug: string): Promise<BoxState> {
  const old = await db().from("box_lineups").update({ status: "archived" }).eq("box_slug", slug).eq("status", "active");
  if (old.error) return { error: old.error.message };
  const res = await db().from("box_lineups").update({ status: "active", activated_at: new Date().toISOString() }).eq("id", id);
  return res.error ? { error: res.error.message } : { ok: true };
}

export async function activateLineup(fd: FormData) {
  await requireAdmin();
  const id = z.uuid().parse(fd.get("id"));
  const row = await db().from("box_lineups").select("box_slug").eq("id", id).single();
  if (row.data) await activate(id, row.data.box_slug);
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
    highSodiumMax: int(fd.get("highSodiumMax")),
    treatMax: int(fd.get("treatMax")),
    carbsMax: dec(fd.get("carbsMax")),
    addedSugarMax: dec(fd.get("addedSugarMax")),
    sodiumMax: dec(fd.get("sodiumMax")),
    satFatMax: dec(fd.get("satFatMax")),
    satFatNutMax: dec(fd.get("satFatNutMax")),
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
  return { ok: true };
}
