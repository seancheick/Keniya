"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveBoxRules, type BoxState } from "@/actions/admin/boxes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Field, fieldClass } from "@/components/admin/ui";
import { BOX_LABEL, CATEGORIES, type BoxRules, type BoxSlug } from "@/lib/admin/types";

// Plain-language labels; definitions match the checks in src/lib/admin/rules.ts.
const SIZE: [key: keyof BoxRules, label: string, hint: string][] = [
  ["substantialMin", "Full-size snacks: at least", "Regular snacks, not minis or drinks"],
  ["miniMax", "Mini snacks: at most", "Small or sample-size items"],
  ["beverageMax", "Drinks: at most", "Drink mixes and tea"],
];
const HEALTH: [key: keyof BoxRules, label: string, hint: string][] = [
  ["proteinOrFiberMin", "Protein or fiber snacks: at least", "5 g+ protein with ≤25 g carbs, or 3 g+ fiber with ≤5 g added sugar plus 3 g+ protein or nut/seed fat"],
  ["wholeFoodMin", "Whole-food snacks: at least", "Nuts, seeds, cheese, jerky and similar"],
  ["nutSeedMin", "Nut, seed or healthy-fat snacks: at least", "Marked nut/seed or unsaturated fat"],
  ["fiberMin", "Fiber snacks (3 g+): at least", "3 g or more fiber"],
  ["treatMax", "Treats: at most", "Heart: products marked as a controlled treat. Blood Sugar: picks that qualify only as a portioned treat"],
];
// Checked on every pick before any pathway counts; a pick over a limit isn't eligible.
const GATES: [key: keyof BoxRules, label: string, hint: string][] = [
  ["carbsMax", "Total carbs: at most (g)", "Per pack"],
  ["beverageAddedSugarMax", "Beverage added sugar: at most (g)", "Hard limit before any nutrition pathway"],
  ["addedSugarMax", "Added sugar: at most (g)", "Per pack"],
  ["treatAddedSugarMax", "Added sugar on a controlled treat: at most (g)", "Replaces the limit above for picks marked as a treat"],
  ["sodiumMax", "Sodium: at most (mg)", "Per pack"],
  ["satFatMax", "Saturated fat: at most (g)", "Per pack; blank sat fat counts as not eligible when set"],
  ["satFatNutMax", "Saturated fat from nuts/seeds: at most (g)", "Nut/seed picks only, and not when the label lists added palm, palm-kernel, coconut or partially hydrogenated oil"],
  ["caffeineMax", "Caffeine: at most (mg)", "Per pack; a Keniya threshold, not a medical cutoff"],
];

export function RulesForm({ slug, rules }: { slug: BoxSlug; rules: BoxRules }) {
  const [state, action, pending] = useActionState<BoxState, FormData>(saveBoxRules, {});
  const [rows, setRows] = useState(rules.categories);
  const seen = useRef(state);
  const lo = rules.categories.reduce((t, c) => t + c.min, 0);
  const hi = rules.categories.reduce((t, c) => t + c.max, 0);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.error) toast.error(state.error);
    if (state.ok) toast.success("Rules saved");
  }, [state]);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      <p className="text-sm text-muted-foreground">
        {`The recipe every ${BOX_LABEL[slug]} box follows. "Build box" above picks snacks to match it, and the checks turn red when a lineup breaks it. Changing it here changes it for good; to try a different mix once, use "Choose my own mix" at the top.`}
      </p>
      <Field label="Snacks per box" className="max-w-40">
        <input name="total" defaultValue={rules.total} inputMode="numeric" className={fieldClass} />
      </Field>
      <div>
        <p className="text-sm font-medium">How many of each kind</p>
        <p className="mb-2 text-xs text-muted-foreground">
          {`Each kind is a range: Comfort 3 to 5 means every box gets 3, 4 or 5 comfort snacks. The ranges don't have to add up to ${rules.total}; Build box picks numbers inside them that total exactly ${rules.total}. Right now they allow ${lo} to ${hi} snacks.`}
        </p>
        {rules.categories.length > 0 && (lo > rules.total || hi < rules.total) && (
          <p className="mb-2 text-xs font-medium text-red-700">{`These ranges can't make a box of ${rules.total}. Lower some "at least" numbers or raise some "at most" numbers.`}</p>
        )}
        <div className="mb-1 flex gap-2 text-xs text-muted-foreground">
          <span className="flex-1">Kind of snack</span>
          <span className="w-20 shrink-0">At least</span>
          <span className="w-20 shrink-0">At most</span>
          <span className="w-9 shrink-0" />
        </div>
        <div className="space-y-2">
          {rows.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input name="cat_name" defaultValue={c.name} list="cat-names" className={fieldClass} aria-label="Kind of snack" />
              <input name="cat_min" defaultValue={c.min} inputMode="numeric" className={cn(fieldClass, "w-20 shrink-0")} aria-label="At least" />
              <input name="cat_max" defaultValue={c.max} inputMode="numeric" className={cn(fieldClass, "w-20 shrink-0")} aria-label="At most" />
              <Button type="button" size="sm" variant="ghost" aria-label="Remove" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
                ✕
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => setRows((r) => [...r, { name: "", min: 0, max: 1 }])}>
          + Add a kind
        </Button>
        <datalist id="cat-names">
          {CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <Limits title="Hard limits (every pick)" note="A snack over any of these can't go in this box, whatever else it qualifies for. Leave empty for no limit. The website prints these numbers, so a change here changes the site too; a limit the site's copy mentions can't be left empty." items={GATES} rules={rules} />
      <Limits title="Snack sizes" items={SIZE} rules={rules} />
      <Limits title="Health rules" note="Leave a box empty if this box doesn't need that rule." items={HEALTH} rules={rules} />
      <Button disabled={pending}>{pending ? "Saving…" : "Save recipe"}</Button>
    </form>
  );
}

function Limits({ title, note, items, rules }: { title: string; note?: string; items: [keyof BoxRules, string, string][]; rules: BoxRules }) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {items.map(([k, label, hint]) => (
          <Field key={k} label={label} hint={hint}>
            <input name={k} defaultValue={(rules[k] as number | null) ?? ""} inputMode="decimal" placeholder="no rule" className={fieldClass} />
          </Field>
        ))}
      </div>
    </div>
  );
}
