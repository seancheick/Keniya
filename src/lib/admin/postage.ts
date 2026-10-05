// Postage estimate that learns from real Pirate Ship labels: once there are enough shipped
// boxes in the same weight band (and package), use their median actual cost; otherwise fall
// back to the Settings estimate. Surcharges (e.g. holiday peaks) flow in automatically.
import { settingsPostage } from "./costing";
import type { BoxSlug, Settings } from "./types";

export const MIN_SAMPLES = 5;
const BAND_OZ = 4;

export type PostageSample = {
  packed_weight_oz: number | null;
  label_cost_cents: number | null;
  package_profile_id: string | null;
  zone: number | null;
};

const band = (oz: number) => Math.floor(oz / BAND_OZ);

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function estimatePostage(opts: {
  settings: Settings;
  slug: BoxSlug;
  weightOz: number;
  packageProfileId?: string | null;
  zone?: number | null;
  history?: PostageSample[];
}): { cents: number; source: "learned" | "settings"; samples: number; note: string } {
  const usable = (opts.history ?? []).filter(
    (h) =>
      h.label_cost_cents !== null &&
      h.packed_weight_oz !== null &&
      band(h.packed_weight_oz) === band(opts.weightOz) &&
      (!opts.packageProfileId || h.package_profile_id === opts.packageProfileId),
  );
  const zoned = opts.zone ? usable.filter((h) => h.zone === opts.zone) : [];
  const pool = zoned.length >= MIN_SAMPLES ? zoned : usable;
  if (pool.length >= MIN_SAMPLES) {
    const cents = Math.round(median(pool.map((h) => h.label_cost_cents!)));
    const lo = band(opts.weightOz) * BAND_OZ;
    return {
      cents,
      source: "learned",
      samples: pool.length,
      note: `median of ${pool.length} real labels, ${lo}–${lo + BAND_OZ} oz${pool === zoned ? `, zone ${opts.zone}` : ""}`,
    };
  }
  return {
    cents: settingsPostage(opts.settings, opts.slug, opts.weightOz),
    source: "settings",
    samples: pool.length,
    note: "Settings estimate (learns after 5 real labels in this weight band)",
  };
}
