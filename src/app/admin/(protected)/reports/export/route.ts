import { requireAdmin } from "@/lib/admin/auth";
import { db, must } from "@/lib/admin/db";
import { clinicalReviewRows } from "@/lib/admin/clinical";
import { clinicalWorkbook } from "@/lib/admin/clinical-xlsx";
import { toCsv } from "@/lib/admin/recall";
import { eligibleFor } from "@/lib/admin/rules";
import { loadAdminContext } from "@/lib/admin/summary";
import { BOX_SLUGS } from "@/lib/admin/types";

const TABLES = {
  shipments: "shipments",
  shipment_items: "shipment_items",
  products: "products",
  product_versions: "product_versions",
  lots: "purchase_lots",
  movements: "stock_movements",
  prices: "vendor_prices",
  vendors: "vendors",
  preorders: "preorders",
  expenses: "expenses",
} as const;

export async function GET(request: Request) {
  await requireAdmin();
  const t = new URL(request.url).searchParams.get("table") as keyof typeof TABLES | "clinical_review" | null;
  if (t === "clinical_review")
    return new Response(new Uint8Array(await clinicalWorkbook(await clinicalReview())), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="keniya-clinician-review-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  if (!t || !(t in TABLES)) return new Response("Unknown table", { status: 400 });
  const rows: Record<string, unknown>[] = [];
  // Page through (PostgREST caps responses at 1000 rows).
  for (let from = 0; ; from += 1000) {
    const page = must(await db().from(TABLES[t]).select("*").range(from, from + 999), t) as Record<string, unknown>[];
    rows.push(...page.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v !== null && typeof v === "object" ? JSON.stringify(v) : v]))));
    if (page.length < 1000) break;
  }
  return csv(t, rows);
}

async function clinicalReview() {
  const ctx = await loadAdminContext();
  const { products, versions, snacks } = ctx.catalog;
  const prod = new Map(products.map((p) => [p.id, p]));
  return clinicalReviewRows(
    snacks,
    (id) => {
      const p = prod.get(id);
      const v = versions.get(id);
      if (!p) return undefined;
      return {
        upc: p.upc,
        form: p.form,
        shelfLife: v?.shelf_life ?? null,
        ingredients: v?.ingredients ?? null,
        nutritionSource: v?.nutrition_source ?? null,
        verifiedAt: v?.verified_at ?? null,
        verifiedBy: v?.verified_by ?? null,
        reviewedBy: p.reviewed_by,
        reviewedAt: p.reviewed_at,
        prescreenedBy: p.prescreened_by,
        prescreenedAt: p.prescreened_at,
        notes: p.notes,
      };
    },
    (id) => BOX_SLUGS.filter((b) => ctx.boxes[b].picks.some((x) => x.snack.id === id)),
    (slug, s) => eligibleFor(slug, s, ctx.rules[slug], ctx.settings.policy, s.rejectReason),
  );
}

function csv(t: string, rows: Record<string, unknown>[]) {
  // BOM so Excel opens µ/≥/accents correctly.
  return new Response("\uFEFF" + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="keniya-${t}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
