"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { db, PHOTO_BUCKET } from "@/lib/admin/db";
import { ensureVendor } from "@/lib/admin/vendors";
import { dollarsToFractionalCents, productSchema, readProductForm, versionSchema } from "@/lib/admin/forms";
import { packageLabelChanged } from "@/lib/admin/verify";
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

const dupUpc = (msg: string) => /products_upc_key|duplicate key.*upc/i.test(msg);

export async function createProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const vendorId = await ensureVendor(String(fd.get("vendor") ?? ""), admin.name);
  const ins = await db()
    .from("products")
    .insert({ ...parsed.product, code: "", default_vendor_id: vendorId, created_by: admin.name })
    .select("id")
    .single();
  if (ins.error) return { error: dupUpc(ins.error.message) ? "A product with this UPC already exists." : ins.error.message };
  const ver = await db()
    .from("product_versions")
    .insert({ ...parsed.version, verified_at: null, product_id: ins.data.id, version: 1, verified_by: null, created_by: admin.name });
  if (ver.error) {
    await db().from("products").delete().eq("id", ins.data.id);
    return { error: ver.error.message };
  }
  refresh();
  if (fd.get("_return") === "id") return { ok: true, id: ins.data.id };
  redirect(`/admin/products/${ins.data.id}`);
}

/**
 * Save edits. With "new formula version" ticked the current version is closed and a new
 * one starts today; otherwise the current version is corrected in place.
 */
export async function updateProduct(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const [previous, current] = await Promise.all([
    db().from("products").select("upc, type, form").eq("id", id).single(),
    db().from("product_versions").select("*").eq("product_id", id).eq("is_current", true).maybeSingle(),
  ]);
  if (previous.error) return { error: previous.error.message };
  if (current.error) return { error: current.error.message };
  const changed = fd.get("new_version") === "on" || !current.data || packageLabelChanged(current.data, parsed.version) ||
    previous.data.upc !== parsed.product.upc || previous.data.type !== parsed.product.type || previous.data.form !== parsed.product.form;
  // Only the package-in-hand Verify workflow may establish verification. Metadata edits
  // retain it; a label/formula change must be reviewed and checked again.
  parsed.version.verified_at = changed ? null : current.data?.verified_at ?? null;
  const verifiedBy = changed ? null : current.data?.verified_by ?? null;
  const vendorId = await ensureVendor(String(fd.get("vendor") ?? ""), admin.name);
  const up = await db().from("products").update({
    ...parsed.product, default_vendor_id: vendorId, updated_at: new Date().toISOString(),
    ...(changed ? { status: "Candidate", reviewed_by: null, reviewed_at: null } : {}),
  }).eq("id", id);
  if (up.error) return { error: dupUpc(up.error.message) ? "A product with this UPC already exists." : up.error.message };

  if (fd.get("new_version") === "on" || !current.data) {
    const today = new Date().toISOString().slice(0, 10);
    const latest = await db().from("product_versions").select("version").eq("product_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
    if (current.data) {
      const close = await db().from("product_versions").update({ is_current: false, effective_to: today }).eq("id", current.data.id);
      if (close.error) return { error: close.error.message };
    }
    const ins = await db().from("product_versions").insert({
      ...parsed.version,
      product_id: id,
      version: (latest.data?.version ?? 0) + 1,
      effective_from: today,
      verified_by: parsed.version.verified_at ? admin.name : null,
      created_by: admin.name,
    });
    if (ins.error) {
      if (current.data) await db().from("product_versions").update({ is_current: true, effective_to: null }).eq("id", current.data.id);
      return { error: ins.error.message };
    }
  } else {
    const upv = await db().from("product_versions").update({ ...parsed.version, verified_by: verifiedBy }).eq("id", current.data.id);
    if (upv.error) return { error: upv.error.message };
  }
  refresh();
  redirect(`/admin/products/${id}`);
}

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(STATUSES),
  reason: z.string().trim().max(500).optional(),
});

export async function setProductStatus(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = statusSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Invalid request" };
  const { id, status, reason } = parsed.data;
  if (status === "Rejected" && !reason) return { error: "Say why it's rejected (shown wherever it's offered)." };
  const now = new Date().toISOString();
  // Pre-approval is the pre-screen, not a clinical decision: keep the two audit trails apart.
  const who = status === "Pre-approved" ? { prescreened_by: admin.name, prescreened_at: now } : { reviewed_by: admin.name, reviewed_at: now };
  const res = await db()
    .from("products")
    .update({ status, reject_reason: status === "Rejected" ? reason : null, ...who, updated_at: now })
    .eq("id", id);
  if (res.error) return { error: res.error.message };
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
  if (res.error) return { error: res.error.message };
  refresh();
  return { ok: true };
}

/** Barcode lookup for the purchase flow: exact UPC match. */
export async function findByUpc(upc: string): Promise<{ id: string } | null> {
  await requireAdmin();
  const clean = upc.replace(/\D/g, "");
  if (clean.length < 6) return null;
  const res = await db().from("products").select("id").eq("upc", clean).maybeSingle();
  return res.data ?? null;
}
