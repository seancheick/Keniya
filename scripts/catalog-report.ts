/**
 * Pre-purchase catalog report (owner amendment 2026-10-18): runs every product through all six
 * box policies and sorts it into preliminary eligible / needs a clinical decision / needs label
 * or package evidence / high-fiber review / excluded (by reason code), with distinct candidates
 * and alternates per recipe category. Preliminary eligibility is not purchase readiness: bulk
 * buying waits for clinical and sourcing approval.
 *
 *   pnpm catalog:report                       # live catalog (needs .env.local with the service key)
 *   pnpm catalog:report ./ops/workbook.xlsx   # the workbook, no database
 *   pnpm catalog:report <src> --out docs/pre-purchase-report.md
 *
 * Names and nutrition only: no costs or vendors (the repository is public).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { productAllergens } from "../src/lib/admin/allergens";
import { netCarbs } from "../src/lib/admin/carbs";
import { eligibleFor, giTolerabilityFlags, highFiberReview, isClinicianApproved, isReadyToPack, type ReasonCode } from "../src/lib/admin/rules";
import { BOX_LABEL, BOX_SLUGS, DEFAULT_SETTINGS, inheritParentRules, type BoxRules, type BoxSlug, type Settings, type Snack } from "../src/lib/admin/types";
import { readWorkbook, type WbProduct } from "./workbook";

const EXCLUDE: ReasonCode[] = ["REJECTED", "RETIRED", "DYE", "PHO", "CARBS_OVER", "ADDED_SUGAR_OVER", "SODIUM_OVER", "SAT_FAT_OVER", "CAFFEINE_OVER", "MULTI_SERVE", "PREGNANCY_CHECK_FAILED", "NO_PATHWAY", "SHIPPING_POLICY", "OTHER"];
const EVIDENCE: ReasonCode[] = ["NUTRITION_MISSING", "INGREDIENTS_MISSING", "SAT_FAT_MISSING", "SINGLE_SERVE_UNCONFIRMED", "PREGNANCY_CHECK_BLANK", "CAFFEINE_UNKNOWN", "CAFFEINE_ESTIMATE_HOLD"];
const CLINICAL: ReasonCode[] = ["SAFETY_FINDING", "CLINICIAN_DECISION"];

type Bucket = "eligible" | "clinical" | "evidence" | "high_fiber" | "excluded";
const BUCKET_LABEL: Record<Bucket, string> = {
  eligible: "Preliminary eligible",
  clinical: "Needs a clinical decision",
  evidence: "Needs label or package evidence",
  high_fiber: "High-fiber review (internal, not eligible)",
  excluded: "Excluded",
};

const wbSnack = (p: WbProduct): Snack => ({
  id: p.code, code: p.code, name: p.name, brand: p.brand, type: p.type, form: p.form, status: p.status, rejectReason: p.reject_reason,
  categories: p.categories, ...p.version, allergens: p.version.allergens, freeFrom: p.version.free_from,
  unitCostCents: null, retailCents: null, onHand: 0, earliestExpiry: null, loveRate: null,
});

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function load(src: string | undefined): Promise<{ snacks: Snack[]; rules: Record<BoxSlug, BoxRules>; settings: Settings; source: string }> {
  if (src) {
    const wb = await readWorkbook(src);
    return { snacks: wb.products.map(wbSnack), rules: inheritParentRules(wb.rules), settings: wb.settings ?? DEFAULT_SETTINGS, source: "workbook" };
  }
  loadEnv();
  const { loadAdminContext } = await import("../src/lib/admin/summary");
  const ctx = await loadAdminContext();
  return { snacks: ctx.catalog.snacks, rules: ctx.rules, settings: ctx.settings, source: "live catalog" };
}

function classify(slug: BoxSlug, s: Snack, rules: BoxRules, settings: Settings): { bucket: Bucket; codes: ReasonCode[]; reasons: string[] } {
  const e = eligibleFor(slug, s, rules, settings.policy, s.rejectReason);
  const codes = [...new Set(e.codes ?? [])];
  const extra: string[] = [];
  const n = netCarbs(s);
  if (n.issue === "INVALID_NUTRITION") extra.push(n.note);
  // Missing ingredient text already fails eligibility (rules.ts base()); allergens need it too.
  if (s.ingredients?.trim()) extra.push(...productAllergens(s).issues);
  if (e.fits && !extra.length) return { bucket: "eligible", codes, reasons: [] };
  if (highFiberReview(slug, s, rules, settings.policy, s.rejectReason)) return { bucket: "high_fiber", codes, reasons: [...e.reasons, ...extra] };
  if (codes.some((c) => EXCLUDE.includes(c))) return { bucket: "excluded", codes, reasons: e.reasons };
  if (codes.some((c) => EVIDENCE.includes(c)) || extra.length) return { bucket: "evidence", codes, reasons: [...e.reasons, ...extra] };
  if (codes.some((c) => CLINICAL.includes(c))) return { bucket: "clinical", codes, reasons: e.reasons };
  return { bucket: "excluded", codes, reasons: e.reasons };
}

// isReadyToPack covers clinical approval and the package check; lots are checked at packing.
const stage = (s: Snack) => (isReadyToPack(s) ? "Package verified" : isClinicianApproved(s) ? "Clinical and sourcing approved" : "Preliminary");

async function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--out");
  const out = outIdx >= 0 ? args[outIdx + 1] : null;
  const src = args.find((a, i) => !a.startsWith("--") && i !== outIdx + 1);
  const { snacks, rules, settings, source } = await load(src);
  const live = snacks.filter((s) => s.status !== "Retired");
  const md: string[] = [];
  md.push(`# Pre-purchase catalog report`, "", `Source: ${source}, ${live.length} products, generated ${new Date().toISOString().slice(0, 10)}.`, "");
  md.push(
    "Preliminary eligibility means the software rules pass. It is **not** purchase readiness: bulk buying waits for clinical and sourcing approval (stage 2), and packing for the package check (stage 3) and a lot with at least 90 days left.",
    "",
  );
  const noIngredients = live.filter((s) => !s.ingredients?.trim()).length;
  if (noIngredients)
    md.push(`**${noIngredients} of ${live.length} products have no ingredient text in this source**, so ingredient screening (dyes, watchlist, no-gos, caffeine sources, allergens) hasn't run on them. They're never counted as preliminarily eligible; a product already excluded by another rule stays under "excluded".`, "");
  const stages = ["Preliminary", "Clinical and sourcing approved", "Package verified"];
  md.push("| Stage | Products | Bulk buying? |", "|---|---:|---|");
  for (const st of stages) md.push(`| ${st} | ${live.filter((s) => stage(s) === st).length} | ${st === "Preliminary" ? "No (samples only)" : "Yes, after sourcing checks"} |`);
  md.push("");

  const summary: string[] = [];
  for (const slug of BOX_SLUGS) {
    const r = rules[slug];
    const rows = live.map((s) => ({ s, ...classify(slug, s, r, settings) }));
    const by = (b: Bucket) => rows.filter((x) => x.bucket === b);
    md.push(`## ${BOX_LABEL[slug]}`, "");
    md.push("| Bucket | Products |", "|---|---:|");
    for (const b of Object.keys(BUCKET_LABEL) as Bucket[]) md.push(`| ${BUCKET_LABEL[b]} | ${by(b).length} |`);
    md.push("");
    if (r.categories.length) {
      md.push("| Recipe category | Needed (min–max) | Distinct eligible | Alternates above min |", "|---|---|---:|---:|");
      for (const c of r.categories) {
        const n = by("eligible").filter((x) => x.s.categories.includes(c.name)).length;
        md.push(`| ${c.name} | ${c.min}–${c.max} | ${n} | ${Math.max(0, n - c.min)}${n < c.min ? " ⚠ short" : ""} |`);
      }
      md.push("");
    }
    const codeCount = new Map<ReasonCode, number>();
    for (const x of by("excluded")) for (const c of x.codes.filter((c) => EXCLUDE.includes(c))) codeCount.set(c, (codeCount.get(c) ?? 0) + 1);
    if (codeCount.size) md.push(`Excluded by reason code: ${[...codeCount].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(" · ")}`, "");
    for (const b of ["clinical", "evidence", "high_fiber"] as Bucket[]) {
      if (!by(b).length) continue;
      md.push(`**${BUCKET_LABEL[b]}**`, "");
      for (const x of by(b)) md.push(`- ${x.s.code} ${x.s.name}: ${x.reasons.join("; ")}${b === "high_fiber" ? ` (${netCarbs(x.s).net} g net, ${x.s.carbs_g} g total)` : ""}`);
      md.push("");
    }
    if (slug === "glp1") {
      const gi = by("eligible").filter((x) => giTolerabilityFlags(x.s).length);
      if (gi.length) md.push(`GI-tolerability review (eligible, flagged): ${gi.map((x) => `${x.s.name} (${giTolerabilityFlags(x.s).join(", ")})`).join("; ")}`, "");
    }
    summary.push(`${BOX_LABEL[slug].padEnd(22)} eligible ${by("eligible").length}, clinical ${by("clinical").length}, evidence ${by("evidence").length}, high-fiber ${by("high_fiber").length}, excluded ${by("excluded").length}`);
  }
  const both = live.filter((s) => eligibleFor("postpartum", s, rules.postpartum, settings.policy, s.rejectReason).fits && eligibleFor("blood_sugar", s, rules.blood_sugar, settings.policy, s.rejectReason).fits);
  const bothScreened = both.filter((s) => s.ingredients?.trim());
  md.push(
    "## Combined: Postpartum + Blood Sugar",
    "",
    `${bothScreened.length} products pass both screens (for a mother managing diabetes postpartum; nutritional compatibility only).` +
      (both.length > bothScreened.length ? ` ${both.length - bothScreened.length} more pass on nutrition alone but have no ingredient text yet.` : ""),
    "",
  );
  summary.push(`Postpartum + Blood Sugar  ${bothScreened.length} screened (${both.length} on nutrition alone)`);
  console.log(summary.join("\n"));
  if (out) {
    writeFileSync(out, md.join("\n"));
    console.log(`\nWrote ${out}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
