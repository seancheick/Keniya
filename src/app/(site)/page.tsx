import { Hero } from "@/components/sections/hero";
import { TrustStrip } from "@/components/sections/trust-strip";
import { Shop } from "@/components/sections/shop";
import { Screening, TrustStory } from "@/components/sections/how-we-pick";
import { Faq } from "@/components/sections/faq";
import { PreorderCta } from "@/components/sections/preorder-cta";
import { StickyBuyBar } from "@/components/sticky-buy-bar";
import { JsonLd } from "@/components/json-ld";
import { faqs } from "@/components/sections/faq";
import { loadPublicRules, publicBoxes } from "@/lib/public-rules";
import { site } from "@/lib/site";
import { faqJsonLd, productJsonLd } from "@/lib/schema";
import { standardsForAll } from "@/lib/standards";
import { GiftSection } from "@/components/sections/gift-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// The numbers on this page come from the live box rules; a rule save in the admin
// revalidates it, and this is the fallback refresh.
export const revalidate = 3600;

export default async function Home() {
  const rules = await loadPublicRules();
  const boxes = publicBoxes(rules);
  // Built from the same data the page renders, so markup can't drift from visible content.
  // Product @ids point at each box's landing page, the canonical home for that product.
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [...boxes.map(productJsonLd), faqJsonLd(`${site.url}/#faq`, faqs)],
  };
  return (
    <>
      <JsonLd data={homeJsonLd} />
      <Hero />
      <TrustStrip />
      <Shop boxes={boxes} standards={standardsForAll(rules)} />
      <Screening />
      <GiftSection />
      <TrustStory />
      <Faq />
      <PreorderCta />
      <StickyBuyBar />
    </>
  );
}
