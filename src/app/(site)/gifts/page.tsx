import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckIcon } from "lucide-react";
import { BoxVisual } from "@/components/box-visual";
import { BuyButton } from "@/components/buy-button";
import { Faqs, OtherBoxes, promises } from "@/components/box-landing";
import { JsonLd } from "@/components/json-ld";
import { boxes } from "@/lib/box";
import { giftImage } from "@/lib/gift-image";
import { giftLanding, landingFor } from "@/lib/landing";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/schema";
import { site } from "@/lib/site";

const img = giftImage();

export const metadata: Metadata = {
  title: giftLanding.title,
  description: giftLanding.description,
  alternates: { canonical: giftLanding.path },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: site.name,
    url: giftLanding.path,
    title: giftLanding.title,
    description: giftLanding.description,
    images: [{ url: img.src, width: img.width, height: img.height, alt: img.alt }],
  },
  twitter: {
    card: "summary_large_image",
    title: giftLanding.title,
    description: giftLanding.description,
    images: [img.src],
  },
};

const steps = [
  { t: "Choose their box", b: "Pregnancy, postpartum, blood sugar, heart, gestational diabetes or GLP-1. Each one is screened to its own standards." },
  { t: "Add their address and a note", b: "Checkout asks where to send it and what to write." },
  { t: "We pack it by hand", b: "Your message is printed on a note inside, next to their Packed for You card." },
  { t: "It ships to their door", b: `Founding boxes ship ${site.shipDate}, free. Your receipt comes to you.` },
];

const faqs = [
  {
    q: "Will they see what I paid?",
    a: "No. Your receipt and order emails go to you, and there's no price in the box.",
  },
  {
    q: "Can I ship it to a different address from mine?",
    a: "Yes. Enter their address at checkout. We ship anywhere in the US for free.",
  },
  {
    q: "When will it arrive?",
    a: `Founding boxes ship ${site.shipDate}. We'll email you tracking when it's on the way.`,
  },
  {
    q: "What if they have allergies or foods they avoid?",
    a: "Tell us at checkout and we'll pack around them where we can. Every snack ships sealed with its full label. Keniya isn't an allergen-free facility, so with a severe allergy they should check each label.",
  },
  {
    q: "Which box makes a good pregnancy gift?",
    a: "The Pregnancy Comfort box. Every snack passes Keniya Pregnancy Screening: fully cooked or pasteurized, caffeine checked, and herbs and botanicals left out when pregnancy safety is uncertain.",
  },
  {
    q: "Can I cancel?",
    a: `Yes, any time before it ships, for a full refund. Email ${site.email}.`,
  },
];

export default function GiftPage() {
  const url = `${site.url.replace(/\/$/, "")}${giftLanding.path}`;
  return (
    <article className="mx-auto max-w-5xl px-5 py-10 lg:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [breadcrumbJsonLd(giftLanding.path, "Gifts"), faqJsonLd(`${url}#faq`, faqs)],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden>›</span> Gifts
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <h1 className="font-display text-display text-ink">
            A snack box gift that already read the labels.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            For a pregnancy, someone managing diabetes, or someone eating for their heart.{" "}
            {site.snackCount} screened snacks, packed by hand, with your note inside and free
            shipping to their door.
          </p>
          <ul className="mt-6 space-y-1.5 text-sm text-ink">
            {promises.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <CheckIcon className="size-4 text-sage-deep" strokeWidth={2.5} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-cream-deep">
          <Image src={img.src} alt={img.alt} fill priority sizes="(max-width: 1024px) 100vw, 480px" className="object-cover" />
        </div>
      </div>

      <section className="mt-14" aria-labelledby="choose">
        <h2 id="choose" className="font-display text-3xl text-ink">Choose their box</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {boxes.map((b) => (
            <li key={b.slug} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-cream-card">
              <div className="relative aspect-[16/10] bg-cream-deep">
                <BoxVisual box={b} sizes="(max-width: 768px) 100vw, 320px" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-2xl text-ink">{b.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{b.why}</p>
                {b.caution && <p className="mt-1.5 text-xs font-semibold text-blush-ink">{b.caution}</p>}
                <Link
                  href={landingFor(b.slug).path}
                  className="mt-3 text-sm font-medium text-sage-deep underline underline-offset-4 hover:text-ink"
                >
                  What goes in
                </Link>
                <div className="mt-auto pt-5">
                  <BuyButton
                    box={b}
                    gift
                    showNote={false}
                    className="max-w-none [&>button]:w-full"
                    label={`Send this box, $${site.preorderPriceUSD}`}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16" aria-labelledby="how">
        <h2 id="how" className="font-display text-3xl text-ink">How gifting works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-border bg-cream-card p-5">
              <span className="font-display text-3xl text-terracotta-deep">{i + 1}</span>
              <strong className="mt-2 block text-ink">{s.t}</strong>
              <span className="mt-1 block text-sm text-ink-soft">{s.b}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-3xl text-ink">Gift questions</h2>
        <Faqs faqs={faqs} />
      </section>

      <OtherBoxes current="gifts" />
    </article>
  );
}
