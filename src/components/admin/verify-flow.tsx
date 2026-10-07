"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";
import { verifyPackage, type VerifyState } from "@/actions/admin/verify";
import { BarcodeScanner, sameBarcode } from "@/components/admin/barcode-scanner";
import { Badge, fieldClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type VerifyItem = {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  status: string;
  clinicianApproved: boolean;
  upc: string | null;
  /** Registered outer boxes this product comes in (scanning one identifies the product). */
  packs: { gtin: string; units: number }[];
  verifiedAt: string | null;
  verifiedBy: string | null;
  inBoxes: string[];
  eligible: string[];
  unitOz: number | null;
  nutrition: Record<string, number | null>;
  ingredients: string | null;
  allergens: string | null;
  frontPhoto: string | null;
  nutritionPhoto: string | null;
};

const boxOf = (i: VerifyItem, code: string) => i.packs.find((p) => sameBarcode(p.gtin, code)) ?? null;
const isVerified = (i: VerifyItem) => Boolean(i.verifiedAt && (i.upc || i.packs.length));

export function VerifyFlow({ items, minDays, minDate }: { items: VerifyItem[]; minDays: number; minDate: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanned, setScanned] = useState("");
  const [unknown, setUnknown] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [query, setQuery] = useState("");
  const selected = items.find((i) => i.id === selectedId) ?? null;

  function onBarcode(raw: string) {
    const code = raw.replace(/\D/g, "");
    if (code.length < 8) return;
    setCamera(false);
    setScanned(code);
    const hit = items.find((i) => sameBarcode(i.upc, code) || boxOf(i, code));
    if (hit) {
      setUnknown(null);
      setSelectedId(hit.id);
    } else if (selected) {
      setUnknown(null); // scanning while a product is open = attaching its first barcode
    } else {
      setUnknown(code);
    }
  }

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((i) => !q || `${i.code} ${i.name} ${i.brand ?? ""} ${i.upc ?? ""}`.toLowerCase().includes(q));
    return [
      { title: "Needed for the active boxes", rows: list.filter((i) => i.inBoxes.length && !isVerified(i)) },
      { title: "Eligible for a box, not in one yet", rows: list.filter((i) => !i.inBoxes.length && i.eligible.length && !isVerified(i)) },
      { title: "Other products", rows: list.filter((i) => !i.inBoxes.length && !i.eligible.length && !isVerified(i)) },
      { title: "Verified", rows: list.filter(isVerified) },
    ].filter((g) => g.rows.length);
  }, [items, query]);
  const boxLeft = items.filter((i) => i.inBoxes.length && !isVerified(i)).length;
  const boxTotal = items.filter((i) => i.inBoxes.length).length;

  return (
    <div className="space-y-4">
      <ScanBar onBarcode={onBarcode} onCamera={() => setCamera(true)} autoFocus={!selected || !(scanned || selected.upc)} />
      {camera && <BarcodeScanner onDetected={onBarcode} onClose={() => setCamera(false)} />}

      {selected ? (
        <VerifyPanel
          key={selected.id}
          item={selected}
          scanned={scanned}
          minDays={minDays}
          minDate={minDate}
          onCamera={() => setCamera(true)}
          onDone={() => {
            setSelectedId(null);
            setScanned("");
          }}
        />
      ) : (
        <>
          {unknown && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Barcode <b>{unknown}</b> isn&apos;t on any product yet. Tap the product it belongs to below; it will be saved when you verify.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm">
              <b>{boxTotal - boxLeft}</b> of {boxTotal} box products verified
            </p>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, code, barcode" className={cn(fieldClass, "ml-auto max-w-64")} aria-label="Search" />
          </div>
          {groups.map((g) => (
            <section key={g.title} className="rounded-xl border bg-card">
              <p className="border-b px-4 py-2 text-sm font-semibold">
                {g.title} <span className="font-normal text-muted-foreground">({g.rows.length})</span>
              </p>
              <ul className="divide-y">
                {g.rows.map((i) => (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(i.id);
                        if (!unknown) setScanned("");
                        setUnknown(null);
                      }}
                      className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left hover:bg-muted/50"
                    >
                      <span className="w-12 font-mono text-xs text-muted-foreground">{i.code}</span>
                      <span className="min-w-0 flex-1 text-sm">{i.name}</span>
                      {i.inBoxes.map((b) => (
                        <Badge key={b} tone="info">{b}</Badge>
                      ))}
                      <Badge tone={i.clinicianApproved ? "good" : "warn"}>
                        {i.clinicianApproved ? "PharmaGuide Team-approved" : i.status === "Approved" ? "Needs PharmaGuide Team review" : i.status}
                      </Badge>
                      <Badge tone={isVerified(i) ? "good" : "muted"}>{isVerified(i) ? "Package verified" : i.upc ? "Barcode on file" : "No barcode yet"}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

/** Always-focused field: handheld USB/Bluetooth scanners type the digits and press Enter here. */
function ScanBar({ onBarcode, onCamera, autoFocus }: { onBarcode: (code: string) => void; onCamera: () => void; autoFocus: boolean }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <form
      className="flex gap-2 rounded-xl border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onBarcode(value);
        setValue("");
      }}
    >
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        placeholder="Scan or type barcode"
        className={fieldClass}
        aria-label="Barcode"
      />
      <Button type="submit" variant="secondary">
        Find
      </Button>
      <Button type="button" onClick={onCamera}>
        <ScanLine /> Camera
      </Button>
    </form>
  );
}

// Controlled on purpose: React resets uncontrolled fields after a form action, and a rejected
// check should keep the answers so only the problem needs fixing.
function YesNo({ name, label, hint, value, onChange }: { name: string; label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex gap-2">
        {(["yes", "no"] as const).map((v) => (
          <label key={v} className="flex-1 cursor-pointer">
            <input type="radio" name={name} value={v} required checked={value === v} onChange={() => onChange(v)} className="peer sr-only" />
            <span className="block rounded-lg border px-3 py-2 text-center text-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2">
              {v === "yes" ? "Yes, matches" : "No"}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function VerifyPanel({
  item,
  scanned,
  minDays,
  minDate,
  onCamera,
  onDone,
}: {
  item: VerifyItem;
  scanned: string;
  minDays: number;
  minDate: string;
  onCamera: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<VerifyState, FormData>(verifyPackage, {});
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.ok) {
      toast.success(state.message ?? "Verified");
      router.refresh();
      onDone();
    } else if (state.error) toast.error(state.error);
    else if (state.problems) router.refresh();
  }, [state, router, onDone]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answer = (k: string) => ({ value: answers[k] ?? "", onChange: (v: string) => setAnswers((a) => ({ ...a, [k]: v })) });
  const upc = scanned || item.upc || "";
  const box = scanned ? boxOf(item, scanned) : null;
  const mismatch = Boolean(scanned && item.upc && !box && !sameBarcode(item.upc, scanned));
  // A code that's neither on file nor a known box: ask where it's printed before saving it.
  const unknownCode = Boolean(scanned && !box && !item.upc);
  const [barcodeOn, setBarcodeOn] = useState<"" | "unit" | "box">("");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL, not optimizable */}
          {item.frontPhoto && <img src={item.frontPhoto} alt="" className="h-20 w-20 rounded-lg border object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
            <p className="font-semibold">{item.name}</p>
            <p className="text-sm text-muted-foreground">
              {[item.brand, item.unitOz ? `${item.unitOz} oz` : null].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {item.inBoxes.map((b) => (
                <Badge key={b} tone="info">In {b}</Badge>
              ))}
              {isVerified(item) && <Badge tone="good">{`Verified ${item.verifiedAt!.slice(0, 10)} by ${item.verifiedBy ?? "?"}`}</Badge>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onDone}>
            ← All products
          </Button>
        </div>

        <div className={cn("rounded-lg border p-3 text-sm", mismatch ? "border-red-300 bg-red-50" : upc ? "bg-muted/40" : "border-amber-200 bg-amber-50")}>
          {mismatch ? (
            <p className="text-red-800">
              Scanned <b>{scanned}</b>, but this product&apos;s barcode is <b>{item.upc}</b>. Wrong item, or a new pack or formula: don&apos;t verify.
            </p>
          ) : box ? (
            <p>
              Outer box <b>{scanned}</b> ({box.units} per box). This identifies the product; check the label on a single pack from inside it.
            </p>
          ) : upc ? (
            <p>
              Barcode <b>{upc}</b> {item.upc ? "(on file)" : "(new)"}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-amber-900">Scan this package&apos;s barcode first (handheld scanner into the box above, or the camera).</p>
              <Button size="sm" onClick={onCamera}>
                <ScanLine /> Camera
              </Button>
            </div>
          )}
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold">On file (per pack): compare with the package</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            {Object.entries(item.nutrition).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="tabular-nums">{v ?? "—"}</dd>
              </div>
            ))}
          </dl>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL, not optimizable */}
          {item.nutritionPhoto && <img src={item.nutritionPhoto} alt="Nutrition panel on file" className="mt-2 max-h-56 rounded-lg border" />}
        </div>
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">Ingredients on file</p>
          <p>{item.ingredients ?? "None on file: read the package's list and update the product if needed."}</p>
          <p className="mt-2 text-xs text-muted-foreground">Allergen statement on file</p>
          <p>{item.allergens ?? "—"}</p>
        </div>
      </section>

      <form action={action} className="space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-28 lg:self-start">
        <input type="hidden" name="product_id" value={item.id} />
        <input type="hidden" name="upc" value={upc} />
        {unknownCode && (
          <fieldset className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <legend className="px-1 font-medium">Where is this barcode printed?</legend>
            {(["unit", "box"] as const).map((v) => (
              <label key={v} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="barcode_on" value={v} checked={barcodeOn === v} onChange={() => setBarcodeOn(v)} className="size-5" />
                {v === "unit" ? "On the single pack itself" : "On the outer box or multipack (the single pack has none)"}
              </label>
            ))}
            {barcodeOn === "box" && (
              <label className="flex items-center gap-2">
                Single packs in that box
                <input name="units_per_box" inputMode="numeric" required className={cn(fieldClass, "w-24")} />
              </label>
            )}
          </fieldset>
        )}
        <YesNo name="nutrition_ok" label="Nutrition panel matches?" hint="Calories, protein, fiber, carbs, added sugar, sodium, sat fat (small rounding is fine)." {...answer("nutrition_ok")} />
        <YesNo name="ingredients_ok" label="Ingredients and allergens match?" hint="Including any 'may contain' or facility statement." {...answer("ingredients_ok")} />
        <YesNo name="single_serve" label="One sealed single-serve pack?" hint="The label says 1 serving per container, or the pack itself is the serving." {...answer("single_serve")} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">Expiry / best-by date on this package</span>
          <input type="date" name="expires_on" required value={answers.expires_on ?? ""} onChange={(e) => answer("expires_on").onChange(e.target.value)} className={fieldClass} />
          <span className="block text-xs text-muted-foreground">Needs at least {minDays} days left (on or after {minDate}).</span>
        </label>
        {state.problems && state.problems.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {state.problems.map((p) => (
              <li key={p}>• {p}</li>
            ))}
            <li>
              <Link className="underline" href={`/admin/products/${item.id}/edit`}>
                Open the product to update it
              </Link>
            </li>
          </ul>
        )}
        <Button type="submit" className="w-full" disabled={pending || !upc || mismatch || (unknownCode && !barcodeOn)}>
          {pending ? "Saving…" : "Verify package"}
        </Button>
        {!item.clinicianApproved && (
          <p className="text-xs text-muted-foreground">Still needs PharmaGuide Team approval before it can be packed.</p>
        )}
      </form>
    </div>
  );
}
