"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { setPlannedItems } from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { PackButtons } from "./order-forms";
import { fieldClass } from "./ui";
import type { LotPull } from "@/lib/admin/stock";

type Opt = { id: string; label: string; ok: boolean; reason: string | null; pulls: LotPull[]; short: number };

export function PlannedItems({ shipmentId, items, options, blockers, expectedLots, expectedPackage, slotPulls }: { shipmentId: string; items: string[]; options: Opt[]; blockers: string[]; expectedLots: string; expectedPackage: string | null; slotPulls: LotPull[][] }) {
  const [ids, setIds] = useState(items);
  const [checked, setChecked] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  // Phones show the product name; the replacement dropdown appears only when you tap Swap.
  const [swapping, setSwapping] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const dirty = ids.join() !== items.join();
  const picked = checked.length;
  const complete = ids.length > 0 && picked === ids.length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Pull the lots below, check each sealed pack, then mark the box packed. Stock is deducted when you finish; this preview does not reserve it.</p>
      {blockers.length > 0 && <div role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Before you pack</p><ul className="mt-1 list-disc space-y-1 pl-5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul></div>}
      <label className="block space-y-1 print:hidden">
        <span className="text-sm">Find a replacement by name, brand or code</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} className={`${fieldClass} h-11`} placeholder="Search replacements" />
      </label>
      <ol className="divide-y">
        {ids.map((id, i) => {
          const selected = options.find((o) => o.id === id);
          const visible = options.filter((o) => o.id === id || o.label.toLowerCase().includes(query.trim().toLowerCase()));
          return <li key={i} className="space-y-2 py-3">
            <div className="flex items-start gap-3">
              <label className="flex min-h-11 shrink-0 items-center gap-2 text-sm">
                <input type="checkbox" className="size-5" checked={checked.includes(i)} disabled={dirty || pending || !selected?.ok || Boolean(selected.short)} aria-label={`Picked item ${i + 1}: ${selected?.label ?? "unknown"}`} onChange={(e) => setChecked((xs) => e.target.checked ? [...xs, i] : xs.filter((x) => x !== i))} />
                {i + 1}
              </label>
              <div className="min-w-0 flex-1">
                <select value={id} disabled={pending} onChange={(e) => { setIds((xs) => xs.map((x, j) => j === i ? e.target.value : x)); setChecked([]); }} className={`${fieldClass} h-11 print:hidden ${swapping === i ? "" : "max-sm:hidden"}`} aria-label={`Item ${i + 1}`}>
                  {!selected && <option value={id}>Unknown product — replace it</option>}
                  {visible.map((o) => <option key={o.id} value={o.id} disabled={(!o.ok || ids.includes(o.id)) && o.id !== id}>{o.ok ? "" : "Needs attention · "}{o.label}</option>)}
                </select>
                <p className={`text-sm font-medium sm:hidden print:block ${swapping === i ? "hidden" : ""}`}>{selected?.label ?? "Unknown product"}</p>
                {selected?.reason && <p className="mt-1 text-sm text-amber-900">{selected.reason}</p>}
                {(id === items[i] ? slotPulls[i] : selected?.pulls)?.map((lot) => <p key={lot.lotId} className="mt-1 text-sm"><b>Pull {lot.qty}</b> · lot {lot.label} · expires {lot.expiresOn}</p>)}
                {selected && selected.short > 0 && <p className="text-sm text-red-800">Short {selected.short} packable unit(s). <Link className="underline" href={`/admin/inventory/log?product=${id}`}>Log a purchase</Link></p>}
                <div className="mt-1 flex flex-wrap items-center gap-x-4 print:hidden">
                  <button type="button" className="min-h-11 text-sm underline sm:hidden" onClick={() => setSwapping(swapping === i ? null : i)}>{swapping === i ? "Done" : "Swap"}</button>
                  <Link href={`/admin/products/${id}`} className="inline-flex min-h-11 items-center text-xs underline sm:min-h-0">Product details / verify</Link>
                </div>
              </div>
            </div>
          </li>;
        })}
      </ol>
      {dirty ? <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button disabled={pending} onClick={() => start(async () => {
          try { const r = await setPlannedItems(shipmentId, ids); if (r.error) toast.error(r.error); else toast.success("Swaps saved. Check the updated lots before packing."); }
          catch { toast.error("Could not save swaps. Your edits are still here; try again."); }
        })}>{pending ? "Saving…" : "Save swaps"}</Button>
        <Button variant="ghost" disabled={pending} onClick={() => { setIds(items); setChecked([]); }}>Discard swaps</Button>
        <p className="text-sm text-muted-foreground">Save your swaps before checking off items.</p>
      </div> : <div className="sticky bottom-0 z-20 -mx-4 space-y-2 border-t bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 print:hidden">
        <p className="text-sm font-medium" aria-live="polite">{picked} of {ids.length} packs checked</p>
        <PackButtons id={shipmentId} status="planned" disabled={!complete || blockers.length > 0} expectedItems={items} expectedLots={expectedLots} expectedPackage={expectedPackage} />
      </div>}
    </div>
  );
}
