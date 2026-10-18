"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { addExpense, saveSettings, savePackage, type SettingsState } from "@/actions/admin/settings";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/admin/ui";
import type { PackageProfile } from "@/lib/admin/db";
import { BOX_LABEL, BOX_SLUGS, FORMS, type Settings } from "@/lib/admin/types";

const $ = (c: number | null | undefined) => (c === null || c === undefined ? "" : (c / 100).toFixed(2));

function useSaved(state: SettingsState, msg: string) {
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.error) toast.error(state.error);
    if (state.ok) toast.success(msg);
  }, [state, msg]);
}

function Rows({ prefix, initial, weight }: { prefix: string; initial: { name: string; cents: number; weightOz?: number }[]; weight?: boolean }) {
  const [rows, setRows] = useState(initial);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <input name={`${prefix}_name`} defaultValue={r.name} className={fieldClass} aria-label="Name" />
          <input name={`${prefix}_cents`} defaultValue={$(r.cents)} inputMode="decimal" className={`${fieldClass} w-24`} aria-label="Cost $" placeholder="$" />
          {weight && <input name={`${prefix}_oz`} defaultValue={r.weightOz ?? 0} inputMode="decimal" className={`${fieldClass} w-20`} aria-label="Weight oz" placeholder="oz" />}
          <Button type="button" variant="ghost" size="sm" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
            ✕
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setRows((x) => [...x, { name: "", cents: 0, weightOz: 0 }])}>
        + Line
      </Button>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border bg-card p-4 sm:p-5">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {hint && <p className="mb-3 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function SettingsForm({ settings: s }: { settings: Settings }) {
  const [state, action, pending] = useActionState(saveSettings, {});
  const [table, setTable] = useState(s.shipping.table);
  useSaved(state, "Settings saved");
  return (
    <form action={action} className="space-y-4">
      <Section title="Prices & run size">
        <div className="grid gap-3 sm:grid-cols-3">
          {BOX_SLUGS.map((b) => (
            <div key={b} className="grid grid-cols-2 gap-2">
              <Field label={`${BOX_LABEL[b]} price $`}>
                <input name={`price_${b}`} defaultValue={$(s.prices[b])} inputMode="decimal" className={fieldClass} />
              </Field>
              <Field label="Run size">
                <input name={`run_${b}`} defaultValue={s.runSize[b]} inputMode="numeric" className={fieldClass} />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Shipping estimate" hint="Used until real Pirate Ship labels exist; after 5 labels in a weight band the admin uses their median instead.">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Method">
            <select name="ship_method" defaultValue={s.shipping.method} className={fieldClass}>
              <option value="table">Weight table</option>
              <option value="flat">Flat rate</option>
              <option value="custom">Custom per box</option>
            </select>
          </Field>
          <Field label="Flat rate $">
            <input name="ship_flat" defaultValue={$(s.shipping.flatCents)} inputMode="decimal" className={fieldClass} />
          </Field>
          <Field label="Variance buffer $">
            <input name="ship_variance" defaultValue={$(s.shipping.varianceCents)} inputMode="decimal" className={fieldClass} />
          </Field>
          <div />
          {BOX_SLUGS.map((b) => (
            <Field key={b} label={`Custom: ${BOX_LABEL[b]} $`}>
              <input name={`ship_custom_${b}`} defaultValue={$(s.shipping.customCents[b])} inputMode="decimal" className={fieldClass} />
            </Field>
          ))}
          <Field label="Default carrier">
            <input name="ship_carrier" defaultValue={s.shipping.defaultCarrier} className={fieldClass} />
          </Field>
          <Field label="Default service">
            <input name="ship_service" defaultValue={s.shipping.defaultService} className={fieldClass} />
          </Field>
        </div>
        <p className="mt-4 mb-2 text-sm font-medium">Weight table (from oz → rate)</p>
        <div className="space-y-2">
          {table.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input name="table_from" defaultValue={r.fromOz} inputMode="decimal" className={`${fieldClass} w-28`} aria-label="From oz" />
              <input name="table_cents" defaultValue={$(r.cents)} inputMode="decimal" className={`${fieldClass} w-28`} aria-label="Rate $" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setTable((t) => t.filter((_, j) => j !== i))}>
                ✕
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setTable((t) => [...t, { fromOz: (t.at(-1)?.fromOz ?? 0) + 16, cents: 0 }])}>
            + Bracket
          </Button>
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Packaging per box" hint="Besides the mailer, which is set on the package profile below. Name · $ · oz.">
          <Rows prefix="pack" initial={s.packaging} weight />
        </Section>
        <Section title="Overheads per box" hint="Labor, inbound freight, storage, refund reserve, CAC, promo…">
          <Rows prefix="over" initial={s.overheads} />
        </Section>
      </div>

      <Section title="Fees & buffers">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Payment fee %">
            <input name="fee_pct" defaultValue={(s.fees.pct * 100).toFixed(2)} inputMode="decimal" className={fieldClass} />
          </Field>
          <Field label="Payment fee fixed $">
            <input name="fee_fixed" defaultValue={$(s.fees.fixedCents)} inputMode="decimal" className={fieldClass} />
          </Field>
          <Field label="Spoilage / waste % (of snacks)">
            <input name="waste_pct" defaultValue={(s.wastePct * 100).toFixed(1)} inputMode="decimal" className={fieldClass} />
          </Field>
          <Field label="Purchase buffer %">
            <input name="buffer_pct" defaultValue={(s.purchaseBufferPct * 100).toFixed(0)} inputMode="decimal" className={fieldClass} />
          </Field>
          <Field label="Sample units before it passes a box" hint="Buying more of a product that passes no box yet needs a reason.">
            <input name="sample_purchase_max" defaultValue={s.samplePurchaseMax} inputMode="numeric" className={fieldClass} />
          </Field>
        </div>
      </Section>

      <Section title="Shipping policy (what we ship)">
        <div className="mb-3 flex flex-wrap gap-4">
          {FORMS.map((f) => (
            <label key={f} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="forms" value={f} defaultChecked={s.policy.allowedForms.includes(f)} /> {f}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Field label="Max item oz">
            <input name="max_item_oz" defaultValue={s.policy.maxItemOz} inputMode="decimal" className={fieldClass} />
          </Field>
          <Field label="Max packed box oz">
            <input name="max_box_oz" defaultValue={s.policy.maxBoxOz} inputMode="decimal" className={fieldClass} />
          </Field>
          {(["Red <", "Orange <", "Yellow <"] as const).map((l, i) => (
            <Field key={l} label={`Expiry ${l} days`}>
              <input name="tier" defaultValue={s.expiryTiersDays[i]} inputMode="numeric" className={fieldClass} />
            </Field>
          ))}
        </div>
      </Section>
      <Section title="Box value targets (flag thin lineups; never blocks)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Min shelf value of picks $">
            <input name="value_min_retail" defaultValue={s.value.minRetailCents === null ? "" : (s.value.minRetailCents / 100).toFixed(2)} inputMode="decimal" className={fieldClass} />
          </Field>
          <Field label="Max snack cost of picks $">
            <input name="value_max_cost" defaultValue={s.value.maxSnackCostCents === null ? "" : (s.value.maxSnackCostCents / 100).toFixed(2)} inputMode="decimal" className={fieldClass} />
          </Field>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Leave blank to turn a target off. Each lineup also flags repeated brands and repeated snack types.</p>
      </Section>
      <Section title="Offers (the site shows only what's on)" hint="Saving settings ends any open checkouts, so change offers when the shop is quiet.">
        <div className="space-y-5">
          <div>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="welcome_on" defaultChecked={s.offers.welcome.enabled} className="size-5" /> First-box offer (pop-up + checkout)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Code">
                <input name="welcome_code" defaultValue={s.offers.welcome.code} className={`${fieldClass} uppercase`} />
              </Field>
              <Field label="% off">
                <input name="welcome_pct" defaultValue={s.offers.welcome.percentOff} inputMode="numeric" className={fieldClass} />
              </Field>
              <Field label="Max uses (blank = no cap)">
                <input name="welcome_limit" defaultValue={s.offers.welcome.limit ?? ""} inputMode="numeric" className={fieldClass} />
              </Field>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              One-time boxes and gifts only, one per email with no earlier order. Changing % or max uses starts a new Stripe coupon.
            </p>
          </div>
          <div>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="bonus_on" defaultChecked={s.offers.foundingBonus.enabled} className="size-5" /> Founding bonus
            </label>
            <div className="grid grid-cols-3 gap-3">
              <Field label="First N orders">
                <input name="bonus_limit" defaultValue={s.offers.foundingBonus.limit} inputMode="numeric" className={fieldClass} />
              </Field>
              <div className="col-span-2">
                <Field label="What it is (shown on the site)">
                  <input name="bonus_description" defaultValue={s.offers.foundingBonus.description} maxLength={120} className={fieldClass} />
                </Field>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Set N to the bonus stock you actually have. Orders show &ldquo;Founding bonus&rdquo; on the packing view.</p>
          </div>
          <div>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="sub_on" defaultChecked={s.offers.subscription.enabled} className="size-5" /> Monthly Snack Club
            </label>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Monthly price $">
                <input name="sub_price" defaultValue={$(s.offers.subscription.priceCents)} inputMode="decimal" className={fieldClass} />
              </Field>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Check each box&rsquo;s cost card first (target: 25%+ contribution at this price). Renewals for a box without an approved,
              in-stock lineup are held, not charged.
            </p>
          </div>
        </div>
      </Section>
      <Button disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
    </form>
  );
}

export function PackageForm({ pkg }: { pkg?: PackageProfile }) {
  const [state, action, pending] = useActionState(savePackage, {});
  useSaved(state, "Package saved");
  return (
    <form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-8 sm:items-end">
      <input type="hidden" name="id" value={pkg?.id ?? ""} />
      <Field label="Name" className="col-span-2">
        <input name="name" required defaultValue={pkg?.name} className={fieldClass} placeholder="12×9×4 mailer" />
      </Field>
      <Field label="L in">
        <input name="length_in" required defaultValue={pkg?.length_in} inputMode="decimal" className={fieldClass} />
      </Field>
      <Field label="W in">
        <input name="width_in" required defaultValue={pkg?.width_in} inputMode="decimal" className={fieldClass} />
      </Field>
      <Field label="H in">
        <input name="height_in" required defaultValue={pkg?.height_in} inputMode="decimal" className={fieldClass} />
      </Field>
      <Field label="Empty oz">
        <input name="empty_weight_oz" required defaultValue={pkg?.empty_weight_oz ?? 0} inputMode="decimal" className={fieldClass} />
      </Field>
      <Field label="Cost $">
        <input name="cost" defaultValue={$(pkg?.cost_cents ?? 0)} inputMode="decimal" className={fieldClass} />
      </Field>
      <div className="flex items-center gap-2 pb-2">
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" name="is_default" defaultChecked={pkg?.is_default} /> Default
        </label>
        <Button size="sm" disabled={pending}>
          {pkg ? "Save" : "Add"}
        </Button>
      </div>
    </form>
  );
}

export function ExpenseForm() {
  const [state, action, pending] = useActionState(addExpense, {});
  const form = useRef<HTMLFormElement>(null);
  useSaved(state, "Expense added");
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <input name="spent_on" type="date" required defaultValue={new Date().toLocaleDateString("en-CA")} className={fieldClass} aria-label="Date" />
      <input name="category" required list="expense-cats" placeholder="Category" className={fieldClass} aria-label="Category" />
      <input name="amount" required inputMode="decimal" placeholder="$" className={fieldClass} aria-label="Amount" />
      <input name="note" placeholder="Note" className={fieldClass} aria-label="Note" />
      <Button size="sm" variant="secondary" disabled={pending}>
        Add expense
      </Button>
      <datalist id="expense-cats">
        {["Marketing", "Software", "Samples", "Supplies", "Photography", "Legal", "Other"].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </form>
  );
}
