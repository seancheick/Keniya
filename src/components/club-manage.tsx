"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clubAction, requestClubLink, type ClubActionInput } from "@/actions/club";
import { CANCEL_REASONS, SKIP_CHOICES } from "@/lib/club-shared";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const field =
  "h-11 w-full rounded-[6px] border-2 border-ink/20 bg-cream-card px-3 text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-ink focus-visible:ring-[3px] focus-visible:ring-ring/40";
// Distributes over the union, so each action keeps its own fields (address keeps `address`).
type ActionBody = ClubActionInput extends infer T ? (T extends unknown ? Omit<T, "token" | "subscriptionId"> : never) : never;
const pill = "inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold transition-colors disabled:opacity-60";

export function ClubLinkForm() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  if (result?.ok) return <p role="status" className="rounded-[6px] border-2 border-ink bg-mint p-4 font-semibold text-ink">{result.message}</p>;
  return (
    <form
      className="flex flex-wrap gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await requestClubLink({ email })));
      }}
    >
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="The email you subscribed with" aria-label="Email address" autoComplete="email" className={cn(field, "min-w-0 flex-1 rounded-full px-5")} />
      <button type="submit" disabled={pending} className={cn(pill, "bg-ink text-cream hover:bg-ink/85")}>
        {pending ? "Sending…" : "Email me a link"}
      </button>
      {result && !result.ok && <p role="alert" className="w-full text-sm font-semibold text-coral-deep">{result.message}</p>}
    </form>
  );
}

export type ClubCard = {
  id: string;
  boxName: string;
  priceLabel: string;
  state: "active" | "skipping" | "paused" | "cancelling" | "ended";
  statusLine: string;
  paymentIssue?: string | null;
  shipTo: string | null;
  address: { name: string; line1: string; line2: string; city: string; state: string; postal_code: string };
};

export function ClubManage({ token, cards }: { token: string; cards: ClubCard[] }) {
  return (
    <div className="space-y-6">
      {cards.map((c) => (
        <ClubSubscription key={c.id} token={token} card={c} />
      ))}
    </div>
  );
}

