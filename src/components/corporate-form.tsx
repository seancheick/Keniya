"use client";

import { useState, useTransition } from "react";
import { requestCorporateGifts } from "@/actions/corporate";
import { site } from "@/lib/site";

const field =
  "h-12 w-full rounded-[6px] border-2 border-ink/20 bg-cream-card px-4 text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-ink focus-visible:ring-[3px] focus-visible:ring-ring/40";

/** Quote request for 10+ boxes. Pricing is quoted by hand; nothing is charged here. */
export function CorporateForm({ min }: { min: number }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (result?.ok) {
    return (
      <p role="status" className="rounded-[6px] border-2 border-ink bg-mint p-5 font-semibold text-ink">
        {result.message}
      </p>
    );
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) ?? "");
        start(async () => {
          try {
            setResult(
              await requestCorporateGifts({
                name: get("name"),
                email: get("email"),
                company: get("company"),
                quantity: get("quantity"),
                needBy: get("needBy") || undefined,
                message: get("message") || undefined,
              }),
            );
          } catch {
            // The request itself failed (offline, deploy in progress): keep the form and say so.
            setResult({ ok: false, message: `We couldn't send that. Please try again or email ${site.email}.` });
          }
        });
      }}
    >
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Your name
        <input name="name" required maxLength={120} autoComplete="name" className={field} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Work email
        <input name="email" type="email" required maxLength={255} autoComplete="email" className={field} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Company
        <input name="company" required maxLength={160} autoComplete="organization" className={field} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        How many boxes?
        <input name="quantity" type="number" required min={min} max={5000} defaultValue={min} inputMode="numeric" className={field} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
        Needed by (optional)
        <input name="needBy" maxLength={60} placeholder="e.g. first week of December" className={field} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
        Anything we should know? (optional)
        <textarea
          name="message"
          rows={4}
          maxLength={1500}
          placeholder="The occasion, delivery to one office or many homes, a note to include…"
          className={`${field} h-auto py-3`}
        />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center rounded-full bg-ink px-8 text-base font-semibold text-cream transition-colors hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Request a quote"}
        </button>
        {result && !result.ok && (
          <p role="alert" className="mt-3 text-sm font-semibold text-coral-deep">
            {result.message}
          </p>
        )}
      </div>
    </form>
  );
}
