"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { avoidConflict } from "@/lib/admin/avoid";
import { db, must, allRows, identityCode } from "@/lib/admin/db";
import { optimize } from "@/lib/admin/optimizer";
import { matchLabel, readLabelCsv } from "@/lib/admin/pirateship";
import { estimatePostage } from "@/lib/admin/postage";
import { stripeFeeForSession } from "@/lib/stripe-fee";
import { packingProblems } from "@/lib/admin/packing";
import { stockPickList, stockSnapshot } from "@/lib/admin/stock";
import { loadAdminContext } from "@/lib/admin/summary";
import { BOX_SLUGS, type BoxSlug } from "@/lib/admin/types";

export type OrderState = { error?: string; ok?: boolean; message?: string; id?: string };

const refresh = () => revalidatePath("/admin", "layout");

type Preorder = {
  id: string;
  email: string;
  customer_name: string | null;
  amount_total: number;
  shipping: { name?: string; address?: Record<string, string | null> } | null;
  box_slug: string | null;
  avoid: string | null;
  stripe_fee_cents: number | null;
  stripe_session_id: string;
  status: string;
};

/**
 * The products to pack for a box: the active lineup, with anything that conflicts with the
 * customer's avoid answer swapped by the optimizer (same rules, those products excluded).
 */
async function planItems(slug: BoxSlug, avoid: string | null) {
  const ctx = await loadAdminContext();
  const box = ctx.boxes[slug];
  if (!box.lineup || !box.picks.length) return { error: `No active ${slug} lineup. Build one on the Boxes tab first.` } as const;
  const conflicts = ctx.catalog.snacks
    .map((s) => ({ s, why: avoidConflict({ ...s, ingredients: ctx.catalog.versions.get(s.id)?.ingredients }, avoid) }))
    .filter((x) => x.why);
  const hit = box.picks.filter((p) => conflicts.some((c) => c.s.id === p.snack.id));
  const extraHit = box.extras.filter((e) => conflicts.some((c) => c.s.id === e.id));
  if (extraHit.length) return { error: `Avoid “${avoid}” conflicts with extras: ${extraHit.map((e) => e.name).join(", ")}. Update the box extras first.` } as const;
  let picks = box.picks;
  let note: string | null = null;
  if (hit.length) {
    const r = optimize({
      slug,
      rules: ctx.rules[slug],
      settings: ctx.settings,
      snacks: ctx.catalog.snacks,
      objective: "balanced",
      packagingOz: ctx.packOz,
      excludeIds: conflicts.map((c) => c.s.id),
    });
    if (r.picks.length === box.picks.length && r.deficit === 0) {
      picks = r.picks;
      note = `Avoid “${avoid}”: swapped ${hit.map((h) => h.snack.name).join(", ")}`;
    } else {
      note = `Avoid “${avoid}” conflicts with ${hit.map((h) => h.snack.name).join(", ")}; no compliant lineup found. Swap by hand.`;
    }
  }
  return { ctx, lineupId: box.lineup.id, items: [...picks.map((p) => p.snack.id), ...box.extras.map((e) => e.id)], note } as const;
}

export async function createShipmentForPreorder(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = z.uuid().parse(fd.get("preorder_id"));
  const pre = must(await db().from("preorders").select("*").eq("id", id).single(), "preorder") as Preorder;
  if (pre.status !== "paid") throw new Error("Only paid preorders can be planned");
  const slug = BOX_SLUGS.find((s) => s === pre.box_slug);
  if (!slug) throw new Error("Preorder has no known box");
  const plan = await planItems(slug, pre.avoid);
  if ("error" in plan) throw new Error(plan.error);
  let fee = pre.stripe_fee_cents;
  if (fee === null) {
    const actual = await stripeFeeForSession(pre.stripe_session_id);
    if (actual) {
      fee = actual.feeCents;
      await db().from("preorders").update({ stripe_fee_cents: actual.feeCents, amount_net_cents: actual.netCents }).eq("id", pre.id);
    }
  }
  fee ??= Math.round(pre.amount_total * plan.ctx.settings.fees.pct + plan.ctx.settings.fees.fixedCents);
  const res = await db().from("shipments").insert({
    kind: "order",
    preorder_id: pre.id,
    box_slug: slug,
    lineup_id: plan.lineupId,
    package_profile_id: plan.ctx.pkg?.id ?? null,
    recipient_name: pre.shipping?.name ?? pre.customer_name,
    recipient_email: pre.email,
    ship_to: pre.shipping,
    planned_items: plan.items,
    revenue_cents: pre.amount_total,
    stripe_fee_cents: fee,
    carrier: plan.ctx.settings.shipping.defaultCarrier,
    service: plan.ctx.settings.shipping.defaultService,
    notes: plan.note,
    created_by: admin.name,
  });
  if (res.error && !/shipments_one_per_preorder/.test(res.error.message)) throw new Error(res.error.message);
  refresh();
}

