import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { VerifyFlow, type VerifyItem } from "@/components/admin/verify-flow";
import { db, must, signedUrls } from "@/lib/admin/db";
import { eligibleFor, isClinicianApproved } from "@/lib/admin/rules";
import { loadAdminContext } from "@/lib/admin/summary";
import { BOX_LABEL, BOX_SLUGS } from "@/lib/admin/types";
import { MIN_DAYS_TO_EXPIRY, minExpiryDate } from "@/lib/admin/verify";

export const metadata: Metadata = { title: "Verify packages" };

export default async function VerifyPage() {
  const ctx = await loadAdminContext();
  const { catalog, boxes, rules, settings } = ctx;
  const prod = new Map(catalog.products.map((p) => [p.id, p]));
  const photos = must(await db().from("product_photos").select("product_id, kind, path, created_at").in("kind", ["front", "nutrition"]), "photos") as {
    product_id: string;
    kind: string;
    path: string;
    created_at: string;
  }[];
  const urls = await signedUrls(photos.map((p) => p.path));
  const photoOf = (id: string, kind: string) =>
    urls.get(photos.filter((p) => p.product_id === id && p.kind === kind).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.path ?? "") ?? null;

  const items: VerifyItem[] = catalog.snacks
    .filter((s) => s.status !== "Rejected" && s.status !== "Retired")
    .map((s) => {
      const p = prod.get(s.id)!;
      const v = catalog.versions.get(s.id);
      const inBoxes = BOX_SLUGS.filter((b) => boxes[b].picks.some((x) => x.snack.id === s.id)).map((b) => BOX_LABEL[b]);
      const eligible = BOX_SLUGS.filter((b) => eligibleFor(b, s, rules[b], settings.policy, s.rejectReason).fits).map((b) => BOX_LABEL[b]);
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        brand: s.brand,
        status: s.status,
        clinicianApproved: isClinicianApproved(s),
        upc: p.upc,
        verifiedAt: v?.verified_at ?? null,
        verifiedBy: v?.verified_by ?? null,
        inBoxes,
        eligible,
        unitOz: s.unit_wt_oz,
        nutrition: {
          Calories: s.calories,
          "Protein (g)": s.protein_g,
          "Fiber (g)": s.fiber_g,
          "Total carbs (g)": s.carbs_g,
          "Added sugar (g)": s.added_sugar_g,
          "Sodium (mg)": s.sodium_mg,
          "Saturated fat (g)": s.sat_fat_g,
        },
        ingredients: v?.ingredients ?? null,
        allergens: s.allergens,
        frontPhoto: photoOf(s.id, "front"),
        nutritionPhoto: photoOf(s.id, "nutrition"),
      };
    })
    // Boxes first, then anything eligible, then the rest; unverified before verified.
    .sort(
      (a, b) =>
        Number(Boolean(a.verifiedAt && a.upc)) - Number(Boolean(b.verifiedAt && b.upc)) ||
        Number(!a.inBoxes.length) - Number(!b.inBoxes.length) ||
        Number(!a.eligible.length) - Number(!b.eligible.length) ||
        a.code.localeCompare(b.code),
    );

  return (
    <>
      <PageHeader
        title="Verify packages"
        description={`With the package in your hand: scan its barcode, compare the label, confirm it's one sealed serving and check the date (at least ${MIN_DAYS_TO_EXPIRY} days left). Verified + clinician-approved = ready to pack.`}
      />
      <VerifyFlow items={items} minDays={MIN_DAYS_TO_EXPIRY} minDate={minExpiryDate()} />
    </>
  );
}
