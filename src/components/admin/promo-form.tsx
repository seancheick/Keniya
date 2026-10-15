"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createPromo, type PromoState } from "@/actions/admin/promos";
import { Field, fieldClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export function PromoForm() {
  const [state, action, pending] = useActionState<PromoState, FormData>(createPromo, {});
  const form = useRef<HTMLFormElement>(null);
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.error) toast.error(state.error);
    if (state.ok) {
      toast.success(state.ok);
      form.current?.reset();
    }
  }, [state]);
  return (
    <form ref={form} action={action} className="grid gap-3 sm:grid-cols-5 sm:items-end">
      <Field label="Code">
        <input name="code" required placeholder="BLOOM10" className={`${fieldClass} uppercase`} />
      </Field>
      <Field label="Vendor / partner">
        <input name="vendor" placeholder="Bloom Doula Co." className={fieldClass} />
      </Field>
      <Field label="% off">
        <input name="percentOff" required inputMode="numeric" defaultValue={10} className={fieldClass} />
      </Field>
      <Field label="Max uses (blank = no cap)">
        <input name="maxRedemptions" inputMode="numeric" className={fieldClass} />
      </Field>
      <Field label="Expires (optional)">
        <input name="expires" type="date" className={fieldClass} />
      </Field>
      <div className="sm:col-span-5">
        <Button disabled={pending}>{pending ? "Creating…" : "Create code"}</Button>
      </div>
    </form>
  );
}
