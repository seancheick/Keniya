"use server";

import { revalidatePath } from "next/cache";
import { expireInvalidCheckoutSessions } from "@/lib/commerce-reconcile";
import { z } from "zod";
import { BOX_SLUGS } from "@/lib/admin/types";
import { requireAdmin } from "@/lib/admin/auth";
import { db, must } from "@/lib/admin/db";
import { gtin14 } from "@/lib/admin/barcode";
import { sameUpc } from "@/lib/admin/fdc";
import { normalizeUpc, verifyProblems } from "@/lib/admin/verify";

export type VerifyState = { error?: string; problems?: string[]; ok?: boolean; message?: string };

const schema = z.object({
  product_id: z.uuid(),
  upc: z.string().max(40),
  nutrition_ok: z.enum(["yes", "no"]),
  ingredients_ok: z.enum(["yes", "no"]),
  single_serve: z.enum(["yes", "no"]),
  expires_on: z.string().max(10),
  // A barcode not on file yet: is it on the single pack, or on the outer box it came in?
  barcode_on: z.enum(["unit", "box"]).optional(),
  units_per_box: z.coerce.number().int().min(2).max(1000).optional(),
});

/**
 * Record a package-in-hand check. Verified = UPC saved, label confirmed, single-serve (P8 PASS)
 * and enough shelf life on the package checked; the product then counts as package-verified for packing.
 * A "not single-serve" answer is saved as P8 FAIL so the product leaves the boxes.
 */
export async function verifyPackage(_prev: VerifyState, fd: FormData): Promise<VerifyState> {
  const admin = await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Answer every question first." };
  const f = parsed.data;
  const upc = normalizeUpc(f.upc);
  const today = new Date().toISOString().slice(0, 10);

  const products = must(await db().from("products").select("id, code, name, upc, notes").not("upc", "is", null), "products") as {
    id: string; code: string; name: string; upc: string; notes: string | null;
  }[];
  const product = must(await db().from("products").select("id, code, name, upc, notes, updated_at").eq("id", f.product_id).single(), "product") as {
    id: string; code: string; name: string; upc: string | null; notes: string | null; updated_at: string;
  };
  const owner = products.find((p) => p.id !== product.id && sameUpc(p.upc, upc)) ?? null;
  // A scan of a registered outer box proves identity for packets with no barcode of their own,
  // and must never be written onto the product as its unit barcode.
  const g14 = gtin14(upc);
  const packResult = g14 ? await db().from("purchase_packs").select("id, product_id, gtin, units_per_pack, barcode_sources").eq("gtin14", g14).maybeSingle() : { data: null, error: null };
  if (packResult.error) return { error: packResult.error.message };
  const pack = packResult.data as
        | { id: string; product_id: string; gtin: string; units_per_pack: number; barcode_sources: unknown[] | null }
        | null;
  const viaPack = pack?.product_id === product.id;
  const newBox = !viaPack && !pack && !product.upc && f.barcode_on === "box";
  const version = must(
    await db().from("product_versions").select("*").eq("product_id", product.id).eq("is_current", true).single(),
    "version",
  ) as { id: string; pregnancy_checks: Record<string, string> | null };

  const problems = verifyProblems({
    scannedUpc: upc,
    fileUpc: viaPack ? null : product.upc,
    otherOwner: viaPack ? null : owner,
    nutritionMatches: f.nutrition_ok === "yes",
    ingredientsMatch: f.ingredients_ok === "yes",
    singleServe: f.single_serve === "yes",
    expiresOn: f.expires_on,
    today,
  });
  if (pack && !viaPack) problems.unshift(`That barcode is the outer box of another product: scan this product's own pack or its box.`);
  if (!viaPack && !pack && !product.upc && !f.barcode_on) problems.unshift("Say whether this barcode is on the single pack or on the outer box it came in.");
  if (newBox && !f.units_per_box) problems.unshift("How many single packs are in that box?");

  if (f.nutrition_ok === "no" || f.ingredients_ok === "no" || f.single_serve === "no") {
    const reasons = [
      f.nutrition_ok === "no" ? "nutrition panel differs" : null,
      f.ingredients_ok === "no" ? "ingredients/allergen statement differs" : null,
      f.single_serve === "no" ? "not single-serve (P8 FAIL)" : null,
    ].filter(Boolean).join("; ");
    const invalidated = await db().rpc("invalidate_package_check", {
      p_id: product.id, p_expected_updated_at: product.updated_at, p_expected_version: version,
      p_single_serve_failed: f.single_serve === "no", p_actor: admin.name, p_reason: reasons,
    });
    if (invalidated.error) return { error: invalidated.error.message };
    await expireInvalidCheckoutSessions(BOX_SLUGS);
    revalidatePath("/admin", "layout");
  }
  if (problems.length) return { problems };

  const verified = await db().rpc("verify_product_package", {
    p_id: product.id, p_expected_updated_at: product.updated_at, p_expected_version: version,
    p_gtin: upc, p_barcode_on: f.barcode_on ?? null, p_units: f.units_per_box ?? null,
    p_actor: admin.name, p_expiry: f.expires_on,
  });
  if (verified.error) return { error: verified.error.message };
  await expireInvalidCheckoutSessions(BOX_SLUGS);
  revalidatePath("/admin", "layout");
  return { ok: true, message: `${product.code} ${product.name} is package-verified.` };
}
