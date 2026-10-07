"use server";

import { revalidatePath } from "next/cache";
import { expireInvalidCheckoutSessions } from "@/lib/commerce-reconcile";
import { redirect } from "next/navigation";
import { z } from "zod";
import { BOX_SLUGS } from "@/lib/admin/types";
import { requireAdmin } from "@/lib/admin/auth";
import { db, PHOTO_BUCKET } from "@/lib/admin/db";
import { ensureVendor } from "@/lib/admin/vendors";
import { dollarsToFractionalCents, productSchema, readProductForm, versionSchema } from "@/lib/admin/forms";
import { validCheckDigit } from "@/lib/admin/barcode";
import { loadAdminContext } from "@/lib/admin/summary";
import { packetInput } from "@/lib/admin/packet-data";
import { packetProductRows } from "@/lib/admin/clinical-packet";
import { reviewTeamText } from "@/lib/admin/review-wording";
import { STATUSES } from "@/lib/admin/types";

export type FormState = { error?: string; ok?: boolean; id?: string };

const refresh = () => revalidatePath("/admin", "layout");

function parse(fd: FormData) {
  const { product, version } = readProductForm(fd);
  const p = productSchema.safeParse(product);
  if (!p.success) return { error: p.error.issues[0].message } as const;
  const v = versionSchema.safeParse(version);
  if (!v.success) return { error: v.error.issues[0].message } as const;
  return { product: p.data, version: v.data } as const;
}

const dupUpc = (msg: string) => /products_(upc|gtin14)_key|barcode_identities|duplicate key.*upc/i.test(msg);

export async function createProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const vendorId = await ensureVendor(String(fd.get("vendor") ?? ""), admin.name);
  // Receiving establishes packaging identity only after an explicit unit/outer-box answer.
  const scanned = fd.get("upc_source") === "scan";
  const barcodeOn = fd.get("barcode_on");
  if (scanned && !["unit", "box"].includes(String(barcodeOn))) return { error: "Say whether the scanned barcode is on the single pack or the outer box." };
  const outer = scanned && barcodeOn === "box" ? parsed.product.upc : null;
  const units = outer ? Number(fd.get("units_per_box")) : null;
  if (outer && (!Number.isInteger(units) || units! < 2 || units! > 1000)) return { error: "Enter 2–1000 single packs per outer box." };
  if (parsed.product.upc && !validCheckDigit(parsed.product.upc)) return { error: "Barcode must have a valid GS1 check digit." };
  const ins = await db().rpc("save_product", {
    p_id: null, p_product: { ...parsed.product, upc: outer ? null : parsed.product.upc, default_vendor_id: vendorId },
    p_version: parsed.version, p_actor: admin.name, p_new_version: false,
    p_expected_updated_at: null, p_outer_gtin: outer, p_outer_units: units,
  });
  if (ins.error) return { error: dupUpc(ins.error.message) ? "This barcode already identifies a product or outer pack." : ins.error.message };
  const productId = ins.data as string;
  refresh();
  if (fd.get("_return") === "id") return { ok: true, id: productId };
  redirect(`/admin/products/${productId}`);
}

/**
 * Save edits. With "new formula version" ticked the current version is closed and a new
 * one starts today; otherwise the current version is corrected in place.
 */
export async function updateProduct(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const previous = await db().from("products").select("updated_at").eq("id", id).single();
  if (previous.error) return { error: previous.error.message };
  if (parsed.product.upc && !validCheckDigit(parsed.product.upc)) return { error: "Barcode must have a valid GS1 check digit." };
  const vendorId = await ensureVendor(String(fd.get("vendor") ?? ""), admin.name);
  const saved = await db().rpc("save_product", {
    p_id: id, p_product: { ...parsed.product, default_vendor_id: vendorId }, p_version: parsed.version,
    p_actor: admin.name, p_new_version: fd.get("new_version") === "on",
    p_expected_updated_at: previous.data.updated_at, p_outer_gtin: null, p_outer_units: null,
  });
  if (saved.error) return { error: dupUpc(saved.error.message) ? "This barcode already identifies a product or outer pack." : saved.error.message };
  await expireInvalidCheckoutSessions(BOX_SLUGS);
  refresh();
  redirect(`/admin/products/${id}`);
}

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(STATUSES),
  clinical_decision: z.enum(["changes_requested"]).optional(),
  reason: z.string().trim().max(500).optional(),
});

