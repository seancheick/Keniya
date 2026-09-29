import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckIcon } from "lucide-react";
import { BuyButton } from "@/components/buy-button";
import { Faqs, OtherBoxes, promises } from "@/components/box-landing";
import { JsonLd } from "@/components/json-ld";
import { boxes } from "@/lib/box";
import { giftImage } from "@/lib/gift-image";
import { giftLanding, landingFor } from "@/lib/landing";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/schema";
import { site } from "@/lib/site";

const box = boxes.find((b) => b.slug === "pregnancy_comfort")!;
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
  { t: "Choose “It’s a gift”", b: "Pick the Pregnancy Comfort box and switch to gift mode." },
  { t: "Add her address and your note", b: "Checkout asks where to send it and what to write in her guide." },
  { t: "We pack it by hand", b: "Your message is printed in her Packed for You guide." },
  { t: "It ships to her door", b: `Founding boxes ship ${site.shipDate}, free. Your receipt comes to you.` },
];

const faqs = [
  {
    q: "Will she see what I paid?",
    a: "No. Your receipt and order emails go to you, and there's no price in the box.",
  },
  {
    q: "Can I ship it to a different address from mine?",
    a: "Yes. Enter her address at checkout. We ship anywhere in the US for free.",
  },
  {
    q: "When will it arrive?",
    a: `Founding boxes ship ${site.shipDate}. We'll email you tracking when it's on the way.`,
  },
  {
    q: "What if she has allergies or foods she avoids?",
    a: "Every snack ships sealed with its full label. Keniya isn't an allergen-free facility, so if she has a severe allergy, she should check each label.",
  },
  {
    q: "Can I cancel?",
    a: `Yes, any time before it ships, for a full refund. Email ${site.email}.`,
  },
];

export default function GiftPage() {
  const url = `${site.url.replace(/\/$/, "")}${giftLanding.path}`;
  const product = landingFor(box.slug);
  return (
    <article className="mx-auto max-w-5xl px-5 py-10 lg:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [breadcrumbJsonLd(giftLanding.path, "Pregnancy gift box"), faqJsonLd(`${url}#faq`, faqs)],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden>›</span> Pregnancy gift box
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <h1 className="font-display text-display text-ink">
            A pregnancy gift that does the reading for her.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            {site.snackCount}{" "}snacks screened with Keniya Pregnancy Screening, packed by hand, with
            your note printed in her Packed for You guide. Something she&rsquo;ll actually use, for your wife or
            partner, sister, daughter, friend or coworker.
          </p>
          <div className="mt-7 rounded-3xl bg-blush/60 p-5 sm:p-6">
            <p className="font-display text-4xl text-ink">
              ${site.preorderPriceUSD}
              <span className="ml-2 font-sans text-sm text-ink-soft">free shipping to her door</span>
            </p>
            <div className="mt-4">
              <BuyButton box={box} gift showNote={false} label="Send her a box" />
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-ink">
              {promises.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-sage-deep" strokeWidth={2.5} aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-cream-deep">
          <Image src={img.src} alt={img.alt} fill priority sizes="(max-width: 1024px) 100vw, 480px" className="object-cover" />
        </div>
      </div>

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

      <section className="mt-14" aria-labelledby="gets">
        <h2 id="gets" className="font-display text-3xl text-ink">What she gets</h2>
        <ul className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {box.categories.map((c) => (
            <li key={c.name} className="flex gap-3 text-ink-soft">
              <span className="w-7 font-display text-lg text-terracotta-deep">{c.count}×</span>
              <span>
                <strong className="text-ink">{c.name}</strong> · {c.note}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-[65ch] text-sm text-ink-soft">
          Plus her Packed for You guide, with your message and a line on why each snack is there.{" "}
          <Link href={product.path} className="font-medium text-sage-deep underline underline-offset-4 hover:text-ink">
            See how we screen for pregnancy
          </Link>
          .
        </p>
      </section>

      <section className="mt-14" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-3xl text-ink">Gift questions</h2>
        <Faqs faqs={faqs} />
      </section>

      <p className="mt-10 max-w-[60ch] text-sm text-ink-soft">
        Shopping for someone watching blood sugar or heart health?{" "}
        <Link href="/#gift" className="font-medium text-sage-deep underline underline-offset-4 hover:text-ink">
          Any box can be sent as a gift
        </Link>
        .
      </p>

      <OtherBoxes />
    </article>
  );
}
