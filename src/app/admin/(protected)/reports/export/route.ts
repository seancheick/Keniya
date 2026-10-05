import { requireAdmin } from "@/lib/admin/auth";
import { db, must } from "@/lib/admin/db";
import { toCsv } from "@/lib/admin/recall";

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
  const t = new URL(request.url).searchParams.get("table") as keyof typeof TABLES | null;
  if (!t || !(t in TABLES)) return new Response("Unknown table", { status: 400 });
  const rows: Record<string, unknown>[] = [];
  // Page through (PostgREST caps responses at 1000 rows).
  for (let from = 0; ; from += 1000) {
    const page = must(await db().from(TABLES[t]).select("*").range(from, from + 999), t) as Record<string, unknown>[];
    rows.push(...page.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v !== null && typeof v === "object" ? JSON.stringify(v) : v]))));
    if (page.length < 1000) break;
  }
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="keniya-${t}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
