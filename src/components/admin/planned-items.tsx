"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setPlannedItems } from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/admin/ui";

type Opt = { id: string; label: string; ok: boolean };

export function PlannedItems({ shipmentId, items, options }: { shipmentId: string; items: string[]; options: Opt[] }) {
  const [ids, setIds] = useState(items);
  const [pending, start] = useTransition();
  const dirty = ids.join() !== items.join();
  return (
    <div className="space-y-2">
      <ol className="space-y-1">
        {ids.map((id, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 text-right text-xs text-muted-foreground">{i + 1}</span>
            <select value={id} onChange={(e) => setIds((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))} className={`${fieldClass} h-8`} aria-label={`Item ${i + 1}`}>
              {options.map((o) => (
                <option key={o.id} value={o.id} disabled={!o.ok && o.id !== id}>
                  {o.ok ? "" : "✕ "}
                  {o.label}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ol>
      {dirty && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setPlannedItems(shipmentId, ids);
              if (r.error) toast.error(r.error);
              else toast.success("Items updated");
            })
          }
        >
          Save swaps
        </Button>
      )}
    </div>
  );
}
