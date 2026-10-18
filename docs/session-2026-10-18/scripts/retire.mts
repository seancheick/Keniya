 
(async () => {
const { db } = await import("../../../src/lib/admin/db");
const p = await db().from("products").select("id, code, name, status").eq("code", "P009").single();
console.log(p.data?.code, p.data?.name, p.data?.status);
const r = await db().rpc("set_product_review", { p_id: p.data!.id, p_status: "Retired", p_reason: null, p_actor: "Claude (owner request 2026-10-18)", p_role: "admin" });
console.log(r.error ? `ERROR ${r.error.message}` : "Retired");
})();
