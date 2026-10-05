"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logPriceSighting, setProductStatus, uploadProductPhoto, type FormState } from "@/actions/admin/products";
import { Field, fieldClass } from "@/components/admin/ui";
import { compressImage } from "@/components/admin/compress-image";
import type { Status } from "@/lib/admin/types";

function useToast(state: FormState, ok: string, after?: () => void) {
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success(ok);
      after?.();
    }
  }, [state, ok, after]);
}

export function StatusControls({ id, status }: { id: string; status: Status }) {
  const [state, action, pending] = useActionState(setProductStatus, {});
  const [rejecting, setRejecting] = useState(false);
  useToast(state, "Status updated", () => setRejecting(false));
  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={id} />
        {status !== "Approved" && (
          <Button size="sm" name="status" value="Approved" disabled={pending} title="Clinician approval">
            Approve (clinician)
          </Button>
        )}
        {status === "Candidate" && (
          <Button size="sm" variant="outline" name="status" value="Pre-approved" disabled={pending} title="Passed your source and ingredient check; waits for the clinician">
            Pre-approve
          </Button>
        )}
        {status !== "Candidate" && (
          <Button size="sm" variant="outline" name="status" value="Candidate" disabled={pending}>
            Back to candidate
          </Button>
        )}
        {status !== "Rejected" && (
          <Button size="sm" variant="outline" type="button" onClick={() => setRejecting((r) => !r)}>
            Reject…
          </Button>
        )}
        {status !== "Retired" && (
          <Button size="sm" variant="ghost" name="status" value="Retired" disabled={pending}>
            Retire
          </Button>
        )}
      </form>
      {rejecting && (
        <form action={action} className="flex gap-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="Rejected" />
          <input name="reason" required autoFocus placeholder="Why? e.g. 9 g added sugar, contains aloe" className={fieldClass} />
          <Button size="sm" variant="destructive" disabled={pending}>
            Reject
          </Button>
        </form>
      )}
    </div>
  );
}

export function PhotoUpload({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(uploadProductPhoto, {});
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useToast(state, "Photo saved", () => form.current?.reset());
  return (
    <form
      ref={form}
      className="flex flex-wrap items-end gap-2"
      action={async (fd) => {
        setBusy(true);
        const f = fd.get("file");
        if (f instanceof File && f.size) fd.set("file", await compressImage(f));
        setBusy(false);
        action(fd);
      }}
    >
      <input type="hidden" name="product_id" value={productId} />
      <Field label="Photo" className="min-w-0 flex-1">
        <input name="file" type="file" accept="image/*" capture="environment" required className="block w-full text-sm" />
      </Field>
      <select name="kind" className={`${fieldClass} w-auto`} aria-label="Photo of">
        <option value="front">Front</option>
        <option value="nutrition">Nutrition facts</option>
        <option value="ingredients">Ingredients</option>
        <option value="barcode">Barcode</option>
        <option value="other">Other</option>
      </select>
      <Button size="sm" disabled={pending || busy}>
        {pending || busy ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}

export function PriceSightingForm({ productId, vendors }: { productId: string; vendors: string[] }) {
  const [state, action, pending] = useActionState(logPriceSighting, {});
  const form = useRef<HTMLFormElement>(null);
  useToast(state, "Price saved", () => form.current?.reset());
  return (
    <form ref={form} action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <input type="hidden" name="product_id" value={productId} />
      <input name="vendor" list="vendor-list-sighting" required placeholder="Store / vendor" className={`${fieldClass} col-span-2`} aria-label="Vendor" />
      <input name="unit_cost" required inputMode="decimal" placeholder="Unit $" className={fieldClass} aria-label="Unit price" />
      <input name="pack_qty" inputMode="numeric" placeholder="Case / MOQ" className={fieldClass} aria-label="Pack quantity" />
      <select name="source" className={fieldClass} aria-label="Source">
        <option value="sighting">Seen on shelf</option>
        <option value="quote">Vendor quote</option>
      </select>
      <Button size="sm" variant="secondary" className="col-span-2 sm:col-span-5 sm:justify-self-start" disabled={pending}>
        Log price
      </Button>
      <datalist id="vendor-list-sighting">
        {vendors.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </form>
  );
}
