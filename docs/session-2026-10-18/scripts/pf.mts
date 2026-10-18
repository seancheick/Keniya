/* eslint-disable @typescript-eslint/no-explicit-any -- one-off ops scripts kept for the record */
(async () => {
const { db } = await import("../../../src/lib/admin/db");
const r = await db().from("box_rules").select("rules").eq("box_slug", "blood_sugar").single();
const rules = r.data!.rules as any;
if (rules.proteinOrFiberMin !== 5) { console.log("skip, pf =", rules.proteinOrFiberMin); return; }
const u = await db().from("box_rules").update({ rules: { ...rules, proteinOrFiberMin: 8 }, updated_at: new Date().toISOString(), updated_by: "migration: clinician review" }).eq("box_slug", "blood_sugar");
console.log(u.error ? u.error.message : "blood_sugar proteinOrFiberMin 5 -> 8");
})();
