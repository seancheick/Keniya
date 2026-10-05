"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { db, PHOTO_BUCKET } from "@/lib/admin/db";
import { dollarsToCents } from "@/lib/admin/forms";
import { ensureVendor } from "@/lib/admin/vendors";

export type PurchaseState = {
  error?: string;
  ok?: boolean;
  lotId?: string;
  unitCostCents?: number;
  qty?: number;
};

const purchaseSchema = z.object({
  product_id: z.uuid("Pick a product first"),
  vendor: z.string().trim().min(1, "Where did you buy it?").max(120),
  qty: z.coerce.number().int("Whole units only").min(1, "How many units?").max(100_000),
  total: z.string().min(1, "What did you pay in total?"),
  purchased_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expires_on: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  lot_code: z.string().max(60).optional(),
  note: z.string().max(500).optional(),
});

/** One purchase = one lot. The DB trigger writes the receive ledger row and the price seen. */
export async function logPurchase(_prev: PurchaseState, fd: FormData): Promise<PurchaseState> {
  const admin = await requireAdmin();
  const parsed = purchaseSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const total = dollarsToCents(d.total);
  if (total === null || total < 0) return { error: "Total paid should be a dollar amount, e.g. 11.99" };

  const version = await db().from("product_versions").select("id").eq("product_id", d.product_id).eq("is_current", true).maybeSingle();
  if (!version.data) return { error: "That product has no current formula version." };
  const vendorId = await ensureVendor(d.vendor, admin.name);

  const lot = await db()
    .from("purchase_lots")
    .insert({
      product_id: d.product_id,
      product_version_id: version.data.id,
      vendor_id: vendorId,
      purchased_at: d.purchased_at,
      qty: d.qty,
      qty_remaining: d.qty,
      total_paid_cents: total,
      expires_on: d.expires_on || null,
      lot_code: d.lot_code || null,
      note: d.note || null,
      created_by: admin.name,
    })
    .select("id, unit_cost_cents")
    .single();
  if (lot.error) return { error: lot.error.message };

  const receipt = fd.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    if (!receipt.type.startsWith("image/") && receipt.type !== "application/pdf") return { error: "Receipt must be a photo or PDF (purchase saved)." };
    const ext = receipt.type === "application/pdf" ? "pdf" : "jpg";
    const path = `receipts/${lot.data.id}.${ext}`;
    const up = await db().storage.from(PHOTO_BUCKET).upload(path, receipt, { contentType: receipt.type, upsert: true });
    if (!up.error) await db().from("purchase_lots").update({ receipt_path: path }).eq("id", lot.data.id);
  }

  revalidatePath("/admin", "layout");
  return { ok: true, lotId: lot.data.id, unitCostCents: Number(lot.data.unit_cost_cents), qty: d.qty };
}

const adjustSchema = z.object({
  lot_id: z.uuid(),
  delta: z.coerce.number().int().refine((n) => n !== 0, "Enter + or − units"),
  kind: z.enum(["adjust", "waste", "return"]),
  reason: z.string().trim().min(2, "Give a reason").max(300),
});

export type SimpleState = { error?: string; ok?: boolean };

export async function adjustLot(_prev: SimpleState, fd: FormData): Promise<SimpleState> {
  const admin = await requireAdmin();
  const parsed = adjustSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  // Waste and returns always remove stock; the sign is implied.
  const delta = d.kind === "adjust" ? d.delta : -Math.abs(d.delta);
  const res = await db().rpc("adjust_lot", { p_lot: d.lot_id, p_delta: delta, p_kind: d.kind, p_reason: d.reason, p_actor: admin.name });
  if (res.error) return { error: res.error.message };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