/** Create shipments for every paid preorder that doesn't have one yet. */
export async function createAllShipments(): Promise<OrderState> {
  await requireAdmin();
  const pres = await allRows<{ id: string; box_slug: string | null }>((from, to) => db().from("preorders").select("id, box_slug").eq("status", "paid").order("id").range(from, to), "preorders");
  const existing = new Set((await allRows<{ preorder_id: string }>((from, to) => db().from("shipments").select("preorder_id").not("preorder_id", "is", null).order("id").range(from, to), "shipments")).map((s) => s.preorder_id));
  let made = 0;
  const errors: string[] = [];
  for (const p of pres.filter((x) => !existing.has(x.id))) {
    const fd = new FormData();
    fd.set("preorder_id", p.id);
    try {
      await createShipmentForPreorder(fd);
      made++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  refresh();
  if (errors.length) return { error: `${made} created; ${errors.length} failed: ${[...new Set(errors)].join("; ")}` };
  return { ok: true, message: made ? `${made} shipment(s) planned` : "Every paid order already has a shipment" };
}

const manualSchema = z.object({
  kind: z.enum(["gift", "sample", "replacement"]),
  box_slug: z.enum(BOX_SLUGS),
  recipient_name: z.string().trim().min(1, "Who is it for?").max(120),
  recipient_email: z.union([z.literal(""), z.email()]).optional(),
  line1: z.string().max(200).optional(),
  line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postal_code: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  avoid: z.string().trim().max(500).optional(),
});

/** Gifts, samples, influencer boxes, replacements: $0 revenue, same packing and costs. */
export async function createManualShipment(_prev: OrderState, fd: FormData): Promise<OrderState> {
  const admin = await requireAdmin();
  const parsed = manualSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const plan = await planItems(d.box_slug, d.avoid || null);
  if ("error" in plan) return { error: plan.error };
  const res = await db()
    .from("shipments")
    .insert({
      kind: d.kind,
      box_slug: d.box_slug,
      lineup_id: plan.lineupId,
      package_profile_id: plan.ctx.pkg?.id ?? null,
      recipient_name: d.recipient_name,
      recipient_email: d.recipient_email || null,
      ship_to: { name: d.recipient_name, address: { line1: d.line1, line2: d.line2, city: d.city, state: d.state, postal_code: d.postal_code, country: "US" } },
      planned_items: plan.items,
      revenue_cents: 0,
      stripe_fee_cents: 0,
      carrier: plan.ctx.settings.shipping.defaultCarrier,
      service: plan.ctx.settings.shipping.defaultService,
      notes: [plan.note, d.notes].filter(Boolean).join(" · ") || null,
      avoid: d.avoid || null,
      created_by: admin.name,
    })
    .select("id")
    .single();
  if (res.error) return { error: res.error.message };
  refresh();
  return { ok: true, id: res.data.id };
}

export async function setShipmentPackage(_prev: OrderState, fd: FormData): Promise<OrderState> {
  await requireAdmin();
  const parsed = z.object({ id: z.uuid(), package_profile_id: z.uuid() }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Select a package" };
  const pkg = await db().from("package_profiles").select("id").eq("id", parsed.data.package_profile_id).eq("active", true).maybeSingle();
  if (pkg.error) return { error: pkg.error.message };
  if (!pkg.data) return { error: "That package is no longer active" };
  const res = await db().from("shipments").update({ package_profile_id: parsed.data.package_profile_id }).eq("id", parsed.data.id).eq("status", "planned").select("id").maybeSingle();
  if (res.error) return { error: res.error.message };
  if (!res.data) return { error: "Only a planned shipment's package can be changed" };
  refresh();
  return { ok: true, message: "Package saved; packing costs and weight updated" };
}

/** Swap planned items before packing. */
export async function setPlannedItems(shipmentId: string, productIds: string[]): Promise<OrderState> {
  await requireAdmin();
  const ids = z.array(z.uuid()).min(1).max(40).safeParse(productIds);
  if (!ids.success) return { error: "Invalid items" };
  if (!z.uuid().safeParse(shipmentId).success) return { error: "Invalid shipment" };
  const current = must(await db().from("shipments").select("planned_items, status").eq("id", shipmentId).maybeSingle(), "shipment") as { planned_items: string[]; status: string } | null;
  if (!current || current.status !== "planned") return { error: "This shipment is no longer planned. Refresh before editing." };
  if (ids.data.length !== current.planned_items.length) return { error: "Swap one item per slot; the number of items must stay the same" };
  const { problems } = await preparePack(shipmentId, ids.data, false);
  if (problems.length) return { error: problems.join("; ") };
  const res = await db().from("shipments").update({ planned_items: ids.data }).eq("id", shipmentId).eq("status", "planned").select("id").maybeSingle();
  if (res.error) return { error: res.error.message };
  if (!res.data) return { error: "This shipment changed. Refresh before editing." };
  refresh();
  return { ok: true };
}

async function preparePack(id: string, replacement?: string[], requireStock = true) {
  const ship = must(await db().from("shipments").select("box_slug, planned_items, package_profile_id, zone, status, preorder_id, lineup_id, avoid").eq("id", id).single(), "shipment") as { box_slug: BoxSlug; planned_items: string[]; package_profile_id: string | null; zone: number | null; status: string; preorder_id: string | null; lineup_id: string | null; avoid: string | null };
  const ctx = await loadAdminContext();
  const [pre, extra] = await Promise.all([
    ship.preorder_id ? db().from("preorders").select("avoid, status").eq("id", ship.preorder_id).single() : Promise.resolve({ data: null, error: null }),
    ship.lineup_id ? db().from("lineup_items").select("id").eq("lineup_id", ship.lineup_id).eq("is_extra", true) : Promise.resolve({ data: [], error: null }),
  ]);
  const preorder = must(pre, "preorder");
  const extraCount = must(extra, "extras").length;
  const pkg = ctx.packages.find((p) => p.id === ship.package_profile_id && p.active);
  const problems: string[] = [];
  if (ship.status !== "planned") problems.push("This shipment is no longer planned");
  if (preorder && preorder.status !== "paid") problems.push("Order is no longer paid — check its payment before packing");
  if (!pkg) problems.push("Select an active package profile before packing");
  const ids = (replacement ?? ship.planned_items) as string[];
  const slug = BOX_SLUGS.find((x) => x === ship.box_slug);
  const packOz = (pkg?.empty_weight_oz ?? 0) + ctx.settings.packaging.reduce((s, p) => s + p.weightOz, 0);
  const products = new Map(ctx.catalog.snacks.map((snack) => [snack.id, {
    snack, upc: identityCode(ctx.catalog.products.find((p) => p.id === snack.id) ?? { id: snack.id, upc: null }, ctx.catalog.packs),
    verifiedAt: ctx.catalog.versions.get(snack.id)?.verified_at ?? null,
    ingredients: ctx.catalog.versions.get(snack.id)?.ingredients,
  }]));
  if (!slug) problems.push("Unknown box");
  else problems.push(...packingProblems({ slug, ids, products, rules: ctx.rules[slug], settings: ctx.settings, packagingOz: packOz, extraCount, avoid: preorder?.avoid ?? ship.avoid ?? null }));
  const stock = stockPickList(ids, ctx.catalog.lots, ctx.catalog.versions);
  if (requireStock) for (const row of stock) if (row.short) problems.push(`${ctx.catalog.byId.get(row.productId)?.name ?? row.productId}: short ${row.short} packable unit(s)`);
  return { ship, ctx, pkg, ids, packOz, problems, stock };
}

export async function packShipment(_prev: OrderState, fd: FormData): Promise<OrderState> {
  const admin = await requireAdmin();
  const parsed = z.uuid().safeParse(fd.get("id"));
  if (!parsed.success) return { error: "Invalid shipment" };
  const id = parsed.data;
  const { ship, ctx, pkg, ids, packOz, problems, stock } = await preparePack(id);
  const expected = fd.get("expected_items");
  const expectedLots = fd.get("expected_lots");
  if (!expectedLots || expectedLots !== JSON.stringify(stockSnapshot(stock))) return { error: "Stock lots changed. Refresh and check the new lots before packing." };
  if (fd.get("expected_package") !== ship.package_profile_id) return { error: "Package changed. Refresh before packing." };
  if (expected !== ids.join(",")) return { error: "Items changed. Refresh and check the new pick list before packing." };
  if (problems.length) return { error: `Can't pack yet: ${problems.join("; ")}` };
  const measured = String(fd.get("measured_weight_oz") ?? "").trim();
  const weight = measured ? Number(measured) : ids.reduce((s, pid) => s + (ctx.catalog.byId.get(pid)?.unit_wt_oz ?? 0), 0) + packOz;
  if (!Number.isFinite(weight) || weight <= 0 || weight > ctx.settings.policy.maxBoxOz) return { error: `Packed weight must be above zero and no more than ${ctx.settings.policy.maxBoxOz} oz` };
  const packaging = (pkg?.cost_cents ?? 0) + ctx.settings.packaging.reduce((s, p) => s + p.cents, 0);
  const overhead = ctx.settings.overheads.reduce((s, o) => s + o.cents, 0);
  const history = must(await db().from("shipments").select("packed_weight_oz, label_cost_cents, package_profile_id, zone").not("label_cost_cents", "is", null).order("shipped_at", { ascending: false }).limit(500), "history");
  const est = estimatePostage({ settings: ctx.settings, slug: ship.box_slug, weightOz: weight, packageProfileId: pkg?.id, zone: ship.zone, history });
  const res = await db().rpc("pack_shipment_checked", {
    p_shipment: id, p_expected_items: ids, p_expected_lots: stockSnapshot(stock), p_expected_package: ship.package_profile_id, p_actor: admin.name,
    p_packaging_cents: packaging, p_overhead_cents: overhead,
    p_weight_oz: Math.round(weight * 10) / 10, p_est_postage_cents: est.cents,
  });
  if (res.error) {
    if (res.error.message === "SHORTAGE") return { error: "Not enough packable stock. Refresh the pick list to see the shortage." };
    return { error: res.error.message };
  }
  refresh();
  return { ok: true, message: "Packed: stock deducted from the listed lots" };
}

export async function unpackShipment(_prev: OrderState, fd: FormData): Promise<OrderState> {
  const admin = await requireAdmin();
  const id = z.uuid().parse(fd.get("id"));
  const res = await db().rpc("unpack_shipment", { p_shipment: id, p_actor: admin.name });
  if (res.error) return { error: res.error.message };
  refresh();
  return { ok: true, message: "Unpacked: stock returned to its lots" };
}

const labelSchema = z.object({
  id: z.uuid(),
  carrier: z.string().max(40).optional(),
  service: z.string().max(80).optional(),
  zone: z.string().optional(),
  label_cost: z.string().optional(),
  tracking: z.string().max(60).optional(),
  ship: z.string().optional(),
});

export async function saveLabel(_prev: OrderState, fd: FormData): Promise<OrderState> {
  await requireAdmin();
  const parsed = labelSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const cost = d.label_cost ? Math.round(Number(d.label_cost.replace(/[$,\s]/g, "")) * 100) : null;
  if (d.label_cost && (cost === null || !Number.isFinite(cost) || cost < 0)) return { error: "Label cost should be a dollar amount" };
  const zone = d.zone ? Number(d.zone) : null;
  if (zone !== null && (!Number.isInteger(zone) || zone < 1 || zone > 9)) return { error: "Zone must be a whole number from 1 to 9" };
  const patch: Record<string, unknown> = {
    carrier: d.carrier || null,
    service: d.service || null,
    zone: zone && zone >= 1 && zone <= 9 ? zone : null,
    label_cost_cents: cost,
    tracking: d.tracking?.trim() || null,
  };
  if (d.ship === "on") {
    const cur = await db().from("shipments").select("status").eq("id", d.id).single();
    if (cur.data?.status !== "packed") return { error: "Pack the box before marking it shipped" };
    if (cost === null || !patch.tracking) return { error: "Enter the label cost and tracking number to mark it shipped" };
    Object.assign(patch, { status: "shipped", shipped_at: new Date().toISOString() });
  }
  let update = db().from("shipments").update(patch).eq("id", d.id).in("status", ["packed", "shipped", "delivered", "issue"]);
  if (d.ship === "on") update = update.eq("status", "packed");
  const res = await update.select("id").maybeSingle();
  if (!res.error && !res.data) return { error: "Shipment changed. Refresh and try again." };
  if (res.error) return { error: res.error.message };
  refresh();
  return { ok: true, message: d.ship === "on" ? "Marked shipped" : "Saved" };
}

const statusSchema = z.object({
  id: z.uuid(),
  to: z.enum(["delivered", "issue"]),
  issue: z.enum(["damaged", "lost", "returned", "other"]).optional(),
  issue_note: z.string().max(500).optional(),
});

export async function setShipmentStatus(_prev: OrderState, fd: FormData): Promise<OrderState> {
  await requireAdmin();
  const parsed = statusSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const patch =
    d.to === "delivered"
      ? { status: "delivered", delivered_at: new Date().toISOString() }
      : { status: "issue", issue: d.issue ?? "other", issue_note: d.issue_note || null };
  const res = await db().from("shipments").update(patch).eq("id", d.id).in("status", ["shipped", "delivered", "issue"]).select("id").maybeSingle();
  if (!res.error && !res.data) return { error: "Ship the box before recording delivery or an issue" };
  if (res.error) return { error: res.error.message };
  refresh();
  return { ok: true, message: d.to === "delivered" ? "Delivered" : "Issue recorded" };
}

/** Import Pirate Ship's shipment history CSV: fill actual label cost, tracking, zone, service. */
export async function importPirateShip(_prev: OrderState, fd: FormData): Promise<OrderState> {
  await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Choose the CSV exported from Pirate Ship" };
  if (file.size > 3_000_000) return { error: "File too large" };
  const { rows, missing } = readLabelCsv(await file.text());
  if (missing.length) return { error: `Couldn't find column(s): ${missing.join(", ")}` };
  const ships = await allRows<{ id: string; code: string; tracking: string | null; status: string }>((from, to) => db().from("shipments").select("id, code, tracking, status").order("id").range(from, to), "shipments");
  let updated = 0;
  let unmatched = 0;
  for (const r of rows) {
    const id = matchLabel(r, ships);
    if (!id || r.costCents === null || r.costCents < 0) {
      unmatched++;
      continue;
    }
    const s = ships.find((x) => x.id === id)!;
    if (s.status === "planned" || (s.status === "packed" && !r.tracking && !s.tracking)) { unmatched++; continue; }
    const patch: Record<string, unknown> = { label_cost_cents: r.costCents };
    if (r.tracking) patch.tracking = r.tracking;
    if (r.carrier) patch.carrier = r.carrier;
    if (r.service) patch.service = r.service;
    if (r.zone) patch.zone = r.zone;
    if (s.status === "packed") Object.assign(patch, { status: "shipped", shipped_at: new Date().toISOString() });
    const res = await db().from("shipments").update(patch).eq("id", id).eq("status", s.status).select("id").maybeSingle();
    if (!res.error && res.data) updated++;
    else unmatched++;
  }
  refresh();
  return { ok: true, message: `${updated} label(s) recorded${unmatched ? `, ${unmatched} row(s) skipped (check KEN- reference, packed status, cost and tracking)` : ""}` };
}
