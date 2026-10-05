"use client";

import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { lookupBarcode } from "@/actions/admin/lookup";
import { Field, FitReasons, fieldClass } from "@/components/admin/ui";
import type { FormState } from "@/actions/admin/products";
import { ruleInputFromForm } from "@/lib/admin/forms";
import { fitsBoxes, shipsUnderPolicy } from "@/lib/admin/rules";
import {
  CATEGORIES,
  FORMS,
  FREE_FROM_KEYS,
  NUTRITION_SOURCES,
  PREGNANCY_CHECK_KEYS,
  PREGNANCY_CHECK_LABEL,
  PRODUCT_TYPES,
  ROLE_KEYS,
  ROLE_LABEL,
  type Settings,
  type Status,
} from "@/lib/admin/types";
import type { ProductRow, VersionRow } from "@/lib/admin/db";

type Props = {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  product?: ProductRow;
  version?: VersionRow;
  vendorName?: string;
  vendors: string[];
  policy: Settings["policy"];
  submitLabel: string;
  /** Edit mode shows "save as a new formula version". */
  editing?: boolean;
};

const NUTRIENTS: [key: string, label: string, unit: string][] = [
  ["calories", "Calories", ""],
  ["protein_g", "Protein", "g"],
  ["fiber_g", "Fiber", "g"],
  ["carbs_g", "Carbs", "g"],
  ["added_sugar_g", "Added sugar", "g"],
  ["sodium_mg", "Sodium", "mg"],
  ["caffeine_mg", "Caffeine", "mg"],
  ["sat_fat_g", "Sat fat", "g"],
  ["sugar_alcohols_g", "Sugar alcohols", "g"],
];

const FF_LABEL: Record<(typeof FREE_FROM_KEYS)[number], string> = {
  vegan: "Vegan",
  gluten_free: "Gluten-free",
  dairy_free: "Dairy-free",
  peanut_free: "Peanut-free",
  tree_nut_free: "Tree-nut-free",
  soy_free: "Soy-free",
};

const d = (cents: number | null | undefined, digits = 2) =>
  cents === null || cents === undefined ? "" : (Number(cents) / 100).toFixed(digits);
const v = (x: unknown) => (x === null || x === undefined ? "" : String(x));

