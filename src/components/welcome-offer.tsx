"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckIcon, CopyIcon, XIcon } from "lucide-react";
import { claimWelcomeOffer } from "@/actions/offers";
import { Sticker, Tissue } from "@/components/wrap";
import { OPEN_WELCOME, readWelcome, writeWelcome } from "@/lib/welcome-client";
import type { PublicOffers } from "@/lib/public-sales";
import { site } from "@/lib/site";

const DAY = 86_400_000;
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * The WELCOME20 card. It waits until the visitor is clearly browsing (a scroll past the first
 * screen and a few seconds), slides up in a corner without blocking the page, and never comes
 * back once claimed or dismissed (dismissal rests for two weeks). The buy panel can reopen it.
 */
export function WelcomeOffer({ offer }: { offer: NonNullable<PublicOffers["welcome"]> }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"ask" | "revealed" | "note">("ask");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [emailed, setEmailed] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const reopen = () => {
      const s = readWelcome();
      setPhase(s?.status === "claimed" ? "revealed" : "ask");
      if (s?.status === "claimed") setEmail(s.email);
      setOpen(true);
      requestAnimationFrame(() => input.current?.focus());
    };
    window.addEventListener(OPEN_WELCOME, reopen);

    const s = readWelcome();
    const quiet = s?.status === "claimed" || s?.status === "ineligible" || (s?.status === "dismissed" && s.until > Date.now());
    if (quiet) return () => window.removeEventListener(OPEN_WELCOME, reopen);

    // Browsing, not bouncing: past the first screen, and at least 6 s on the page.
    const born = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.9) return;
      window.removeEventListener("scroll", onScroll);
      timer = setTimeout(() => setOpen(true), Math.max(0, 6000 - (Date.now() - born)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener(OPEN_WELCOME, reopen);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    setOpen(false);
    if (phase === "ask") writeWelcome({ status: "dismissed", until: Date.now() + 14 * DAY });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await claimWelcomeOffer({ email });
      if (!res.ok) return setError(res.message);
      if (!res.eligible) {
        writeWelcome({ status: "ineligible" });
        setNote(res.message);
        return setPhase("note");
      }
      writeWelcome({ status: "claimed", email: res.email, code: res.code, priceCents: res.priceCents });
      setEmail(res.email);
      setEmailed(res.emailed);
      setPhase("revealed");
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="welcome-title"
      className="fixed inset-x-4 bottom-24 z-[60] md:inset-x-auto md:bottom-6 md:left-6 md:w-[23rem]"
    >
      <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-700 ease-[var(--ease-soft)]">
        <Tissue colors={["var(--lilac)", "var(--butter)"]} className="welcome-tissue" />
        <div className="relative rounded-[6px] border-2 border-ink bg-cream-card p-4 pr-5 shadow-[0_28px_50px_-24px_rgb(37_37_37/0.7)] sm:p-5 sm:pr-6">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute left-2 top-2 grid size-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-cream-deep hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
          <Sticker
            tone="coral"
            className="absolute -right-4 -top-6 w-[4.5rem] rotate-12 animate-in zoom-in-50 spin-in-12 fill-mode-both delay-300 duration-500 sm:-right-5 sm:-top-7 sm:w-[5.5rem]"
          >
            <span className="font-label block text-xl leading-[0.85] sm:text-2xl">
              {offer.percentOff}%
              <span className="block text-sm uppercase tracking-wide">off</span>
            </span>
          </Sticker>

          {phase === "ask" && (
            <form onSubmit={submit} className="pt-5 sm:pt-6">
              <p id="welcome-title" className="pr-10 font-display text-[1.45rem] font-extrabold leading-[1.02] tracking-tight text-balance text-ink sm:text-[1.7rem]">
                Your first box, {offer.percentOff}% off.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft sm:text-sm">
                Join the Keniya list and unwrap a code: your first box is{" "}
                <strong className="text-ink">{money(offer.priceCents)}</strong> instead of ${site.preorderPriceUSD}. Free
                shipping, no subscription.
              </p>
              <div className="mt-3 flex gap-2 sm:mt-4">
                <input
                  ref={input}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  aria-label="Email address"
                  autoComplete="email"
                  aria-invalid={error ? true : undefined}
                  className="h-12 min-w-0 flex-1 rounded-full border-2 border-ink/20 bg-cream px-4 text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-ink focus-visible:ring-[3px] focus-visible:ring-ring/40"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="h-12 shrink-0 rounded-full bg-ink px-5 text-sm font-semibold text-cream transition-colors hover:bg-ink/85 disabled:opacity-60"
                >
                  {pending ? "Checking…" : "Unwrap"}
                </button>
              </div>
              <p role="alert" className="mt-2 min-h-5 text-sm font-semibold text-coral-deep">
                {error}
              </p>
              <p className="text-xs text-ink-soft">One code per email, first order only. Unsubscribe anytime.</p>
            </form>
          )}

          {phase === "revealed" && (
            <div className="pt-6" aria-live="polite">
              <p id="welcome-title" className="font-display text-[1.7rem] font-extrabold leading-[1.02] tracking-tight text-ink">
                It&rsquo;s yours.
              </p>
              <div className="paper mt-3 flex items-center justify-between gap-3 rounded-[4px] border-2 border-dashed border-ink bg-butter px-4 py-3">
                <span className="font-label text-3xl leading-none tracking-[0.06em] text-ink" aria-label={offer.code}>
                  {offer.code.split("").map((ch, i) => (
                    <span key={i} aria-hidden className="inline-block animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-500" style={{ animationDelay: `${120 + i * 45}ms` }}>
                      {ch}
                    </span>
                  ))}
                </span>
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border-2 border-ink px-3 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
                >
                  {copied ? <CheckIcon className="size-3.5" aria-hidden /> : <CopyIcon className="size-3.5" aria-hidden />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Saved for checkout: your first box is <strong className="text-ink">{money(offer.priceCents)}</strong> when
                you order with <strong className="break-all text-ink">{email}</strong>.
                {emailed ? " We emailed it to you too." : ""}
              </p>
              <Link
                href="/#boxes"
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-cream transition-colors hover:bg-ink/85"
              >
                Find my box
              </Link>
            </div>
          )}

          {phase === "note" && (
            <div className="pt-6" aria-live="polite">
              <p id="welcome-title" className="font-display text-[1.7rem] font-extrabold leading-[1.02] tracking-tight text-ink">
                You&rsquo;re on the list.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{note}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex h-11 items-center rounded-full border-2 border-ink px-6 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
              >
                Keep browsing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
