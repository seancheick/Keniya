import { requireAdmin } from "@/lib/admin/auth";
import { recallRows, toCsv } from "@/lib/admin/recall";

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const rows = await recallRows({ lot: url.searchParams.get("lot") ?? undefined, product: url.searchParams.get("product") ?? undefined });
  const csv = toCsv(
    rows.map((r) => ({
      shipment: r.shipment,
      status: r.status,
      packed_at: r.packedAt,
      shipped_at: r.shippedAt,
      name: r.name,
      email: r.email,
      address: r.address,
      product: r.product,
      lot_code: r.lotCode,
      lot_id: r.lotId,
      qty: r.qty,
    })),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="keniya-recall-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
