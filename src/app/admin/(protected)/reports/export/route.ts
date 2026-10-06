import { requireAdmin } from "@/lib/admin/auth";
import { db, must } from "@/lib/admin/db";
import { clinicalReviewRows } from "@/lib/admin/clinical";
import { clinicalWorkbook } from "@/lib/admin/clinical-xlsx";
import { clinicianPacketWorkbook } from "@/lib/admin/clinical-packet";
import { toCsv } from "@/lib/admin/recall";
import { eligibleFor, lineupStage } from "@/lib/admin/rules";
import { loadAdminContext } from "@/lib/admin/summary";
import { BOX_LABEL, BOX_SLUGS } from "@/lib/admin/types";

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
  const t = new URL(request.url).searchParams.get("table") as keyof typeof TABLES | "clinical_review" | "clinician_packet" | null;
  if (t === "clinical_review") {
    const review = await clinicalReview();
    return new Response(new Uint8Array(await clinicalWorkbook(review.rows, review.ruleSummary)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="keniya-clinician-review-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (t === "clinician_packet") {
    // The finished lineups only: what the clinician signs, not the whole catalog.
    const ctx = await loadAdminContext();
    const buf = await clinicianPacketWorkbook({
      boxes: BOX_SLUGS.map((slug) => {
        const b = ctx.boxes[slug];
        return { slug, version: b.lineup?.version ?? null, stage: lineupStage([...b.picks, ...b.extras.map((snack) => ({ snack }))], b.ready), checks: b.checks, picks: b.picks, extras: b.extras };
      }),
      rules: ctx.rules,
      policy: ctx.settings.policy,
      extra: extraFor(ctx),
    });
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="keniya-clinician-packet-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (!t || !(t in TABLES)) return new Response("Unknown table", { status: 400 });
  const rows: Record<string, unknown>[] = [];
  // Page through (PostgREST caps responses at 1000 rows).
  for (let from = 0; ; from += 1000) {
    const page = must(await db().from(TABLES[t]).select("*").order("id").range(from, from + 999), t) as Record<string, unknown>[];
    rows.push(...page.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v !== null && typeof v === "object" ? JSON.stringify(v) : v]))));
    if (page.length < 1000) break;
  }
  return csv(t, rows);
}

/** Label/version evidence for a product, shared by both clinician exports. */
function extraFor(ctx: Awaited<ReturnType<typeof loadAdminContext>>) {
  const { products, versions } = ctx.catalog;
  const prod = new Map(products.map((p) => [p.id, p]));
  return (id: string) => {
    const p = prod.get(id);
    const v = versions.get(id);
    if (!p) return undefined;
    return {
      versionId: v?.id ?? null,
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
  };
}

async function clinicalReview() {
  const ctx = await loadAdminContext();
  const { snacks } = ctx.catalog;
  const rows = clinicalReviewRows(
    snacks,
    extraFor(ctx),
    (id) => BOX_SLUGS.filter((b) => ctx.boxes[b].picks.some((x) => x.snack.id === id) || ctx.boxes[b].extras.some((x) => x.id === id)),
    (slug, s) => eligibleFor(slug, s, ctx.rules[slug], ctx.settings.policy, s.rejectReason),
  );
  const ruleSummary = BOX_SLUGS.map((slug) => {
    const r = ctx.rules[slug];
    const limits = [["Total carbs (g)", r.carbsMax], ["Added sugar (g)", r.addedSugarMax], ["Sodium (mg)", r.sodiumMax], ["Saturated fat (g)", r.satFatMax], ["Saturated fat for nuts/seeds (g)", r.satFatNutMax]];
    return `${BOX_LABEL[slug]} per-pack limits: ${limits.map(([label, value]) => `${label}: ${value === null ? "no configured limit" : `maximum ${value}`}`).join("; ")}.`;
  });
  return { rows, ruleSummary };
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
