"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createAllShipments,
  createManualShipment,
  importPirateShip,
  packShipment,
  saveLabel,
  setShipmentStatus,
  unpackShipment,
  type OrderState,
} from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/admin/ui";
import { BOX_LABEL, BOX_SLUGS } from "@/lib/admin/types";

function useResult(state: OrderState, after?: (s: OrderState) => void) {
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.error) toast.error(state.error, { duration: 10_000 });
    else if (state.ok) {
      if (state.message) toast.success(state.message);
      after?.(state);
    }
  }, [state, after]);
}

export function PlanAllButton() {
  const [state, action, pending] = useActionState(createAllShipments, {});
  useResult(state);
  return (
    <form action={action}>
      <Button disabled={pending}>{pending ? "Planning…" : "Plan all paid orders"}</Button>
    </form>
  );
}

export function PirateShipImport() {
  const [state, action, pending] = useActionState(importPirateShip, {});
  const form = useRef<HTMLFormElement>(null);
  useResult(state, () => form.current?.reset());
  return (
    <form ref={form} action={action} className="flex flex-wrap items-center gap-2">
      <input name="file" type="file" accept=".csv,text/csv" required className="text-sm" aria-label="Pirate Ship CSV" />
      <Button size="sm" variant="secondary" disabled={pending}>
        {pending ? "Importing…" : "Import labels"}
      </Button>
    </form>
  );
}

export function ManualShipmentForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(createManualShipment, {});
  useResult(state, (s) => s.id && router.push(`/admin/orders/${s.id}`));
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="Kind">
        <select name="kind" className={fieldClass}>
          <option value="gift">Gift</option>
          <option value="sample">Sample / influencer</option>
          <option value="replacement">Replacement</option>
        </select>
      </Field>
      <Field label="Box">
        <select name="box_slug" className={fieldClass}>
          {BOX_SLUGS.map((b) => (
            <option key={b} value={b}>
              {BOX_LABEL[b]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Recipient">
        <input name="recipient_name" required className={fieldClass} />
      </Field>
      <Field label="Email">
        <input name="recipient_email" type="email" className={fieldClass} />
      </Field>
      <Field label="Address" className="sm:col-span-2">
        <input name="line1" className={fieldClass} />
      </Field>
      <Field label="Apt / suite">
        <input name="line2" className={fieldClass} />
      </Field>
      <Field label="City">
        <input name="city" className={fieldClass} />
      </Field>
      <Field label="State">
        <input name="state" className={fieldClass} />
      </Field>
      <Field label="ZIP">
        <input name="postal_code" className={fieldClass} />
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <input name="notes" className={fieldClass} />
      </Field>
      <Button disabled={pending} className="sm:col-span-2 sm:justify-self-start">
        Plan shipment
      </Button>
    </form>
  );
}

export function PackButtons({ id, status }: { id: string; status: string }) {
  const [packState, pack, packing] = useActionState(packShipment, {});
  const [unpackState, unpack, unpacking] = useActionState(unpackShipment, {});
  useResult(packState);
  useResult(unpackState);
  if (status === "planned")
    return (
      <form action={pack}>
        <input type="hidden" name="id" value={id} />
        <Button disabled={packing}>{packing ? "Packing…" : "Mark packed (deduct stock)"}</Button>
      </form>
    );
  if (status === "packed")
    return (
      <form action={unpack}>
        <input type="hidden" name="id" value={id} />
        <Button variant="outline" disabled={unpacking}>
          Unpack (return stock)
        </Button>
      </form>
    );
  return null;
}

export function LabelForm({
  id,
  status,
  initial,
}: {
  id: string;
  status: string;
  initial: { carrier: string | null; service: string | null; zone: number | null; label_cost_cents: number | null; tracking: string | null };
}) {
  const [state, action, pending] = useActionState(saveLabel, {});
  useResult(state);
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Carrier">
        <input name="carrier" defaultValue={initial.carrier ?? ""} list="carriers" className={fieldClass} />
      </Field>
      <Field label="Service">
        <input name="service" defaultValue={initial.service ?? ""} list="services" className={fieldClass} />
      </Field>
      <Field label="Label cost $ (actual)">
        <input name="label_cost" inputMode="decimal" defaultValue={initial.label_cost_cents === null ? "" : (initial.label_cost_cents / 100).toFixed(2)} className={fieldClass} />
      </Field>
      <Field label="Zone">
        <input name="zone" inputMode="numeric" defaultValue={initial.zone ?? ""} className={fieldClass} />
      </Field>
      <Field label="Tracking number" className="col-span-2">
        <input name="tracking" defaultValue={initial.tracking ?? ""} className={fieldClass} />
      </Field>
      {status === "packed" && (
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="ship" defaultChecked /> Mark as shipped
        </label>
      )}
      <Button disabled={pending} className="col-span-2 justify-self-start">
        Save label
      </Button>
      <datalist id="carriers">
        <option value="USPS" />
        <option value="UPS" />
      </datalist>
      <datalist id="services">
        <option value="Ground Advantage" />
        <option value="Ground Advantage Cubic" />
        <option value="Priority Mail" />
        <option value="UPS Ground Saver" />
        <option value="UPS Ground" />
      </datalist>
    </form>
  );
}

export function DeliveryForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(setShipmentStatus, {});
  useResult(state);
  return (
    <div className="flex flex-wrap gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="to" value="delivered" />
        <Button size="sm" variant="secondary" disabled={pending}>
          Mark delivered
        </Button>
      </form>
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="to" value="issue" />
        <select name="issue" className={`${fieldClass} h-8 w-auto`} aria-label="Issue">
          <option value="damaged">Damaged</option>
          <option value="lost">Lost</option>
          <option value="returned">Returned</option>
          <option value="other">Other</option>
        </select>
        <input name="issue_note" placeholder="Note" className={`${fieldClass} h-8 w-40`} aria-label="Issue note" />
        <Button size="sm" variant="outline" disabled={pending}>
          Flag issue
        </Button>
      </form>
    </div>
  );
}
