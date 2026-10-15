import { loadPublicCatalog } from "@/lib/public-sales";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckIcon } from "lucide-react";
import { BoxVisual } from "@/components/box-visual";
import { BuyButton } from "@/components/buy-button";
import { Faqs, OtherBoxes, promises } from "@/components/box-landing";
import { JsonLd } from "@/components/json-ld";
import { SendHint } from "@/components/send-hint";
import { WelcomeOffer } from "@/components/welcome-offer";
import { ExampleChip, Sticker, Tissue } from "@/components/wrap";
import { giftImage } from "@/lib/gift-image";
import { giftLanding, landingFor } from "@/lib/landing";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/schema";
import { site } from "@/lib/site";
import { socialImage } from "@/lib/social";

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
    images: [socialImage("gifts")],
  },
  twitter: {
    card: "summary_large_image",
    title: giftLanding.title,
    description: giftLanding.description,
    images: [socialImage("gifts")],
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

// Box copy comes from the live box rules.
export const revalidate = 3600;

export default async function GiftPage() {
  const { boxes, offers } = await loadPublicCatalog();
  const url = `${site.url.replace(/\/$/, "")}${giftLanding.path}`;
  return (
    <article className="mx-auto max-w-6xl px-5 py-10 lg:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [breadcrumbJsonLd(giftLanding.path, "Gifts"), faqJsonLd(`${url}#faq`, faqs)],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden>›</span> Gifts
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14">
        <div>
          <h1 className="font-display text-display text-ink">
            Good snacks make great gifts<span className="text-coral-deep">.</span>
          </h1>
          <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-ink-soft">
            For someone expecting, someone managing diabetes, someone eating for their heart, or
            someone who deserves a little something. {site.snackCount} snacks picked for their box,
            packed by hand, with your note inside and free shipping to their door.
          </p>
          <ul className="mt-6 space-y-1.5 text-sm text-ink">
            {promises.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <CheckIcon className="size-4 text-mint-deep" strokeWidth={2.5} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="relative px-3 py-4 sm:px-5 sm:py-6">
            <Tissue colors={["var(--rose)", "var(--sky)", "var(--butter)"]} />
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-cream-deep shadow-[0_24px_40px_-24px_rgb(37_37_37/0.55)]">
              <Image src={img.src} alt={img.alt} fill priority sizes="(max-width: 1024px) 92vw, 540px" className="object-cover" />
              <ExampleChip />
            </div>
          </div>
        </div>
      </div>

      <section className="mt-16 lg:mt-24" aria-labelledby="choose">
        <h2 id="choose" className="font-display text-headline text-ink">Choose their box</h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {boxes.map((b) => (
            <li
              key={b.slug}
              data-colorway={b.colorway}
              className="paper flex flex-col rounded-[6px] bg-tissue p-3 shadow-[0_14px_24px_-20px_rgb(37_37_37/0.7)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-[3px] bg-cream-deep">
                <BoxVisual box={b} sizes="(max-width: 768px) 92vw, 360px" />
              </div>
              <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-ink">{b.name.replace(/ Box$/, "")}</h3>
                  <span className="font-display text-2xl font-extrabold leading-tight text-ink">${site.preorderPriceUSD}</span>
                </div>
                <p className="mt-1 text-sm text-tissue-ink">{b.tagline}</p>
                {b.caution && <p className="mt-1.5 text-xs font-bold text-ink">{b.caution}</p>}
                <Link
                  href={landingFor(b.slug).path}
                  className="mt-3 self-start text-sm font-semibold text-ink underline underline-offset-4"
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

      <section className="mt-16 lg:mt-24" aria-labelledby="how">
        <h2 id="how" className="font-display text-headline text-ink">How gifting works</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.t} className="flex gap-4 lg:flex-col">
              <Sticker
                tone="cream"
                className="w-14 shrink-0"
                style={{ backgroundColor: ["var(--rose)", "var(--butter)", "var(--sky)", "var(--mint)"][i], rotate: `${[-8, 6, -4, 7][i]}deg` }}
              >
                <span className="font-label text-2xl leading-none">{i + 1}</span>
              </Sticker>
              <span>
                <strong className="block text-lg leading-snug text-ink">{s.t}</strong>
                <span className="mt-1 block leading-relaxed text-ink-soft">{s.b}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 grid gap-8 lg:mt-24 lg:grid-cols-2" aria-label="Hints and team gifts">
        <SendHint id="hint" boxes={boxes.map(({ slug, name, shortName, colorway }) => ({ slug, name, shortName, colorway }))} />
        <div className="paper flex flex-col justify-between rounded-[6px] bg-butter p-5 sm:p-6">
          <div>
            <p className="font-display text-2xl font-extrabold tracking-tight text-ink">Gifting for a team?</p>
            <p className="mt-1.5 max-w-[44ch] text-ink">
              Welcome packages, parental-leave gifts, milestones: send 10 or more boxes and let each
              person choose the box that fits them.
            </p>
          </div>
          <Link
            href="/corporate-gifts"
            className="mt-6 inline-flex h-12 items-center self-start rounded-full bg-ink px-6 text-sm font-semibold text-cream transition-colors hover:bg-ink/85"
          >
            Corporate &amp; team gifts
          </Link>
        </div>
      </section>

      <section className="mt-16 max-w-3xl lg:mt-24" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-headline text-ink">Gift questions</h2>
        <Faqs faqs={faqs} />
      </section>

      <OtherBoxes current="gifts" />
      {offers.welcome && <WelcomeOffer offer={offers.welcome} />}
    </article>
  );
}
