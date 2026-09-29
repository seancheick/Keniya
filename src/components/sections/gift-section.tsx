import Image from "next/image";
import Link from "next/link";
import { giftImage } from "@/lib/gift-image";
import { giftLanding } from "@/lib/landing";
import { site } from "@/lib/site";

/** Gifting: the buyer is often not the person the box is for. */
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
          <h2 id="gift-heading" className="font-display text-headline text-ink">
            A thoughtful box, for someone you care about.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Choose their box, add a message, and we send it to their door. Pregnancy, carb
            conscious or heart: any box can be a gift. Your note is printed and tucked inside,
            and the receipt comes to you.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#gift"
              className="inline-flex h-12 items-center rounded-full bg-terracotta-deep px-8 text-base font-semibold text-cream transition-colors hover:bg-ink"
            >
              Choose a gift
            </a>
            <Link
              href={giftLanding.path}
              className="inline-flex h-12 items-center rounded-full border-2 border-ink/80 px-6 text-base font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
            >
              How gifting works
            </Link>
          </div>
          <p className="mt-5 text-sm text-ink-soft">
            ${site.preorderPriceUSD} · free shipping to their door · ships {site.shipDate}
          </p>
        </div>
      </div>
    </section>
  );
}
