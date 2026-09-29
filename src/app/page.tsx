import { Hero } from "@/components/sections/hero";
import { TrustStrip } from "@/components/sections/trust-strip";
import { Shop } from "@/components/sections/shop";
import { HowWePick } from "@/components/sections/how-we-pick";
import { Faq } from "@/components/sections/faq";
import { PreorderCta } from "@/components/sections/preorder-cta";
import { StickyBuyBar } from "@/components/sticky-buy-bar";
import { JsonLd } from "@/components/json-ld";
import { faqs } from "@/components/sections/faq";
import { boxes } from "@/lib/box";
import { site } from "@/lib/site";
import { faqJsonLd, productJsonLd } from "@/lib/schema";
import { GiftSection } from "@/components/sections/gift-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Built from the same data the page renders, so markup can't drift from visible content.
// Product @ids point at each box's landing page, the canonical home for that product.
const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [...boxes.map(productJsonLd), faqJsonLd(`${site.url}/#faq`, faqs)],
};

export default function Home() {
  return (
    <>
      <JsonLd data={homeJsonLd} />
      <Hero />
      <TrustStrip />
      <GiftSection />
      <Shop />
      <HowWePick />
      <Faq />
      <PreorderCta />
      <StickyBuyBar />
    </>
  );
}
