/* eslint-disable @typescript-eslint/no-explicit-any -- one-off ops scripts kept for the record */
(async () => {
const { db } = await import("../../../src/lib/admin/db");
const r = await db().from("box_rules").select("box_slug,rules,updated_by,updated_at");
for (const x of r.data ?? []) { const k = x.rules as any; console.log(x.box_slug, x.updated_by, x.updated_at, "pf", k.proteinOrFiberMin, "choc", k.chocolateMax, "boxcaf", k.boxCaffeineMax, "netrev", k.netCarbsReviewMax, k.carbsReviewCeiling, "kind", k.kindMax); }
})();
