import type { AdminContext } from "./summary";
import type { PacketInput } from "./clinical-packet";
import { BOX_SLUGS } from "./types";

/** One packet input for downloads, Laurie's review page and decision admission. */
export function packetInput(ctx: AdminContext): PacketInput {
  return {
    boxes: BOX_SLUGS.map((slug) => {
      const b = ctx.boxes[slug];
      return { slug, version: b.lineup?.version ?? null, state: b.lineup?.status === "draft" ? "draft" : "active", checks: b.checks, picks: b.picks, extras: b.extras };
    }),
    rules: ctx.rules,
    policy: ctx.settings.policy,
    extra: (id) => {
      const p = ctx.catalog.products.find((p) => p.id === id);
      const v = ctx.catalog.versions.get(id);
      if (!p) return undefined;
      return {
        versionId: v?.id ?? null, upc: p.upc,
        verifiedPackBarcode: ctx.catalog.packs.find((pack) => pack.product_id === id && pack.barcode_status === "verified")?.gtin ?? null,
        form: p.form, shelfLife: v?.shelf_life ?? null, ingredients: v?.ingredients ?? null,
        nutritionSource: v?.nutrition_source ?? null, verifiedAt: v?.verified_at ?? null,
        verifiedBy: v?.verified_by ?? null, reviewedBy: p.reviewed_by, reviewedAt: p.reviewed_at,
        prescreenedBy: p.prescreened_by, prescreenedAt: p.prescreened_at, notes: p.notes,
      };
    },
  };
}
