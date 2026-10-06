"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/admin/db";
import { dollarsToCents, numOrNull } from "@/lib/admin/forms";
import { BOX_SLUGS, FORMS, settingsSchema, type Settings } from "@/lib/admin/types";

export type SettingsState = { error?: string; ok?: boolean };

const cents = (v: FormDataEntryValue | null) => dollarsToCents(v === null ? null : String(v)) ?? 0;
const num = (v: FormDataEntryValue | null) => numOrNull(v === null ? null : String(v));
const pct = (v: FormDataEntryValue | null) => (num(v) ?? 0) / 100;

function rows(fd: FormData, prefix: string) {
  const names = fd.getAll(`${prefix}_name`).map(String);
  const c = fd.getAll(`${prefix}_cents`);
  const w = fd.getAll(`${prefix}_oz`);
  return names
    .map((name, i) => ({ name: name.trim(), cents: cents(c[i] ?? null), weightOz: num(w[i] ?? null) ?? 0 }))
    .filter((r) => r.name);
}

export async function saveSettings(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  const admin = await requireAdmin();
  const tableFrom = fd.getAll("table_from");
  const tableCents = fd.getAll("table_cents");
  const data: Settings = {
    prices: Object.fromEntries(BOX_SLUGS.map((b) => [b, cents(fd.get(`price_${b}`))])) as Settings["prices"],
    runSize: Object.fromEntries(BOX_SLUGS.map((b) => [b, Math.max(0, Math.round(num(fd.get(`run_${b}`)) ?? 0))])) as Settings["runSize"],
    shipping: {
      method: z.enum(["table", "flat", "custom"]).catch("table").parse(fd.get("ship_method")),
      flatCents: cents(fd.get("ship_flat")),
      customCents: Object.fromEntries(
        BOX_SLUGS.map((b) => {
          const v = fd.get(`ship_custom_${b}`);
          return [b, v === null || String(v).trim() === "" ? null : cents(v)];
        }),
      ) as Settings["shipping"]["customCents"],
      varianceCents: cents(fd.get("ship_variance")),
      table: tableFrom
        .map((f, i) => ({ fromOz: num(f) ?? -1, cents: cents(tableCents[i] ?? null) }))
        .filter((r) => r.fromOz >= 0)
        .sort((a, b) => a.fromOz - b.fromOz),
      defaultCarrier: String(fd.get("ship_carrier") ?? "USPS").slice(0, 40),
      defaultService: String(fd.get("ship_service") ?? "Ground Advantage").slice(0, 60),
    },
    packaging: rows(fd, "pack"),
    overheads: rows(fd, "over").map(({ name, cents }) => ({ name, cents })),
    fees: { pct: pct(fd.get("fee_pct")), fixedCents: cents(fd.get("fee_fixed")) },
    wastePct: pct(fd.get("waste_pct")),
    purchaseBufferPct: pct(fd.get("buffer_pct")),
    policy: {
      allowedForms: fd.getAll("forms").map(String).filter((f): f is (typeof FORMS)[number] => (FORMS as readonly string[]).includes(f)),
      maxItemOz: num(fd.get("max_item_oz")) ?? 3.5,
      maxBoxOz: num(fd.get("max_box_oz")) ?? 32,
    },
    expiryTiersDays: [0, 1, 2].map((i) => Math.round(num(fd.getAll("tier")[i] ?? null) ?? [30, 60, 90][i])) as Settings["expiryTiersDays"],
  };
  if (!data.shipping.table.length) data.shipping.table = [{ fromOz: 0, cents: 0 }];
  const parsed = settingsSchema.safeParse(data);
  if (!parsed.success) return { error: `${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}` };
  const res = await db().from("admin_settings").upsert({ id: 1, data: parsed.data, updated_at: new Date().toISOString(), updated_by: admin.name });
  if (res.error) return { error: res.error.message };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const pkgSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]).optional(),
  name: z.string().trim().min(1).max(60),
  length_in: z.coerce.number().positive(),
  width_in: z.coerce.number().positive(),
  height_in: z.coerce.number().positive(),
  empty_weight_oz: z.coerce.number().min(0),
  cost: z.string(),
  is_default: z.string().optional(),
});

export async function savePackage(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const parsed = pkgSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, cost, is_default, ...rest } = parsed.data;
  const costCents = dollarsToCents(cost);
  if (costCents === null || costCents < 0) return { error: "Package cost must be a dollar amount of zero or more" };
  const row = { ...rest, cost_cents: costCents, is_default: is_default === "on" };
  const res = await db().rpc("save_package_profile", { p_id: id || null, p_profile: row });
  if (res.error) return { error: res.error.message };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const expenseSchema = z.object({
  spent_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().trim().min(1).max(60),
  amount: z.string().min(1, "Amount?"),
  note: z.string().max(300).optional(),
});

/** Costs that aren't per box: ads, software, samples, supplies bought in bulk… */
export async function addExpense(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  const admin = await requireAdmin();
  const parsed = expenseSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const amount = dollarsToCents(parsed.data.amount);
  if (amount === null || amount < 0) return { error: "Amount should be in dollars" };
  const res = await db().from("expenses").insert({ spent_on: parsed.data.spent_on, category: parsed.data.category, amount_cents: amount, note: parsed.data.note || null, created_by: admin.name });
  if (res.error) return { error: res.error.message };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
