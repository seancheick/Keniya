"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveBoxRules, type BoxState } from "@/actions/admin/boxes";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/admin/ui";
import { CATEGORIES, type BoxRules, type BoxSlug } from "@/lib/admin/types";

const LIMITS: [key: keyof BoxRules, label: string][] = [
  ["substantialMin", "Substantial ≥"],
  ["miniMax", "Mini ≤"],
  ["beverageMax", "Beverage ≤"],
  ["proteinOrFiberMin", "Protein/fiber-forward ≥"],
  ["wholeFoodMin", "Whole-food ≥"],
  ["nutSeedMin", "Nut/seed/UF ≥"],
  ["fiberMin", "Fiber ≥3 g picks ≥"],
  ["highSodiumMax", "Sodium >300 mg ≤"],
  ["treatMax", "Controlled treats ≤"],
];

export function RulesForm({ slug, rules }: { slug: BoxSlug; rules: BoxRules }) {
  const [state, action, pending] = useActionState<BoxState, FormData>(saveBoxRules, {});
  const [rows, setRows] = useState(rules.categories);
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.error) toast.error(state.error);
    if (state.ok) toast.success("Rules saved");
  }, [state]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <Field label="Selections per box" className="max-w-40">
        <input name="total" defaultValue={rules.total} inputMode="numeric" className={fieldClass} />
      </Field>
      <div>
        <p className="mb-1 text-sm font-medium">Category ranges</p>
        <div className="space-y-2">
          {rows.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input name="cat_name" defaultValue={c.name} list="cat-names" className={fieldClass} aria-label="Category" />
              <input name="cat_min" defaultValue={c.min} inputMode="numeric" className={`${fieldClass} w-20`} aria-label="Min" />
              <input name="cat_max" defaultValue={c.max} inputMode="numeric" className={`${fieldClass} w-20`} aria-label="Max" />
              <Button type="button" size="sm" variant="ghost" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
                ✕
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => setRows((r) => [...r, { name: "", min: 0, max: 1 }])}>
          + Category
        </Button>
        <datalist id="cat-names">
          {CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LIMITS.map(([k, label]) => (
          <Field key={k} label={label} hint="blank = no rule">
            <input name={k} defaultValue={(rules[k] as number | null) ?? ""} inputMode="numeric" className={fieldClass} />
          </Field>
        ))}
      </div>
      <Button disabled={pending}>{pending ? "Saving…" : "Save rules"}</Button>
    </form>
  );
}