export async function setProductStatus(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = statusSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Invalid request" };
  const { id, status, reason, clinical_decision } = parsed.data;
  if (admin.role === "clinician") {
    if (!["Approved", "Rejected"].includes(status) && !clinical_decision) return { error: "Choose approve, request changes or reject." };
    const rows = packetProductRows(packetInput(await loadAdminContext(undefined, true)));
    if (!rows.some((row) => row["Product ID"] === id)) return { error: "Internal diligence and lineup validation must be complete before PharmaGuide Team review." };
  }
  if (clinical_decision && admin.role !== "clinician") return { error: "Sign in with the PharmaGuide Team review account to request changes." };
  if (status === "Rejected" && !reason) return { error: "Say why it's rejected (shown wherever it's offered)." };
  if (status === "Approved" && admin.role !== "clinician") return { error: "Sign in with the PharmaGuide Team review account to approve." };
  const res = await db().rpc("set_product_review", {
    p_id: id, p_status: clinical_decision === "changes_requested" ? "Changes requested" : status, p_reason: reason ?? null, p_actor: admin.name, p_role: admin.role,
  });
  if (res.error) return { error: reviewTeamText(res.error.message) };
  await expireInvalidCheckoutSessions(BOX_SLUGS);
  refresh();
  return { ok: true };
}

const PHOTO_KINDS = ["front", "nutrition", "ingredients", "barcode", "other"] as const;
const MAX_BYTES = 4 * 1024 * 1024;

export async function uploadProductPhoto(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const productId = z.uuid().safeParse(fd.get("product_id"));
  const kind = z.enum(PHOTO_KINDS).safeParse(fd.get("kind"));
  const file = fd.get("file");
  if (!productId.success || !kind.success) return { error: "Invalid request" };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo" };
  if (!file.type.startsWith("image/")) return { error: "Photos only" };
  if (file.size > MAX_BYTES) return { error: "Photo is over 4 MB" };
  const version = await db().from("product_versions").select("id").eq("product_id", productId.data).eq("is_current", true).maybeSingle();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `products/${productId.data}/${kind.data}-${Date.now()}.${ext}`;
  const up = await db().storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { error: `Upload failed: ${up.error.message}` };
  const row = await db()
    .from("product_photos")
    .insert({ product_id: productId.data, version_id: version.data?.id ?? null, kind: kind.data, path, created_by: admin.name });
  if (row.error) return { error: row.error.message };
  refresh();
  return { ok: true };
}

export async function deleteProductPhoto(fd: FormData) {
  await requireAdmin();
  const id = z.uuid().parse(fd.get("id"));
  const row = await db().from("product_photos").select("path").eq("id", id).single();
  if (row.data) await db().storage.from(PHOTO_BUCKET).remove([row.data.path]);
  await db().from("product_photos").delete().eq("id", id);
  refresh();
}

const sightingSchema = z.object({
  product_id: z.uuid(),
  vendor: z.string().trim().min(1, "Which store or vendor?").max(120),
  unit_cost: z.string().min(1, "Unit price?"),
  pack_qty: z.string().optional(),
  source: z.enum(["sighting", "quote"]),
  seen_at: z.string().optional(),
  note: z.string().max(300).optional(),
});

/** A price seen on a shelf or quoted by a vendor, without buying. */
export async function logPriceSighting(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = sightingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const unit = dollarsToFractionalCents(parsed.data.unit_cost);
  if (unit === null) return { error: "Unit price should be a number" };
  const pack = parsed.data.pack_qty ? Number.parseInt(parsed.data.pack_qty, 10) : null;
  const vendorId = await ensureVendor(parsed.data.vendor, admin.name);
  const res = await db().from("vendor_prices").insert({
    product_id: parsed.data.product_id,
    vendor_id: vendorId,
    unit_cost_cents: unit,
    pack_qty: pack && pack > 0 ? pack : null,
    source: parsed.data.source,
    seen_at: parsed.data.seen_at || undefined,
    note: parsed.data.note || null,
    created_by: admin.name,
  });
  if (res.error) return { error: reviewTeamText(res.error.message) };
  refresh();
  return { ok: true };
}

/** Permanently remove an unused catalog product and its private photos. */
export async function deleteProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (admin.role !== "admin") return { error: "Only the admin can delete products." };
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success || fd.get("confirmed") !== "yes") return { error: "Confirm permanent deletion first." };
  const client = db();
  const removed = await client.rpc("delete_product_permanently", { p_id: id.data });
  if (removed.error) return { error: removed.error.message };
  const files = await client.from("product_deletion_files").select("path").eq("product_id", id.data);
  if (files.error) return { error: "Product deleted. Photo cleanup could not finish; retry deletion to finish cleanup." };
  const paths = (files.data ?? []).map(f => f.path as string);
  if (paths.length) {
    const cleanup = await client.storage.from(PHOTO_BUCKET).remove(paths);
    if (cleanup.error) return { error: "Product deleted. Photo cleanup could not finish; retry deletion to finish cleanup." };
    const acknowledged = await client.from("product_deletion_files").delete().eq("product_id", id.data);
    if (acknowledged.error) return { error: "Product and photos deleted. Retry to clear the cleanup receipt." };
  }
  refresh();
  return { ok: true };
}
