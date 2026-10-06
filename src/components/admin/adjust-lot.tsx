"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { adjustLot, setLotExpiry } from "@/actions/admin/inventory";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/admin/ui";

export function AdjustLot({ lotId, remaining }: { lotId: string; remaining: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(adjustLot, {});
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.ok) setOpen(false);
  }
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) toast.success("Stock updated");
  }, [state]);
  if (!open)
    return (
      <Button size="xs" variant="ghost" onClick={() => setOpen(true)}>
        Adjust
      </Button>
    );
  return (
    <form action={action} className="flex flex-wrap items-center gap-1">
      <input type="hidden" name="lot_id" value={lotId} />
      <select name="kind" className={`${fieldClass} h-8 w-auto`} aria-label="Kind">
        <option value="waste">Waste (damaged/expired)</option>
        <option value="adjust">Count correction (±)</option>
        <option value="return">Returned to vendor</option>
      </select>
      <input name="delta" required inputMode="numeric" placeholder={`units (≤${remaining})`} className={`${fieldClass} h-8 w-28`} aria-label="Units" />
      <input name="reason" required placeholder="Reason" className={`${fieldClass} h-8 w-40`} aria-label="Reason" />
      <Button size="xs" disabled={pending}>
        Save
      </Button>
      <Button size="xs" variant="ghost" type="button" aria-label="Cancel stock adjustment" onClick={() => setOpen(false)}>
        ✕
      </Button>
    </form>
  );
}

export function LotExpiryForm({ lotId, expiresOn }: { lotId: string; expiresOn: string | null }) {
  const [state, action, pending] = useActionState(setLotExpiry, {});
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) toast.success("Expiry corrected; packable stock updated");
  }, [state]);
  return <details className="mt-2 text-xs print:hidden">
    <summary className="cursor-pointer py-2">Record / correct expiry</summary>
    <form action={action} className="mt-2 min-w-48 space-y-2">
      <input type="hidden" name="lot_id" value={lotId} />
      <label className="block">Date on this lot&apos;s package<input name="expires_on" type="date" required defaultValue={expiresOn ?? ""} className={`${fieldClass} mt-1`} /></label>
      <input name="reason" required placeholder="Reason, e.g. date checked on package" aria-label="Reason for expiry correction" className={fieldClass} />
      <Button type="submit" variant="outline" disabled={pending}>{pending ? "Saving…" : "Save expiry"}</Button>
    </form>
  </details>;
}
