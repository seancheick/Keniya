"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ScanLine, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logPurchase, type PurchaseState } from "@/actions/admin/inventory";
import { lookupBarcode } from "@/actions/admin/lookup";
import { createProduct, uploadProductPhoto } from "@/actions/admin/products";
import type { LookupDraft } from "@/lib/admin/lookup";
import { BarcodeScanner, sameBarcode } from "@/components/admin/barcode-scanner";
import { compressImage } from "@/components/admin/compress-image";
import { Badge, Field, FitReasons, fieldClass } from "@/components/admin/ui";
import { fmt$ } from "@/lib/admin/costing";
import { eligibleBoxes, type BoxFit } from "@/lib/admin/rules";
import { ruleInputFromForm } from "@/lib/admin/forms";
import { CATEGORIES, FORMS, PRODUCT_TYPES, type BoxRules, type BoxSlug, type Settings } from "@/lib/admin/types";

export type PurchaseProduct = {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  upc: string | null;
  status: string;
  onHand: number;
  /** Average cost of stock on hand (lots only), null when none. */
  lotAvgCents: number | null;
  unitCostCents: number | null;
  fits: Record<BoxSlug, BoxFit>;
  usedIn: string[];
};

const today = () => new Date().toLocaleDateString("en-CA");

export function LogPurchase({
  products,
  vendors,
  initialId,
  rules,
  policy,
}: {
  products: PurchaseProduct[];
  vendors: string[];
  initialId?: string;
  rules: Record<BoxSlug, BoxRules>;
  policy: Settings["policy"];
}) {
  const [list, setList] = useState(products);
  const [selected, setSelected] = useState<PurchaseProduct | null>(() => products.find((p) => p.id === initialId) ?? null);
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState<{ upc?: string; name?: string; draft?: LookupDraft } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [state, action, pending] = useActionState<PurchaseState, FormData>(logPurchase, {});
  const [qty, setQty] = useState("");
  const [total, setTotal] = useState("");
  const [done, setDone] = useState<null | { product: PurchaseProduct; unit: number; qty: number }>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [creatingPending, startCreate] = useTransition();
  const [lastState, setLastState] = useState(state);

  if (state !== lastState) {
    setLastState(state);
    if (state.error) toast.error(state.error);
    if (state.warning) toast.warning(state.warning, { duration: 10000 });
    if (state.ok && selected && state.unitCostCents !== undefined && state.qty) {
      const newOnHand = selected.onHand + state.qty;
      const avg = ((selected.lotAvgCents ?? 0) * selected.onHand + state.unitCostCents * state.qty) / newOnHand;
      const updated = { ...selected, onHand: newOnHand, lotAvgCents: avg, unitCostCents: avg };
      setList((l) => l.map((p) => (p.id === updated.id ? updated : p)));
      setSelected(updated);
      setDone({ product: updated, unit: state.unitCostCents, qty: state.qty });
      setQty("");
      setTotal("");
    }
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, "");
    return list
      .filter((p) => (digits.length >= 6 && sameBarcode(p.upc, digits)) || `${p.code} ${p.name} ${p.brand ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, list]);

  async function onScan(code: string) {
    setScanning(false);
    const found = list.find((p) => sameBarcode(p.upc, code));
    if (found) {
      setSelected(found);
      setDone(null);
      toast.success(`Found ${found.name}`);
      return;
    }
    setLookingUp(true);
    const res = await lookupBarcode(code).catch(() => ({ kind: "none" as const, upc: code }));
    setLookingUp(false);
    if (res.kind === "existing") {
      const p = list.find((x) => x.id === res.id);
      if (p) {
        setSelected(p);
        toast.success(`Found ${p.name}`);
        return;
      }
    }
    if (res.kind === "draft") {
      setCreating({ upc: code, name: res.draft.name ?? undefined, draft: res.draft });
      toast.info(`Found on ${res.draft.source}. Check it against the label.`);
    } else {
      setCreating({ upc: code });
      toast.info("New barcode, not in USDA or Open Food Facts: add it by hand");
    }
  }

  const qtyN = Number.parseInt(qty, 10);
  const totalN = Number(total.replace(/[$,\s]/g, ""));
  const unit = qtyN > 0 && Number.isFinite(totalN) && total !== "" ? (totalN * 100) / qtyN : null;
  const newAvg =
    selected && unit !== null ? ((selected.lotAvgCents ?? 0) * selected.onHand + unit * qtyN) / (selected.onHand + qtyN) : null;

  if (done) {
    const p = done.product;
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Logged {done.qty} units of</p>
          <p className="text-lg font-semibold">{p.name}</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{fmt$(done.unit)}/unit</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">On hand</dt>
              <dd className="text-lg font-semibold">{p.onHand}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Average cost</dt>
              <dd className="text-lg font-semibold">{fmt$(p.lotAvgCents)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Used in</dt>
              <dd>{p.usedIn.join(" / ") || "No lineup yet"}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <FitReasons fits={p.fits} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => { setDone(null); setSelected(null); setQuery(""); }}>
            Log another
          </Button>
          <Button variant="outline" onClick={() => setDone(null)}>
            Same product again
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/admin/products/${p.id}`}>View</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {!selected && !creating && (
        <div className="space-y-3">
          <Button size="lg" className="h-14 w-full text-base" onClick={() => setScanning(true)}>
            <ScanLine className="size-5" /> Scan barcode
          </Button>
          {scanning && <BarcodeScanner onDetected={onScan} onClose={() => setScanning(false)} />}
          {lookingUp && <p className="text-center text-sm text-muted-foreground">Looking up the barcode in USDA and Open Food Facts…</p>}
          <div className="relative">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="…or search by name, brand, code"
              className={`${fieldClass} h-11 pl-9`}
              aria-label="Search products"
            />
          </div>
          {matches.length > 0 && (
            <ul className="divide-y rounded-xl border bg-card">
              {matches.map((p) => (
                <li key={p.id}>
                  <button className="w-full px-3 py-2.5 text-left hover:bg-muted" onClick={() => { setSelected(p); setQuery(""); }}>
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.code} · {p.brand ?? "—"} · {p.onHand} on hand
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim().length > 2 && (
            <Button variant="outline" className="w-full" onClick={() => setCreating({ name: query.trim() })}>
              + New product &ldquo;{query.trim()}&rdquo;
            </Button>
          )}
        </div>
      )}

      {creating && (
        <form
          key={creating.upc ?? creating.name ?? "new"}
          className="space-y-3 rounded-xl border bg-card p-4"
          action={(fd) =>
            startCreate(async () => {
              fd.set("_return", "id");
              const res = await createProduct({}, fd);
              if (res.error || !res.id) return void toast.error(res.error ?? "Couldn't add the product");
              for (const kind of ["front", "nutrition"] as const) {
                const f = fd.get(`photo_${kind}`);
                if (f instanceof File && f.size) {
                  const pf = new FormData();
                  pf.set("product_id", res.id);
                  pf.set("kind", kind);
                  pf.set("file", await compressImage(f));
                  const up = await uploadProductPhoto({}, pf);
                  if (up.error) toast.error(up.error);
                }
              }
              const name = String(fd.get("name"));
              const p: PurchaseProduct = {
                id: res.id,
                code: "new",
                name,
                brand: (fd.get("brand") as string) || null,
                upc: (fd.get("upc") as string) || null,
                status: "Candidate",
                onHand: 0,
                lotAvgCents: null,
                unitCostCents: null,
                fits: eligibleBoxes(ruleInputFromForm(fd), rules, policy),
                usedIn: [],
              };
              setList((l) => [...l, p]);
              setSelected(p);
              setCreating(null);
              toast.success("Added as a Candidate. Finish nutrition later.");
            })
          }
        >
          <p className="font-semibold">New product</p>
          {creating.draft && <DraftNotice draft={creating.draft} />}
          <Field label="Name">
            <input name="name" required defaultValue={creating.name} className={fieldClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Brand">
              <input name="brand" defaultValue={creating.draft?.brand ?? ""} className={fieldClass} />
            </Field>
            <Field label="UPC">
              <input name="upc" inputMode="numeric" defaultValue={creating.upc} className={fieldClass} />
            </Field>
            <Field label="Type">
              <select name="type" className={fieldClass}>
                {PRODUCT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Form">
              <select name="form" className={fieldClass}>
                {FORMS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Unit weight (oz)">
              <input name="unit_wt_oz" inputMode="decimal" defaultValue={creating.draft?.unit_wt_oz ?? ""} className={fieldClass} />
            </Field>
          </div>
          <DraftNutrition draft={creating.draft} />
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="categories" value={c} /> {c}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Front photo">
              <input name="photo_front" type="file" accept="image/*" capture="environment" className="block w-full text-xs" />
            </Field>
            <Field label="Nutrition facts photo">
              <input name="photo_nutrition" type="file" accept="image/*" capture="environment" className="block w-full text-xs" />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={creatingPending}>
              {creatingPending ? "Adding…" : "Add & continue"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {selected && (
        <>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.code} · {selected.brand ?? "—"} {selected.upc ? `· UPC ${selected.upc}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Change
              </Button>
            </div>
            <div className="mt-3">
              <FitReasons fits={selected.fits} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">On hand</dt>
                <dd className="font-semibold">{selected.onHand}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Avg cost</dt>
                <dd className="font-semibold">{fmt$(selected.lotAvgCents ?? selected.unitCostCents)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Used in</dt>
                <dd>{selected.usedIn.join(", ") || "—"}</dd>
              </div>
            </dl>
            {selected.status !== "Approved" && <Badge tone="info" className="mt-2">{selected.status}: not yet approved</Badge>}
          </div>

          <form
            className="space-y-3 rounded-xl border bg-card p-4"
            action={async (fd) => {
              const f = fd.get("receipt");
              if (f instanceof File && f.size && f.type.startsWith("image/")) {
                setReceiptBusy(true);
                try { fd.set("receipt", await compressImage(f)); }
                catch { toast.error("Could not prepare the receipt. Try a smaller photo."); return; }
                finally { setReceiptBusy(false); }
              }
              const prepared = fd.get("receipt");
              if (prepared instanceof File && prepared.size > 3_000_000) { toast.error("Receipt must be under 3 MB. Try a smaller file."); return; }
              action(fd);
            }}
          >
            <input type="hidden" name="product_id" value={selected.id} />
            <Field label="Store / vendor">
              <input name="vendor" required list="vendors" className={`${fieldClass} h-11`} placeholder="Costco" />
            </Field>
            <datalist id="vendors">
              {vendors.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Units">
                <input name="qty" required inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className={`${fieldClass} h-11`} placeholder="24" />
              </Field>
              <Field label="Total paid $">
                <input name="total" required inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} className={`${fieldClass} h-11`} placeholder="11.99" />
              </Field>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-semibold tabular-nums">{unit === null ? "—" : `${fmt$(unit)}/unit`}</p>
              {newAvg !== null && selected.onHand > 0 && (
                <p className="text-xs text-muted-foreground">
                  New average {fmt$(newAvg)} across {selected.onHand + qtyN} units
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Purchased">
                <input name="purchased_at" type="date" required defaultValue={today()} className={fieldClass} />
              </Field>
              <Field label="Expires">
                <input name="expires_on" type="date" className={fieldClass} />
              </Field>
            </div>
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">Lot code, receipt, note</summary>
              <div className="mt-3 space-y-3">
                <Field label="Lot code (for recalls)">
                  <input name="lot_code" className={fieldClass} />
                </Field>
                <Field label="Receipt photo">
                  <input name="receipt" type="file" accept="image/*,application/pdf" capture="environment" className="block w-full text-sm" />
                </Field>
                <Field label="Note">
                  <input name="note" className={fieldClass} />
                </Field>
              </div>
            </details>
            <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pending || receiptBusy}>
              {pending || receiptBusy ? "Saving…" : "Log purchase"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

const QUICK_NUTRIENTS: [key: keyof LookupDraft["nutrition"], label: string][] = [
  ["calories", "Calories"],
  ["protein_g", "Protein g"],
  ["fiber_g", "Fiber g"],
  ["carbs_g", "Carbs g"],
  ["added_sugar_g", "Added sugar g"],
  ["sodium_mg", "Sodium mg"],
  ["caffeine_mg", "Caffeine mg"],
];

function DraftNotice({ draft }: { draft: LookupDraft }) {
  return (
    <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-900">
      Prefilled from <b>{draft.source}</b>
      {draft.serving ? ` (serving: ${draft.serving})` : ""}. Not verified: check every number against the package label
      {draft.fromOff.length ? `, especially ${draft.fromOff.join(", ").replace(/_g|_mg/g, "")} (from Open Food Facts)` : ""}
      {draft.scaled ? ". Some values were scaled from per-100 g" : ""}.
      {draft.nutrition.added_sugar_g == null && " Added sugar is missing: enter it from the label."}
    </div>
  );
}

/** Optional nutrition on quick-create; prefilled from a barcode lookup when there is one. */
function DraftNutrition({ draft }: { draft?: LookupDraft }) {
  return (
    <details open={Boolean(draft)}>
      <summary className="cursor-pointer text-sm text-muted-foreground">Nutrition (optional now, needed before it can go in a box)</summary>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {QUICK_NUTRIENTS.map(([k, label]) => (
          <Field key={k} label={label}>
            <input name={k} inputMode="decimal" defaultValue={draft?.nutrition[k] ?? ""} className={fieldClass} />
          </Field>
        ))}
      </div>
      {draft && (
        <>
          <input type="hidden" name="nutrition_source" value={draft.source.startsWith("USDA") ? "USDA" : "Open Food Facts"} />
          {draft.ingredients && <input type="hidden" name="ingredients" value={draft.ingredients} />}
          {draft.allergens && <input type="hidden" name="allergens" value={draft.allergens} />}
          {Object.entries(draft.free_from).map(([k, v]) => (
            <input key={k} type="hidden" name={`ff_${k}`} value={v ? "yes" : "no"} />
          ))}
        </>
      )}
    </details>
  );
}