function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border bg-card p-4 sm:p-5">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {hint && <p className="mb-3 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function ProductForm({ action, product: p, version: ver, vendorName, vendors, policy, submitLabel, editing }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const status: Status = p?.status ?? "Candidate";
  const [preview, setPreview] = useState(() => (ver ? fitsFromVersion() : null));

  function fitsFromVersion() {
    if (!ver || !p) return null;
    const input = { ...ver, type: p.type, form: p.form, status, roles: ver.roles ?? {}, pregnancy_checks: ver.pregnancy_checks ?? {} };
    return { fits: fitsBoxes(input, p.reject_reason), ships: shipsUnderPolicy(input, policy) };
  }

  const [looking, setLooking] = useState(false);

  /** Fill empty fields from USDA / Open Food Facts by the UPC typed above. */
  async function fillFromBarcode() {
    const form = ref.current;
    if (!form) return;
    const upc = (form.elements.namedItem("upc") as HTMLInputElement | null)?.value ?? "";
    if (upc.replace(/\D/g, "").length < 6) return void toast.error("Enter the UPC first");
    setLooking(true);
    const res = await lookupBarcode(upc).catch(() => null);
    setLooking(false);
    if (!res || res.kind === "none") return void toast.info("Not found in USDA or Open Food Facts");
    if (res.kind === "existing" && res.id !== p?.id) return void toast.error(`Already in the library: ${res.name}`);
    if (res.kind !== "draft") return;
    const d = res.draft;
    const set = (name: string, value: unknown) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (el && !el.value && value !== null && value !== undefined && value !== "") el.value = String(value);
    };
    set("name", d.name);
    set("brand", d.brand);
    set("unit_wt_oz", d.unit_wt_oz);
    set("ingredients", d.ingredients);
    set("allergens", d.allergens);
    for (const [k, v] of Object.entries(d.nutrition)) set(k, v);
    for (const [k, v] of Object.entries(d.free_from)) set(`ff_${k}`, v ? "yes" : "no");
    set("nutrition_source", d.source.startsWith("USDA") ? "USDA" : "Open Food Facts");
    update();
    toast.success(`Filled from ${d.source}. Verify against the label${d.fromOff.length ? ` (Open Food Facts: ${d.fromOff.join(", ")})` : ""}.`);
  }

  function update() {
    if (!ref.current) return;
    const input = ruleInputFromForm(new FormData(ref.current), status);
    setPreview({ fits: fitsBoxes(input, p?.reject_reason), ships: shipsUnderPolicy(input, policy) });
  }

  return (
    <form ref={ref} action={formAction} onChange={update} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Section title="Basics">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <input name="name" required defaultValue={p?.name} className={fieldClass} placeholder="Blue Diamond Whole Natural Almonds 100-cal pack" />
            </Field>
            <Field label="Brand">
              <input name="brand" defaultValue={v(p?.brand)} className={fieldClass} />
            </Field>
            <Field label="UPC / barcode" hint="Scanning this later finds the product instantly.">
              <div className="flex gap-2">
                <input name="upc" inputMode="numeric" defaultValue={v(p?.upc)} className={fieldClass} />
                <Button type="button" variant="secondary" size="sm" className="h-9" onClick={fillFromBarcode} disabled={looking}>
                  {looking ? "Looking…" : "Fill from barcode"}
                </Button>
              </div>
            </Field>
            <Field label="Type">
              <select name="type" defaultValue={p?.type ?? "Substantial"} className={fieldClass}>
                {PRODUCT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Form" hint="Liquids don't ship under the current policy.">
              <select name="form" defaultValue={p?.form ?? "Solid"} className={fieldClass}>
                {FORMS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-1 text-sm font-medium">Categories</p>
              <div className="flex flex-wrap gap-3">
                {CATEGORIES.map((c) => (
                  <label key={c} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="categories" value={c} defaultChecked={p?.categories.includes(c)} /> {c}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Unit weight (oz)">
              <input name="unit_wt_oz" inputMode="decimal" defaultValue={v(ver?.unit_wt_oz)} className={fieldClass} />
            </Field>
            <Field label="Shelf life">
              <input name="shelf_life" defaultValue={v(ver?.shelf_life)} className={fieldClass} placeholder="9 months" />
            </Field>
            <Field label="Product URL" className="sm:col-span-2">
              <input name="url" defaultValue={v(p?.url)} className={fieldClass} />
            </Field>
          </div>
        </Section>

        <Section title="Cost" hint="Your purchases set the real cost automatically. Use these until you've bought it.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Estimated unit cost $">
              <input name="estimate" inputMode="decimal" defaultValue={d(p?.estimate_cost_cents, 4).replace(/0+$/, "").replace(/\.$/, "")} className={fieldClass} />
            </Field>
            <Field label="Vendor quote $ (overrides)">
              <input name="quote" inputMode="decimal" defaultValue={d(p?.quote_cost_cents, 4).replace(/0+$/, "").replace(/\.$/, "")} className={fieldClass} />
            </Field>
            <Field label="Typical retail $">
              <input name="retail" inputMode="decimal" defaultValue={d(p?.retail_cents)} className={fieldClass} />
            </Field>
            <Field label="Default vendor">
              <input name="vendor" list="vendor-list" defaultValue={vendorName} className={fieldClass} />
            </Field>
            <Field label="Price checked on">
              <input name="price_checked_on" type="date" defaultValue={v(p?.price_checked_on)} className={fieldClass} />
            </Field>
          </div>
          <datalist id="vendor-list">
            {vendors.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Section>

        <Section title="Nutrition (per serving / unit)" hint="Calories, protein, fiber, carbs, added sugar and sodium are required for any box. Caffeine is required for Pregnancy.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {NUTRIENTS.map(([k, label, unit]) => (
              <Field key={k} label={`${label}${unit ? ` (${unit})` : ""}`}>
                <input name={k} inputMode="decimal" defaultValue={v(ver?.[k as keyof VersionRow])} className={fieldClass} />
              </Field>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Source">
              <select name="nutrition_source" defaultValue={ver?.nutrition_source ?? ""} className={fieldClass}>
                <option value="">—</option>
                {[...new Set([...NUTRITION_SOURCES, ...(ver?.nutrition_source ? [ver.nutrition_source] : [])])].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Verified on" hint="The date you last checked the label.">
              <input name="verified_at" type="date" defaultValue={v(ver?.verified_at)} className={fieldClass} />
            </Field>
          </div>
          <Field label="Ingredients" className="mt-3">
            <textarea name="ingredients" rows={3} defaultValue={v(ver?.ingredients)} className={`${fieldClass} h-auto`} />
          </Field>
        </Section>

        <Section title="Allergens">
          <Field label="Allergen statement">
            <input name="allergens" defaultValue={v(ver?.allergens)} className={fieldClass} placeholder="Contains almonds. Made in a facility with peanuts." />
          </Field>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FREE_FROM_KEYS.map((k) => {
              const cur = ver?.free_from?.[k];
              return (
                <Field key={k} label={FF_LABEL[k]}>
                  <select name={`ff_${k}`} defaultValue={cur === true ? "yes" : cur === false ? "no" : ""} className={fieldClass}>
                    <option value="">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No (contains)</option>
                  </select>
                </Field>
              );
            })}
          </div>
        </Section>

        <Section title="Pregnancy checks" hint="All of P1–P9 must be PASS for the Pregnancy box. P7c is informational. P7a: check ingredients against the watchlist.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {PREGNANCY_CHECK_KEYS.map((k) => (
              <Field key={k} label={k === "P7c" ? "P7c (info)" : k} hint={PREGNANCY_CHECK_LABEL[k]}>
                <select name={`pc_${k}`} defaultValue={ver?.pregnancy_checks?.[k] ?? ""} className={fieldClass}>
                  <option value="">—</option>
                  <option>PASS</option>
                  <option>FAIL</option>
                  {ver?.pregnancy_checks?.[k] && !["PASS", "FAIL"].includes(ver.pregnancy_checks[k]) && <option>{ver.pregnancy_checks[k]}</option>}
                </select>
              </Field>
            ))}
          </div>
        </Section>

        <Section title="Judged roles" hint="Reviewer's call. Feed Heart and Carb Conscious eligibility.">
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLE_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`role_${k}`} defaultChecked={ver?.roles?.[k] === true} />
                <span className="font-mono text-xs text-muted-foreground">{k === "WHOLE_FOOD" ? "WF" : k}</span> {ROLE_LABEL[k]}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Notes">
          <div className="grid gap-3">
            <Field label="Sensory (taste / texture)">
              <input name="sensory" defaultValue={v(p?.sensory)} className={fieldClass} placeholder="Salty, crunchy" />
            </Field>
            <Field label="Notes">
              <textarea name="notes" rows={3} defaultValue={v(p?.notes)} className={`${fieldClass} h-auto`} />
            </Field>
          </div>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Box fit (live)</p>
          {preview ? (
            <>
              <FitReasons fits={preview.fits} />
              {!preview.ships.ok && <p className="text-sm text-amber-700">Won&apos;t ship: {preview.ships.reason}</p>}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Fill in nutrition to see which boxes this fits.</p>
          )}
          {editing && (
            <label className="flex items-start gap-2 rounded-md bg-muted p-2 text-sm">
              <input type="checkbox" name="new_version" className="mt-1" />
              <span>
                <b>Reformulated?</b> Save as a new formula version. Past shipments keep the old nutrition.
              </span>
            </label>
          )}
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </aside>
    </form>
  );
}
