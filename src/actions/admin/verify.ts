"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { db, must } from "@/lib/admin/db";
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
  const version = must(
    await db().from("product_versions").select("id, pregnancy_checks").eq("product_id", product.id).eq("is_current", true).single(),
    "version",
  ) as { id: string; pregnancy_checks: Record<string, string> | null };
  const checks = version.pregnancy_checks ?? {};

  const problems = verifyProblems({
    scannedUpc: upc,
    fileUpc: product.upc,
    otherOwner: owner,
    nutritionMatches: f.nutrition_ok === "yes",
    ingredientsMatch: f.ingredients_ok === "yes",
    singleServe: f.single_serve === "yes",
    expiresOn: f.expires_on,
    today,
  });

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

  // The scanned package is the authority on identity: barcode_status becomes "verified".
  const prior = (must(await db().from("products").select("barcode_sources").eq("id", product.id).single(), "barcode sources") as { barcode_sources: unknown[] | null }).barcode_sources ?? [];
  const up = await db()
    .from("products")
    .update({
      upc: product.upc ?? upc,
      barcode_status: "verified",
      barcode_sources: [...prior, { source: "package", gtin: upc, exact_variant: true, checked_at: new Date().toISOString(), note: `Scanned on the Verify screen by ${admin.name}` }],
      barcode_checked_at: new Date().toISOString(),
      notes: withLine(product.notes, `Package verified ${today} by ${admin.name}: UPC ${upc}, label and serving match, expires ${f.expires_on}.`),
      updated_at: new Date().toISOString(),
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
