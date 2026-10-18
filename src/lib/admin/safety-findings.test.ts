import { describe, expect, it } from "vitest";
import { snack } from "./__fixtures__/snacks";
import { eligibleFor } from "./rules";
import { ingredientsHash } from "./ingredients";
import { DEFAULT_BOX_RULES, DEFAULT_SETTINGS, type BoxSlug } from "./types";

const PASS = Object.fromEntries(["P1", "P2", "P3", "P4", "P5", "P6", "P7a", "P7b", "P8"].map((k) => [k, "PASS"]));
const fits = (slug: BoxSlug, p: ReturnType<typeof snack>) => eligibleFor(slug, p, DEFAULT_BOX_RULES[slug], DEFAULT_SETTINGS.policy);

describe("current ingredient findings beat stored decisions", () => {
  const approved = snack({ pregnancy_checks: PASS, caffeine_mg: 0, ingredients: "almonds, sea salt" });
  it("baseline: the approved product fits the pregnancy family", () => {
    expect(fits("pregnancy_comfort", approved).fits).toBe(true);
  });
  it("a previously approved product that gains licorice root is blocked in every pregnancy-family box", () => {
    const changed = { ...approved, ingredients: "almonds, licorice root extract, sea salt" };
    for (const slug of ["pregnancy_comfort", "gestational_diabetes", "postpartum"] as const) {
      const r = fits(slug, changed);
      expect(r.fits).toBe(false);
      expect(r.reasons.join(" ")).toMatch(/licorice root.*stored P7a PASS is out of date/);
    }
  });
  it("database watchlist rows count when loaded", () => {
    const r = fits("pregnancy_comfort", {
      ...approved,
      ingredients: "almonds, bitter orange peel",
      findings: [{ code: "watchlist", severity: "pregnancy_fail", check: "P7a", label: "x", evidence: "bitter orange", kind: "safety", key: "watchlist:bitter orange" }],
    });
    expect(r.fits).toBe(false);
  });
  it("a clinician resolution on these exact ingredients clears it; an ingredient edit voids it", () => {
    const ing = "almonds, licorice root extract, sea salt";
    const resolutions = [{ finding_key: "watchlist:licorice root", ingredients_hash: ingredientsHash(ing), decision: "accept" as const }];
    expect(fits("pregnancy_comfort", { ...approved, ingredients: ing, resolutions }).fits).toBe(true);
    expect(fits("pregnancy_comfort", { ...approved, ingredients: `${ing}, honey`, resolutions }).fits).toBe(false);
  });
  it("an unresolved review finding holds the pregnancy family but not Heart", () => {
    const p = { ...approved, ingredients: "almonds, ashwagandha root extract" };
    expect(fits("pregnancy_comfort", p).reasons.join(" ")).toMatch(/Needs clinician decision/);
    expect(fits("heart", p).reasons.join(" ")).not.toMatch(/Needs clinician decision/);
  });
  it("a caffeine source with a label value is not held for review", () => {
    expect(fits("pregnancy_comfort", { ...approved, caffeine_mg: 20, ingredients: "almonds, green tea extract" }).fits).toBe(true);
    expect(fits("pregnancy_comfort", { ...approved, caffeine_mg: null, ingredients: "almonds, green tea extract" }).fits).toBe(false);
  });
});
