import { Sticker } from "@/components/wrap";
import { site } from "@/lib/site";

/** The page's close. `open`: at least one box takes orders right now. */
export function PreorderCta({ open }: { open: boolean }) {
  return (
    <section className="paper relative overflow-x-clip bg-coral">
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-16 sm:flex-row sm:items-center sm:justify-between lg:py-20">
        <Sticker tone="butter" className="absolute -top-9 right-5 w-24 rotate-[12deg] sm:w-28">
          <span className="font-label text-sm uppercase leading-tight">
            Ships
            <br />
            free
          </span>
        </Sticker>
        <div>
          <p className="max-w-[18ch] font-display text-headline text-ink">
            Six boxes. Packed by hand.
          </p>
          <p className="mt-3 font-medium text-ink">
            ${site.preorderPriceUSD} · {site.snackCount} snacks · free shipping · {open ? "order now, " : ""}first boxes ship {site.shipDate}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#boxes"
            className="inline-flex h-14 items-center rounded-full bg-ink px-9 text-base font-semibold text-cream transition-colors hover:bg-ink/85"
          >
            Find my box
          </a>
          <a
            href="#gift"
            className="inline-flex h-14 items-center rounded-full border-2 border-ink px-7 text-base font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
          >
            Send a gift
          </a>
        </div>
      </div>
    </section>
  );
}
