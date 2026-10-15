"use client";

import { useState } from "react";
import { CheckIcon, LinkIcon, MailIcon, MessageCircleIcon } from "lucide-react";
import type { Box } from "@/lib/box";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * "Send a hint": the person who'd love a box shares a link that opens it in gift mode
 * (/#gift-<slug>, which the shop already understands). Nothing personal rides in the URL,
 * and nothing is sent by us: the visitor's own share sheet, email or messages app does it.
 */
export function SendHint({ boxes, className, id }: { boxes: Pick<Box, "slug" | "name" | "shortName" | "colorway">[]; className?: string; id?: string }) {
  const [slug, setSlug] = useState(boxes[0].slug);
  const [copied, setCopied] = useState(false);
  const box = boxes.find((b) => b.slug === slug) ?? boxes[0];
  const url = `${site.url.replace(/\/$/, "")}/#gift-${box.slug}`;
  const text = `Hint, hint: I'd love the ${box.name} from Keniya. ${site.snackCount} snacks, picked with care.`;

  async function share() {
    setCopied(false);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${box.name} · Keniya`, text, url });
        return;
      } catch (err) {
        // Closing the share sheet is not an error worth showing; fall through to copy otherwise.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div id={id} className={cn("scroll-mt-24 rounded-[6px] border-2 border-ink bg-cream-card p-5 sm:p-6", className)}>
      <p className="font-display text-2xl font-extrabold tracking-tight text-ink">Hoping someone sends you one?</p>
      <p className="mt-1.5 text-ink-soft">Pick the box you&rsquo;d love and send a hint. The link opens it ready to gift.</p>
      <div role="radiogroup" aria-label="Box to hint at" className="mt-4 flex flex-wrap gap-2">
        {boxes.map((b) => (
          <button
            key={b.slug}
            type="button"
            role="radio"
            aria-checked={b.slug === slug}
            data-colorway={b.colorway}
            onClick={() => {
              setSlug(b.slug);
              setCopied(false);
            }}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              b.slug === slug ? "border-ink bg-tissue text-ink" : "border-ink/15 text-ink-soft hover:border-ink/40 hover:text-ink",
            )}
          >
            <span aria-hidden className="size-2.5 rounded-full bg-tissue ring-1 ring-ink/25" />
            {b.shortName}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={share}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-cream transition-colors hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {copied ? <CheckIcon className="size-4" aria-hidden /> : <LinkIcon className="size-4" aria-hidden />}
          {copied ? "Link copied" : "Send a hint"}
        </button>
        <a
          href={`mailto:?subject=${encodeURIComponent(`A little hint: the ${box.name}`)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`}
          className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-ink px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          <MailIcon className="size-4" aria-hidden />
          Email it
        </a>
        <a
          href={`sms:?&body=${encodeURIComponent(`${text} ${url}`)}`}
          className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-ink px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          <MessageCircleIcon className="size-4" aria-hidden />
          Text it
        </a>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-mint-deep">
        {copied ? "Paste it anywhere: a text, an email, the group chat." : ""}
      </p>
    </div>
  );
}
