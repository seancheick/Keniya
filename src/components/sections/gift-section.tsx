import Image from "next/image";
import Link from "next/link";
import { giftImage } from "@/lib/gift-image";
import { giftLanding } from "@/lib/landing";
import { site } from "@/lib/site";

const forWhom = ["wife or partner", "sister", "daughter", "friend", "coworker"];

/** Lifestyle + gifting: the buyer is often not the person who's pregnant. */
export function GiftSection() {
  const img = giftImage();
  return (
    <section aria-labelledby="gift-heading" className="overflow-x-clip border-b border-border">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 lg:grid-cols-2 lg:gap-14 lg:py-20">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-blush" data-reveal="left">
          <Image
            src={img.src}
            alt={img.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 560px"
            className="object-cover"
          />
        </div>
        <div data-reveal="right">
          <p className="eyebrow">For someone you love</p>
          <h2 id="gift-heading" className="font-display text-headline mt-4 text-ink">
            She&rsquo;s growing a whole human. Send something she&rsquo;ll actually use.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            {site.snackCount} snacks screened with Keniya Pregnancy Screening, your note printed in
            her Packed for You guide, and free shipping to her door. The receipt comes to you.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Who people send it to">
            {forWhom.map((w) => (
              <li key={w} className="rounded-full border border-border bg-cream-card px-3 py-1 text-sm text-ink-soft">
                For your {w}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <a
              href="#gift-pregnancy"
              className="inline-flex h-12 items-center rounded-full bg-terracotta-deep px-8 text-base font-semibold text-cream transition-colors hover:bg-ink"
            >
              Send her a box, ${site.preorderPriceUSD}
            </a>
            <Link
              href={giftLanding.path}
              className="text-sm font-medium text-sage-deep underline underline-offset-4 hover:text-ink"
            >
              How gifting works
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
