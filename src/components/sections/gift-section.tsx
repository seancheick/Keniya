import Image from "next/image";
import Link from "next/link";
import { ExampleChip, Sticker, Tissue } from "@/components/wrap";
import { giftImage } from "@/lib/gift-image";
import { giftLanding } from "@/lib/landing";
import { site } from "@/lib/site";

/** Gifting: the buyer is often not the person the box is for. */
export function GiftSection() {
  const img = giftImage();
  return (
    <section aria-labelledby="gift-heading" className="overflow-x-clip">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
        <div className="relative order-2 mx-auto w-full max-w-xl lg:order-1">
          <div className="relative px-3 py-4 sm:px-5 sm:py-6">
            <Tissue colors={["var(--rose)", "var(--sky)", "var(--butter)"]} />
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-cream-deep shadow-[0_24px_40px_-24px_rgb(37_37_37/0.55)]">
              <Image src={img.src} alt={img.alt} fill sizes="(max-width: 1024px) 92vw, 560px" className="object-cover" />
              <ExampleChip />
            </div>
          </div>
          {/* The gift note: the buyer's message is printed and tucked inside. */}
          <div className="absolute -bottom-6 right-0 w-48 rotate-[4deg] rounded-[4px] border-2 border-ink bg-cream-card px-4 pb-3 pt-5 shadow-[0_16px_24px_-16px_rgb(37_37_37/0.7)] sm:-right-4 sm:w-56">
            <span aria-hidden className="absolute left-1/2 top-1.5 size-2.5 -translate-x-1/2 rounded-full border-2 border-ink bg-cream" />
            <p className="font-display text-lg font-bold leading-snug text-ink">
              &ldquo;So proud of you. Enjoy every bite, you deserve it.&rdquo;
            </p>
            <p className="mt-2 text-xs text-ink-soft">Example note. Yours is printed and tucked inside.</p>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <h2 id="gift-heading" className="font-display text-headline text-ink">
            Good snacks make great gifts.
          </h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-ink-soft">
            For someone expecting, someone celebrating, or someone who deserves a little
            something. Pick their box, add a message, and we send it to their door. The receipt
            comes to you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#gift"
              className="inline-flex h-12 items-center rounded-full bg-ink px-8 text-base font-semibold text-cream transition-colors hover:bg-ink/85"
            >
              Send a gift
            </a>
            <Link
              href={giftLanding.path}
              className="inline-flex h-12 items-center rounded-full border-2 border-ink px-6 text-base font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
            >
              How gifting works
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <Sticker tone="coral" className="w-20 shrink-0 rotate-[-10deg]">
              <span className="font-label text-[11px] uppercase leading-tight">
                Ships
                <br />
                free
              </span>
            </Sticker>
            <p className="text-sm text-ink-soft">
              ${site.preorderPriceUSD} · free shipping to their door · ships {site.shipDate}.{" "}
              <Link href="/gifts#hint" className="font-semibold text-ink underline underline-offset-4 hover:text-coral-deep">
                Hoping for one? Send a hint
              </Link>
              {" · "}
              <Link href="/corporate-gifts" className="font-semibold text-ink underline underline-offset-4 hover:text-coral-deep">
                Gifting 10 or more?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
