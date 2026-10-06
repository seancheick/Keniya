import { requireAdmin } from "@/lib/admin/auth";
import { db, loadPackageProfiles, allRows } from "@/lib/admin/db";
import { exportRows, type ExportShipment } from "@/lib/admin/pirateship";
import { toCsv } from "@/lib/admin/recall";
import { BOX_LABEL, isBoxSlug } from "@/lib/admin/types";

/** Packed, not-yet-shipped boxes as a CSV for Pirate Ship's "Import spreadsheet". */
export async function GET() {
  await requireAdmin();
  type PackedRow = { code: string; recipient_name: string | null; recipient_email: string | null; ship_to: { address?: ExportShipment["address"] } | null; packed_weight_oz: number | null; package_profile_id: string | null; box_slug: string };
  const [list, packages] = await Promise.all([
    allRows<PackedRow>((from, to) => db().from("shipments").select("code, recipient_name, recipient_email, ship_to, packed_weight_oz, package_profile_id, box_slug").eq("status", "packed").order("packed_at").order("id").range(from, to), "shipments"),
    loadPackageProfiles(),
  ]);

  const csv = toCsv(
    exportRows(
      list.map((s) => {
        const pkg = packages.find((p) => p.id === s.package_profile_id);
        return {
          code: s.code,
          name: s.recipient_name,
          email: s.recipient_email,
          address: s.ship_to?.address ?? null,
          weightOz: s.packed_weight_oz === null ? null : Number(s.packed_weight_oz),
          dims: pkg ? { l: pkg.length_in, w: pkg.width_in, h: pkg.height_in } : null,
          box: isBoxSlug(s.box_slug) ? BOX_LABEL[s.box_slug] : s.box_slug,
        };
      }),
    ),
  );
  return new Response(csv || "Order ID\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="keniya-pirateship-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
