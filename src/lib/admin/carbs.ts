// Net carbohydrate (owner decision 2026-10-18): calculated and shown for every product, never
// used to qualify one. Net = total carbs − dietary fiber, from the verified per-pack label values.
// Sugar alcohols and allulose are never subtracted. Missing or inconsistent values stay unknown
// (null, with an issue code) instead of becoming a reassuring zero.

export type NetCarbIssue = "FIBER_MISSING" | "CARBS_MISSING" | "INVALID_NUTRITION";
export type NetCarbs = { net: number | null; issue: NetCarbIssue | null; note: string };

const num = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

export function netCarbs(p: { carbs_g: number | null; fiber_g: number | null }): NetCarbs {
  if (!num(p.carbs_g)) return { net: null, issue: "CARBS_MISSING", note: "Total carbs not recorded" };
  if (!num(p.fiber_g)) return { net: null, issue: "FIBER_MISSING", note: "Fiber not recorded: net carbs unknown (record 0 only if the label says 0 g)" };
  if (p.carbs_g < 0 || p.fiber_g < 0 || p.fiber_g > p.carbs_g)
    return { net: null, issue: "INVALID_NUTRITION", note: `Fiber ${p.fiber_g} g vs total carbs ${p.carbs_g} g is impossible: check the label` };
  return { net: Math.round((p.carbs_g - p.fiber_g) * 10) / 10, issue: null, note: "Total carbs − fiber (sugar alcohols and allulose not subtracted)" };
}

/** "14 g net" or "net unknown (…)". Total carbs stays the headline number wherever this shows. */
export const netCarbsLabel = (p: { carbs_g: number | null; fiber_g: number | null }) => {
  const r = netCarbs(p);
  return r.net === null ? `net unknown (${r.issue === "INVALID_NUTRITION" ? "invalid label values" : r.issue === "FIBER_MISSING" ? "no fiber value" : "no carbs value"})` : `${r.net} g net`;
};
