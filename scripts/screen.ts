/**
 * Screen one snack label against the live Keniya rules (Screening Standard v1.0). Writes nothing.
 *
 *   pnpm screen label.json        # a transcribed label (format below)
 *   pnpm screen - < label.json    # same, from stdin
 *
 * Every box answers PASS (✅), FAIL (❌, a confirmed rule is broken) or HOLD (🟡, information is
 * missing or uncertain; get it from the package or the maker). Values are per pack, as printed.
 * The rules, watchlist and limits are the live ones the admin uses, so the answer matches it.
 *
 * Label format (JSON):
 *   name, brand, upc               identity as printed
 *   type                           "Substantial" | "Mini" | "Beverage" (default Substantial)
 *   form                           "Solid" | "Powder" | "Tea" | "Spread" | "Puree" | "Liquid" (default Solid)
 *   unit_wt_oz                     net weight of ONE pack, in ounces
 *   servings_per_pack              servings per container printed on the pack (1 = single-serve)
 *   calories, protein_g, fiber_g, carbs_g, added_sugar_g, sodium_mg, sat_fat_g
 *                                  per pack; null when not printed (never estimate)
 *   caffeine_mg                    only when printed; null otherwise (cocoa is estimated by the engine)
 *   sugar_alcohols_g               when printed
 *   ingredients                    the full ingredient list, verbatim
 *   allergens                      the Contains / may-contain lines, verbatim (null if none printed)
 *   roles                          judged: { UF, NS, WG, MF, CT, WHOLE_FOOD } (see ROLE_LABEL)
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { productAllergens, ALLERGEN_LABEL } from "../src/lib/admin/allergens";
import { gtin14 } from "../src/lib/admin/barcode";
import { caffeineDisplay } from "../src/lib/admin/caffeine";
import { db, loadBoxRules, loadSettings } from "../src/lib/admin/db";
import { screenIngredients, type WatchlistRow } from "../src/lib/admin/ingredients";
import { labelRoundingIssues } from "../src/lib/admin/label-rounding";
import { eligibleFor, giTolerabilityFlags, openFindings } from "../src/lib/admin/rules";
import { BOX_LABEL, BOX_SLUGS, FORMS, PRODUCT_TYPES, ROLE_KEYS, type RuleInput } from "../src/lib/admin/types";

const n = z.number().min(0).nullable().default(null);
const Label = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().default(null),
  upc: z.string().nullable().default(null),
  type: z.enum(PRODUCT_TYPES).default("Substantial"),
  form: z.enum(FORMS).default("Solid"),
  unit_wt_oz: n,
  servings_per_pack: n,
  calories: n, protein_g: n, fiber_g: n, carbs_g: n, added_sugar_g: n, sodium_mg: n, sat_fat_g: n,
  caffeine_mg: n, sugar_alcohols_g: n,
  ingredients: z.string().nullable().default(null),
  allergens: z.string().nullable().default(null),
  roles: z.object(Object.fromEntries(ROLE_KEYS.map((k) => [k, z.boolean().optional()]))).default({}),
});

const ICON = { PASS: "✅", FAIL: "❌", HOLD: "🟡" } as const;

async function main() {
  const src = process.argv[2];
  if (!src) throw new Error("Usage: pnpm screen <label.json | ->");
  const label = Label.parse(JSON.parse(readFileSync(src === "-" ? 0 : src, "utf8")));
  const [rules, settings, watchlist] = await Promise.all([
    loadBoxRules(),
    loadSettings(),
    db().from("watchlist").select("ingredient, category").then((r) => {
      if (r.error) throw new Error(r.error.message);
      return r.data as WatchlistRow[];
    }),
  ]);
  // P8 (one pack = one serving) is read from the label; P1–P7 come from the engine.
  const p8 = label.servings_per_pack === null ? undefined : label.servings_per_pack <= 1 ? "PASS" : "FAIL";
  const input: RuleInput = {
    ...label,
    status: "Candidate",
    pregnancy_checks: p8 ? { P8: p8 } : {},
    findings: screenIngredients(label.ingredients, watchlist),
  };

  const out: string[] = [`## ${label.brand ? `${label.brand} ` : ""}${label.name}`];
  const code = label.upc ? gtin14(label.upc) : null;
  if (label.upc && !code) out.push(`UPC ${label.upc} isn't a valid barcode: re-read it from the package.`);
  if (code) {
    const hit = await db().from("products").select("code, name, status").eq("gtin14", code).maybeSingle();
    if (hit.error) throw new Error(hit.error.message);
    out.push(hit.data ? `Already in Keniya as ${hit.data.code} ${hit.data.name} (${hit.data.status}).` : `UPC ${label.upc}: not in Keniya yet.`);
  }

  out.push("", "| Box | Result | Why |", "|---|---|---|");
  for (const slug of BOX_SLUGS) {
    const e = eligibleFor(slug, input, rules[slug], settings.policy);
    const why = e.result === "PASS" ? e.via.join(", ") || "Meets every rule" : e.reasons.join("; ");
    out.push(`| ${BOX_LABEL[slug]} | ${ICON[e.result!]} ${e.result} | ${why.replace(/\|/g, "/")} |`);
  }

  const notes: string[] = [];
  const derived = labelRoundingIssues(input);
  if (derived.length) notes.push(`Values that can't be printed label values (${derived.join(", ")}): re-read the Nutrition Facts.`);
  const a = productAllergens(label);
  const names = (xs: typeof a.contains) => xs.map((x) => ALLERGEN_LABEL[x]).join(", ");
  notes.push(`Allergens: contains ${names(a.contains) || "none of the major nine"}${a.mayContain.length ? `; may contain ${names(a.mayContain)}` : ""}${a.verifiable ? "" : ` (can't verify: ${a.issues.join("; ")})`}.`);
  const caf = caffeineDisplay(input);
  if (caf) notes.push(`Caffeine: ${caf}.`);
  const gi = giTolerabilityFlags(input);
  if (gi.length) notes.push(`GLP-1 tolerability (information, not a fail): ${gi.join(", ")}.`);
  const info = openFindings(input).filter((f) => f.severity === "info");
  if (info.length) notes.push(`Ingredient notes: ${info.map((f) => `${f.label} (${f.evidence})`).join("; ")}.`);
  out.push("", ...notes.map((x) => `- ${x}`));
  console.log(out.join("\n"));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
