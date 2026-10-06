"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { db, must } from "@/lib/admin/db";
import { gtin14, printedForm } from "@/lib/admin/barcode";
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
 * and enough shelf life (P9 PASS); the product then counts as package-verified for packing.
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
  const product = must(await db().from("products").select("id, code, name, upc, notes").eq("id", f.product_id).single(), "product") as {
    id: string; code: string; name: string; upc: string | null; notes: string | null;
  };
  const owner = products.find((p) => p.id !== product.id && sameUpc(p.upc, upc)) ?? null;
  // A scan of a registered outer box proves identity for packets with no barcode of their own,
  // and must never be written onto the product as its unit barcode.
  const g14 = gtin14(upc);
  const pack = g14
    ? ((await db().from("purchase_packs").select("id, product_id, gtin, units_per_pack, barcode_sources").eq("gtin14", g14).maybeSingle()).data as
        | { id: string; product_id: string; gtin: string; units_per_pack: number; barcode_sources: unknown[] | null }
        | null)
    : null;
  const viaPack = pack?.product_id === product.id;
  const newBox = !viaPack && !pack && !product.upc && f.barcode_on === "box";
  const version = must(
    await db().from("product_versions").select("id, pregnancy_checks").eq("product_id", product.id).eq("is_current", true).single(),
    "version",
  ) as { id: string; pregnancy_checks: Record<string, string> | null };
  const checks = version.pregnancy_checks ?? {};

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

  if (f.nutrition_ok === "no" || f.ingredients_ok === "no") {
    const invalidated = await db().from("product_versions").update({ verified_at: null, verified_by: null }).eq("id", version.id);
    if (invalidated.error) return { error: invalidated.error.message };
    revalidatePath("/admin", "layout");
  }
  if (f.single_serve === "no") {
    // A real finding from the package: record it so eligibility drops the product.
    await db().from("product_versions").update({ pregnancy_checks: { ...checks, P8: "FAIL" }, verified_at: null, verified_by: null }).eq("id", version.id);
    await db().from("products").update({ notes: withLine(product.notes, `Package check ${today} by ${admin.name}: not single-serve (P8 set to FAIL).`), updated_at: new Date().toISOString() }).eq("id", product.id);
    revalidatePath("/admin", "layout");
  }
  if (problems.length) return { problems };

  // The scanned package is the authority on identity: the barcode it was scanned from becomes "verified".
  const at = new Date().toISOString();
  const scan = { source: "package", gtin: printedForm(upc) ?? upc, exact_variant: true, checked_at: at, note: `Scanned on the Verify screen by ${admin.name}` };
  let identity: string;
  if (viaPack || newBox) {
    const box = viaPack
      ? await db().from("purchase_packs").update({ barcode_status: "verified", barcode_sources: [...(pack!.barcode_sources ?? []), scan] }).eq("id", pack!.id)
      : await db().from("purchase_packs").insert({ product_id: product.id, gtin: printedForm(upc) ?? upc, units_per_pack: f.units_per_box!, description: `Outer box of ${f.units_per_box}, registered on the Verify screen`, barcode_status: "verified", barcode_sources: [scan], created_by: admin.name });
    if (box.error) return { error: box.error.message };
    identity = `box barcode ${printedForm(upc) ?? upc} (${viaPack ? pack!.units_per_pack : f.units_per_box} per box; the single pack has no barcode on file)`;
  } else identity = `UPC ${printedForm(upc) ?? upc}`;
  const prior = (must(await db().from("products").select("barcode_sources").eq("id", product.id).single(), "barcode sources") as { barcode_sources: unknown[] | null }).barcode_sources ?? [];
  const up = await db()
    .from("products")
    .update({
      ...(viaPack || newBox
        ? {}
        : { upc: product.upc ?? printedForm(upc) ?? upc, barcode_status: "verified", barcode_sources: [...prior, scan], barcode_checked_at: at }),
      notes: withLine(product.notes, `Package verified ${today} by ${admin.name}: ${identity}, label and serving match, expires ${f.expires_on}.`),
      updated_at: at,
    })
    .eq("id", product.id);
  if (up.error) return { error: up.error.message };
  const vu = await db()
    .from("product_versions")
    .update({ verified_at: new Date().toISOString(), verified_by: admin.name, pregnancy_checks: { ...checks, P8: "PASS", P9: "PASS" } })
    .eq("id", version.id);
  if (vu.error) return { error: vu.error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, message: `${product.code} ${product.name} is package-verified.` };
}

/** Add an audit line under the pre-screen line (which stays first, for the clinician export). */
function withLine(notes: string | null, line: string): string {
  const [first, ...rest] = (notes ?? "").split("\n");
  return first.startsWith("[Pre-screen") ? [first, line, ...rest].join("\n").trim() : [line, notes ?? ""].join("\n").trim();
}
