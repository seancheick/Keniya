import { site } from "@/lib/site";

export function PreorderCta() {
  return (
    <section className="bg-sage-deep">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-5 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-3xl text-cream">
            Small founding runs. Six boxes.
          </p>
          <p className="mt-1 text-cream">
            ${site.preorderPriceUSD} · ships {site.shipDate}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="#boxes"
            className="inline-flex h-12 items-center rounded-full bg-terracotta-deep px-8 text-base font-semibold text-cream transition-colors hover:bg-ink"
          >
            Choose your box
          </a>
          <a
            href="#gift"
            className="inline-flex h-12 items-center rounded-full border border-cream/50 px-6 text-base font-medium text-cream transition-colors hover:bg-cream/10"
          >
            Send a gift
          </a>
        </div>
      </div>
    </section>
  );
}
