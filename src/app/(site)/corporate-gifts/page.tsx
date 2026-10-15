import Link from "next/link";
import { Baby, Gift, PartyPopper, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { CorporateForm } from "@/components/corporate-form";
import { Sticker } from "@/components/wrap";
import { boxes } from "@/lib/box";
import { site } from "@/lib/site";
import { socialImage } from "@/lib/social";

const title = "Corporate & Team Snack Gifts";
const description = `Thoughtful snack boxes for teams: welcome packages, parental-leave gifts and milestones. ${site.corporateMinBoxes}+ boxes, each person picks the box that fits them.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/corporate-gifts" },
  openGraph: { type: "website", locale: "en_US", siteName: site.name, url: "/corporate-gifts", title, description, images: [socialImage("corporate")] },
  twitter: { card: "summary_large_image", title, description, images: [socialImage("corporate")] },
};

const occasions: { t: string; b: string; Icon: LucideIcon }[] = [
  { t: "Parental leave", b: "A Pregnancy, Postpartum or Gestational Diabetes box for someone expecting or just home.", Icon: Baby },
  { t: "Welcome packages", b: "A box for new teammates, sent to their door.", Icon: Gift },
  { t: "Milestones and thank-yous", b: "Work anniversaries, launches, or a hard quarter done.", Icon: PartyPopper },
];

export default function CorporateGiftsPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-10 lg:py-16">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden>›</span> Corporate &amp; team gifts
      </nav>

      <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div>
          <h1 className="font-display text-headline text-ink">
            Team gifts people actually want to open<span className="text-coral-deep">.</span>
          </h1>
          <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-ink-soft">
            Send {site.corporateMinBoxes} or more Keniya boxes. Each one is {site.snackCount} snacks picked
            to its own standards, packed by hand and shipped free in the US.
          </p>

          <ul className="mt-10 space-y-6">
            {occasions.map((o, i) => (
              <li key={o.t} className="flex gap-4">
                <Sticker
                  tone="cream"
                  className="w-12 shrink-0"
                  style={{ backgroundColor: ["var(--rose)", "var(--sky)", "var(--butter)"][i], rotate: `${[-6, 5, -3][i]}deg` }}
                >
                  <o.Icon className="size-5 text-ink" strokeWidth={2} aria-hidden />
                </Sticker>
                <span>
                  <strong className="block text-lg text-ink">{o.t}</strong>
                  <span className="mt-0.5 block text-ink-soft">{o.b}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="paper mt-10 rounded-[6px] bg-butter p-5">
            <p className="font-bold text-ink">Health boxes stay private.</p>
            <p className="mt-1 text-ink">
              For the {boxes.find((b) => b.slug === "blood_sugar")!.shortName}, Heart and GLP-1 boxes, we
              never ask you to pick for someone by health condition. Each recipient chooses the box that
              fits them.
            </p>
          </div>
        </div>

        <div className="self-start rounded-[6px] border-2 border-ink bg-cream-card p-5 shadow-[0_18px_30px_-22px_rgb(37_37_37/0.6)] sm:p-7">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">Request a quote</h2>
          <p className="mt-1.5 mb-6 text-ink-soft">
            Team pricing is quoted by hand. We reply within two business days, and nothing is charged
            until you approve a quote.
          </p>
          <CorporateForm min={site.corporateMinBoxes} />
        </div>
      </div>
    </article>
  );
}
