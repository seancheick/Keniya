import { loadPublicCatalog } from "@/lib/public-sales";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { BoxVisual } from "@/components/box-visual";
import { BuyButton } from "@/components/buy-button";
import { JsonLd } from "@/components/json-ld";
import { Purchase } from "@/components/purchase";
import { WelcomeOffer } from "@/components/welcome-offer";
import { ReviewerCard } from "@/components/reviewer-card";
import { SnackFacts } from "@/components/snack-facts";
import { Sticker, Tissue } from "@/components/wrap";
import { boxes, saleCopy, type Box } from "@/lib/box";
import { giftLanding, landings } from "@/lib/landing";
import { publicLanding } from "@/lib/public-rules";
import { breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/lib/schema";
import { site } from "@/lib/site";
import { socialImage } from "@/lib/social";
import { publicStandards } from "@/lib/standards";

const base = site.url.replace(/\/$/, "");

export const promises = [
  "One-time purchase or optional monthly delivery",
  `${site.freeShippingLabel} (US)`,
  `First boxes ship ${site.shipDate}`,
  "Full refund any time before it ships",
];

/** Metadata from the filled landing copy; pages call this from generateMetadata. */
export async function landingMetadata(slug: Box["slug"]): Promise<Metadata> {
  const l = publicLanding(slug, (await loadPublicCatalog()).rules);
  return {
    title: l.title,
    description: l.description,
    alternates: { canonical: l.path },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: site.name,
      url: l.path,
      title: l.title,
      description: l.description,
      images: [socialImage(slug)],
    },
    twitter: { card: "summary_large_image", title: l.title, description: l.description, images: [socialImage(slug)] },
  };
}

export function Faqs({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <div className="mt-6 divide-y-2 divide-ink/10 border-y-2 border-ink">
      {faqs.map((f) => (
        <details key={f.q} name="landing-faq" className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180" />
          </summary>
          <p className="max-w-[62ch] pb-5 leading-relaxed text-ink-soft">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Links to the other product pages, so every landing page is reachable by crawl. */
export function OtherBoxes({ current }: { current?: Box["slug"] | "gifts" }) {
  return (
    <nav aria-label="Other Keniya boxes" className="mt-16 border-t-2 border-ink pt-8">
      <p className="text-sm font-semibold text-ink">More from Keniya</p>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {landings
          .filter((l) => l.slug !== current)
          .map((l) => (
            <li key={l.path}>
              <Link href={l.path} className="font-medium text-ink underline underline-offset-4 hover:text-coral-deep">
                {boxes.find((b) => b.slug === l.slug)!.name}
              </Link>
            </li>
          ))}
        {current !== "gifts" && (
          <li>
            <Link href={giftLanding.path} className="font-medium text-ink underline underline-offset-4 hover:text-coral-deep">
              Send a box as a gift
            </Link>
          </li>
        )}
        <li>
          <Link href="/#boxes" className="font-medium text-ink underline underline-offset-4 hover:text-coral-deep">
            Compare all boxes
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export async function BoxLandingPage({ slug }: { slug: Box["slug"] }) {
  const { rules, boxes: liveBoxes, offers } = await loadPublicCatalog();
  const l = publicLanding(slug, rules);
  const box = liveBoxes.find((b) => b.slug === slug)!;
  const url = `${base}${l.path}`;

  const standards = publicStandards(slug, rules);
  const status = saleCopy(box, site.shipDate).line;

  return (
    <article data-colorway={box.colorway} className="mx-auto max-w-6xl px-5 py-10 lg:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [productJsonLd(box), breadcrumbJsonLd(l.path, box.name), faqJsonLd(`${url}#faq`, l.faqs)],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden>›</span> {box.name}
      </nav>

      {/* Hero: what it is + buy, above the fold */}
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14">
        <div>
          <h1 className="font-display text-headline text-ink">{l.h1}</h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-ink-soft">{l.intro}</p>
          <div className="relative mt-8 rounded-[6px] border-2 border-ink bg-cream-card p-5 pt-7 shadow-[0_18px_30px_-22px_rgb(37_37_37/0.6)] sm:p-6 sm:pt-8">
            <span aria-hidden className="absolute left-1/2 top-2.5 size-3.5 -translate-x-1/2 rounded-full border-2 border-ink bg-cream" />
            <Purchase box={box} offers={offers} status={status} />
            <ul className="mt-4 space-y-1.5 text-sm text-ink">
              {promises.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-mint-deep" strokeWidth={2.5} aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="relative px-3 py-4 sm:px-5 sm:py-6">
            <Tissue colors={["var(--butter)", "var(--cream-deep)", "var(--tissue)"]} />
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-cream-deep shadow-[0_24px_40px_-24px_rgb(37_37_37/0.55)]">
              <BoxVisual box={box} priority sizes="(max-width: 1024px) 92vw, 540px" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <section aria-labelledby="who">
          <h2 id="who" className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Who it&rsquo;s for</h2>
          <ul className="mt-5 space-y-3 text-lg text-ink-soft">
            {l.forWho.map((w) => (
              <li key={w} className="flex gap-3">
                <span aria-hidden className="mt-2 size-3 shrink-0 rounded-full bg-tissue ring-2 ring-ink" />
                {w}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-[52ch] text-ink-soft">
            {site.snackCount} snacks across the categories on the label. The photo shows an example box: exact
            snacks rotate with the season; the categories and rules don&rsquo;t. A pack of chews counts as one
            snack, and small extras are free and never counted.
          </p>
        </section>
        <section aria-label={`${box.name} Snack Facts`}>
          <SnackFacts box={box} standards={standards} headingLevel="h2" />
        </section>
      </div>

      <section className="mt-16 lg:mt-24" aria-labelledby="screen">
        <h2 id="screen" className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">How we screen every snack</h2>
        <ol className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {l.screening.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <Sticker tone="tissue" className="w-11 shrink-0" style={{ rotate: `${i % 2 ? 6 : -6}deg` }}>
                <span className="font-label text-lg leading-none">{i + 1}</span>
              </Sticker>
              <span>
                <strong className="block text-lg leading-snug text-ink">{s.title}</strong>
                <span className="mt-1 block leading-relaxed text-ink-soft">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <ReviewerCard className="mt-10" />
        <p className="mt-6 max-w-[65ch] text-sm text-ink-soft">
          Every box includes a <strong className="text-ink">Packed for You</strong> card on what
          this box focuses on and how we choose, and every snack ships sealed with its full label.
          These are Keniya curation standards, informed by published guidance; they aren&rsquo;t
          medical cutoffs and this isn&rsquo;t medical advice.
        </p>
      </section>

      <section className="mt-16 max-w-3xl lg:mt-24" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Questions about this box</h2>
        <Faqs faqs={l.faqs} />
        <p className="mt-6 max-w-[70ch] text-xs text-ink-soft">
          Keniya picks packaged snacks. It isn&rsquo;t medical advice. Follow your doctor&rsquo;s
          guidance and check each label for allergens.
        </p>
      </section>

      <div className="paper mt-14 flex flex-col items-start gap-5 rounded-[6px] bg-tissue p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="font-display text-3xl font-extrabold tracking-tight text-ink">{box.name}</p>
          <p className="mt-1 font-semibold text-tissue-ink">{status}</p>
        </div>
        <BuyButton box={box} showNote={false} className="sm:w-auto" label={`Buy once, $${site.preorderPriceUSD}`} />
      </div>

      <OtherBoxes current={slug} />
      {offers.welcome && <WelcomeOffer offer={offers.welcome} />}
    </article>
  );
}