function ClubSubscription({ token, card }: { token: string; card: ClubCard }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const run = (input: ActionBody) =>
    start(async () => {
      const res = await clubAction({ ...input, token, subscriptionId: card.id } as ClubActionInput);
      setResult(res);
      if (res.ok) {
        setEditing(false);
        setConfirmCancel(false);
        router.refresh();
      }
    });

  return (
    <section className="rounded-[6px] border-2 border-ink bg-cream-card p-5 shadow-[0_18px_30px_-24px_rgb(37_37_37/0.6)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">{card.boxName}</h2>
        <p className="font-display text-xl font-extrabold text-ink">{card.priceLabel}/mo</p>
      </div>
      <p className="paper mt-3 rounded-[3px] bg-butter px-3 py-2 text-sm font-semibold text-ink">{card.statusLine}</p>

      {card.paymentIssue && (
        <p role="alert" className="mt-3 rounded-[6px] border-2 border-coral-deep p-3 text-sm text-ink">
          {card.paymentIssue} <a href={`mailto:${site.email}`} className="font-semibold underline">Contact us for billing help</a>.
        </p>
      )}

      {card.state !== "ended" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {card.state === "active" && (
            <>
              <button type="button" disabled={pending} onClick={() => run({ action: "skip" })} className={cn(pill, "bg-ink text-cream hover:bg-ink/85")}>Skip next box</button>
              <button type="button" disabled={pending} onClick={() => run({ action: "pause" })} className={cn(pill, "border-2 border-ink text-ink hover:bg-ink hover:text-cream")}>Pause</button>
            </>
          )}
          {(card.state === "skipping" || card.state === "paused") && (
            <button type="button" disabled={pending} onClick={() => run({ action: "resume" })} className={cn(pill, "bg-ink text-cream hover:bg-ink/85")}>
              {card.state === "skipping" ? "Don't skip" : "Resume"}
            </button>
          )}
          {card.state === "cancelling" ? (
            <button type="button" disabled={pending} onClick={() => run({ action: "keep" })} className={cn(pill, "bg-ink text-cream hover:bg-ink/85")}>Keep my Snack Club</button>
          ) : (
            !confirmCancel && (
              <button type="button" onClick={() => setConfirmCancel(true)} className={cn(pill, "text-ink-soft underline underline-offset-4 hover:text-ink")}>Cancel</button>
            )
          )}
        </div>
      )}

      {/* One honest screen: a break instead, or cancel right here. Cancelling is never hidden
          behind the offer and is one click from this panel. */}
      {confirmCancel && card.state !== "cancelling" && card.state !== "ended" && (
        <div role="group" aria-labelledby={`leave-${card.id}`} className="paper mt-5 rounded-[6px] bg-lilac/60 p-4 sm:p-5">
          <p id={`leave-${card.id}`} className="font-display text-xl font-extrabold tracking-tight text-ink">Need a break instead?</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            Skip up to three months or pause. You won&rsquo;t be charged while you&rsquo;re away, and your box picks up right where
            you left off.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {card.state === "active" &&
              SKIP_CHOICES.map((n) => (
                <button key={n} type="button" disabled={pending} onClick={() => run({ action: "skip", months: n })} className={cn(pill, "bg-ink text-cream hover:bg-ink/85")}>
                  Skip {n} {n === 1 ? "month" : "months"}
                </button>
              ))}
            {card.state !== "paused" && (
              <button type="button" disabled={pending} onClick={() => run({ action: "pause" })} className={cn(pill, "border-2 border-ink bg-cream-card text-ink hover:bg-ink hover:text-cream")}>
                Pause instead
              </button>
            )}
          </div>

          <p className="mt-5 text-sm font-semibold text-ink">Mind telling us why? <span className="font-normal">(optional)</span></p>
          <div role="radiogroup" aria-label="Why are you leaving?" className="mt-2 flex flex-wrap gap-2">
            {CANCEL_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => setReason(reason === r ? null : r)}
                className={cn("min-h-9 rounded-full border-2 px-3 text-xs font-semibold transition-colors", reason === r ? "border-ink bg-ink text-cream" : "border-ink/20 bg-cream-card text-ink hover:border-ink/50")}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t-2 border-dashed border-ink/15 pt-4">
            <button type="button" disabled={pending} onClick={() => run({ action: "cancel", reason: reason ?? undefined })} className={cn(pill, "border-2 border-ink bg-cream-card text-ink hover:bg-ink hover:text-cream")}>
              Cancel my Snack Club
            </button>
            <button type="button" onClick={() => setConfirmCancel(false)} className={cn(pill, "text-ink-soft hover:text-ink")}>
              Keep my Snack Club
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 border-t-2 border-dashed border-ink/15 pt-4">
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">Ships to:</strong> {card.shipTo ?? "the address from checkout"}
        </p>
        {card.state !== "ended" && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="mt-1 text-sm font-semibold text-ink underline underline-offset-4">
            Change address
          </button>
        )}
        {editing && (
          <form
            className="mt-3 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const get = (k: string) => String(f.get(k) ?? "");
              run({ action: "address", address: { name: get("name"), line1: get("line1"), line2: get("line2"), city: get("city"), state: get("state"), postal_code: get("postal_code") } });
            }}
          >
            <input name="name" required defaultValue={card.address.name} placeholder="Name" aria-label="Name" autoComplete="name" className={cn(field, "sm:col-span-2")} />
            <input name="line1" required defaultValue={card.address.line1} placeholder="Street address" aria-label="Street address" autoComplete="address-line1" className={cn(field, "sm:col-span-2")} />
            <input name="line2" defaultValue={card.address.line2} placeholder="Apt, suite (optional)" aria-label="Apartment or suite" autoComplete="address-line2" className={cn(field, "sm:col-span-2")} />
            <input name="city" required defaultValue={card.address.city} placeholder="City" aria-label="City" autoComplete="address-level2" className={field} />
            <div className="grid grid-cols-2 gap-3">
              <input name="state" required defaultValue={card.address.state} placeholder="State" aria-label="State" maxLength={2} autoComplete="address-level1" className={cn(field, "uppercase")} />
              <input name="postal_code" required defaultValue={card.address.postal_code} placeholder="ZIP" aria-label="ZIP code" inputMode="numeric" autoComplete="postal-code" className={field} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={pending} className={cn(pill, "bg-ink text-cream hover:bg-ink/85")}>Save address</button>
              <button type="button" onClick={() => setEditing(false)} className={cn(pill, "text-ink-soft hover:text-ink")}>Cancel</button>
            </div>
          </form>
        )}
      </div>
      <p role="status" className={cn("mt-3 min-h-5 text-sm font-semibold", result?.ok ? "text-mint-deep" : "text-coral-deep")}>
        {result?.message}
      </p>
    </section>
  );
}
