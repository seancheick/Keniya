import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { BuyButton } from "@/components/buy-button";
import { JsonLd } from "@/components/json-ld";
import { ReviewerCard } from "@/components/reviewer-card";
import { boxes, type Box } from "@/lib/box";
import { giftLanding, landingFor, landings, type BoxLanding } from "@/lib/landing";
import { breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/lib/schema";
import { site } from "@/lib/site";

const base = site.url.replace(/\/$/, "");

export const promises = [
  "No subscription, no surprise renewal",
  `${site.freeShippingLabel} (US)`,
  `Ships ${site.shipDate}`,
  "Full refund any time before it ships",
];

export function landingMetadata(l: BoxLanding): Metadata {
  const box = boxes.find((b) => b.slug === l.slug)!;
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
      images: [{ url: box.image, width: 1600, height: 1200, alt: box.imageAlt }],
    },
    twitter: { card: "summary_large_image", title: l.title, description: l.description, images: [box.image] },
  };
}

export function Faqs({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <div className="mt-6 divide-y divide-border border-b border-border">
      {faqs.map((f) => (
        <details key={f.q} name="landing-faq" className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-medium text-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180" />
          </summary>
          <p className="max-w-[56ch] pb-4 text-sm leading-relaxed text-ink-soft">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Links to the other product pages, so every landing page is reachable by crawl. */
export function OtherBoxes({ current }: { current?: Box["slug"] | "gifts" }) {
  return (
    <nav aria-label="Other Keniya boxes" className="mt-14 border-t border-border pt-8">
      <p className="text-sm font-semibold text-ink">More from Keniya</p>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {landings
          .filter((l) => l.slug !== current)
          .map((l) => (
            <li key={l.path}>
              <Link href={l.path} className="text-sage-deep underline underline-offset-4 hover:text-ink">
                {boxes.find((b) => b.slug === l.slug)!.name}
              </Link>
            </li>
          ))}
        {current !== "gifts" && (
          <li>
            <Link href={giftLanding.path} className="text-sage-deep underline underline-offset-4 hover:text-ink">
              Send a box as a gift
            </Link>
          </li>
        )}
        <li>
          <Link href="/#boxes" className="text-sage-deep underline underline-offset-4 hover:text-ink">
            Compare all boxes
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function BoxLandingPage({ slug }: { slug: Box["slug"] }) {
  const l = landingFor(slug);
  const box = boxes.find((b) => b.slug === slug)!;
  const url = `${base}${l.path}`;

  return (
    <article className="mx-auto max-w-5xl px-5 py-10 lg:py-16">
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
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <h1 className="font-display text-display text-ink">{l.h1}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">{l.intro}</p>
          <div className="mt-7 rounded-3xl bg-blush/60 p-5 sm:p-6">
            <p className="font-display text-4xl text-ink">
              ${site.preorderPriceUSD}
              <span className="ml-2 font-sans text-sm text-ink-soft">
                {site.snackCount} snacks · only {site.firstRunPerBox} made
              </span>
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <BuyButton box={box} showNote={false} label={`Preorder the ${box.shortName} box`} />
              <BuyButton box={box} gift variant="outline" showNote={false} label="Send as a gift" />
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-ink">
              {promises.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-sage-deep" strokeWidth={2.5} aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
            <Link href="/#gift" className="mt-4 inline-block text-sm font-medium text-ink underline underline-offset-4 hover:text-terracotta-deep">
              Sending it as a gift?
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-cream-deep">
          <Image src={box.image} alt={box.imageAlt} fill priority sizes="(max-width: 1024px) 100vw, 480px" className="object-cover" />
        </div>
      </div>

      <section className="mt-16" aria-labelledby="who">
        <h2 id="who" className="font-display text-3xl text-ink">Who it&rsquo;s for</h2>
        <ul className="mt-4 space-y-2 text-ink-soft">
          {l.forWho.map((w) => (
            <li key={w} className="flex gap-2">
              <CheckIcon className="mt-1 size-4 shrink-0 text-terracotta" strokeWidth={2.5} aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14" aria-labelledby="inside">
        <h2 id="inside" className="font-display text-3xl text-ink">What goes in</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          {site.snackCount}{" "}snacks across these categories. The exact snacks rotate with the season;
          the categories and rules don&rsquo;t. A pack of chews counts as one snack, and small
          extras are free and never counted.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {box.categories.map((cat) => (
            <li key={cat.name} className="flex gap-4 rounded-2xl border border-border bg-cream-card p-4">
              <span className="font-display text-3xl leading-none text-terracotta-deep">{cat.count}×</span>
              <span>
                <strong className="block text-ink">{cat.name}</strong>
                <span className="text-sm text-ink-soft">{l.categoryWhy[cat.name] ?? cat.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14" aria-labelledby="screen">
        <h2 id="screen" className="font-display text-3xl text-ink">How we screen every snack</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {l.screening.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sage-deep text-xs font-semibold text-cream">
                {i + 1}
              </span>
              <span>
                <strong className="block text-ink">{s.title}</strong>
                <span className="text-sm text-ink-soft">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <ReviewerCard className="mt-8" />
        <p className="mt-6 max-w-[65ch] text-sm text-ink-soft">
          Every box includes a <strong className="text-ink">Packed for You</strong> card on what
          this box focuses on and how we choose, and every snack ships sealed with its full label.
        </p>
      </section>

      <section className="mt-14" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-3xl text-ink">Questions about this box</h2>
        <Faqs faqs={l.faqs} />
        <p className="mt-6 max-w-[70ch] text-xs text-ink-soft">
          Keniya picks packaged snacks. It isn&rsquo;t medical advice. Follow your doctor&rsquo;s
          guidance and check each label for allergens.
        </p>
      </section>

      <div className="mt-12 flex flex-col items-start gap-4 rounded-3xl bg-sage-deep p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-2xl text-cream">
          Only {site.firstRunPerBox} {box.name}es in the founding batch.
        </p>
        <BuyButton box={box} showNote={false} className="sm:w-auto" label={`Preorder, $${site.preorderPriceUSD}`} />
      </div>

      <OtherBoxes current={slug} />
    </article>
  );
}
