/**
 * Permanently delete sample products by code. A dry run unless --apply is given; the owner runs it.
 *
 *   pnpm products:delete P012,P024            # show what would happen
 *   pnpm products:delete P012,P024 --apply    # delete
 *
 * A product with purchase lots or shipments is never deleted (retire it instead), and neither is
 * one in an active lineup. Its slots in draft or archived lineups (proposals that never shipped)
 * go with it: delete_product_with_draft_slots does both in one transaction, so a refusal leaves
 * the lineups untouched. Exits nonzero when any deletion fails.
 */
import { db } from "../src/lib/admin/db";

async function main() {
  const codes = (process.argv[2] ?? "").split(",").map((c) => c.trim()).filter(Boolean);
  const apply = process.argv.includes("--apply");
  if (!codes.length) throw new Error("Usage: pnpm products:delete P012,P024 [--apply]");
  const products = await db().from("products").select("id, code, name").in("code", codes);
  if (products.error) throw new Error(products.error.message);
  const missing = codes.filter((c) => !products.data.some((p) => p.code === c));
  if (missing.length) console.log(`Not found: ${missing.join(", ")}`);
  let deleted = 0;
  let failed = 0;
  for (const p of products.data) {
    const [lots, items] = await Promise.all([
      db().from("purchase_lots").select("id", { count: "exact", head: true }).eq("product_id", p.id),
      db().from("lineup_items").select("id, box_lineups(status)").eq("product_id", p.id),
    ]);
    if (lots.error || items.error) throw new Error((lots.error ?? items.error)!.message);
    const label = `${p.code} ${p.name}`;
    if (lots.count) {
      console.log(`SKIP ${label}: has purchase lots (retire it instead)`);
      continue;
    }
    const lineups = items.data as unknown as { id: string; box_lineups: { status: string } | null }[];
    if (lineups.some((i) => i.box_lineups?.status === "active")) {
      console.log(`SKIP ${label}: in an active lineup`);
      continue;
    }
    if (!apply) {
      console.log(`WOULD DELETE ${label}${lineups.length ? ` (and its ${lineups.length} draft/archived lineup slot(s))` : ""}`);
      continue;
    }
    const res = await db().rpc("delete_product_with_draft_slots", { p_id: p.id });
    if (res.error) {
      failed += 1;
      console.log(`FAILED ${label}: ${res.error.message}`);
    } else {
      deleted += 1;
      console.log(`DELETED ${label}`);
    }
  }
  console.log(apply ? `${deleted} deleted${failed ? `, ${failed} failed` : ""}.` : "Dry run: nothing changed. Add --apply to delete.");
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
