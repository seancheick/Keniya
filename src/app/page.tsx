import { Hero } from "@/components/sections/hero";
import { TrustStrip } from "@/components/sections/trust-strip";
import { Marquee } from "@/components/sections/marquee";
import { OurBoxes } from "@/components/sections/our-boxes";
import { SocialProof } from "@/components/sections/social-proof";
import { Standards } from "@/components/sections/standards";
import { BoxOpen } from "@/components/sections/box-open";
import { WhatsInside } from "@/components/sections/whats-inside";
import { WhyCards } from "@/components/sections/why-cards";
import { PharmaGuideBlock } from "@/components/sections/pharmaguide";
import { Gift } from "@/components/sections/gift";
import { Founders } from "@/components/sections/founders";
import { Faq } from "@/components/sections/faq";
import { PreorderCta } from "@/components/sections/preorder-cta";
import { StickyBuyBar } from "@/components/sticky-buy-bar";
import { JsonLd } from "@/components/json-ld";
import { faqs } from "@/components/sections/faq";
import { boxes } from "@/lib/box";
import { site } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Built from the same data the page renders, so markup can't drift from visible content.
const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    ...boxes.map((box) => ({
      "@type": "Product",
      "@id": `${site.url}/#box-${box.slug}`,
      name: box.name,
      description: `${box.forWho} ${box.why}`,
      image: `${site.url}${box.image}`,
      sku: box.slug,
      brand: { "@type": "Brand", name: site.name },
      offers: {
        "@type": "Offer",
        url: `${site.url}/#box-${box.slug}`,
        price: site.preorderPriceUSD,
        priceCurrency: "USD",
        availability: "https://schema.org/PreOrder",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@id": `${site.url}/#organization` },
        ...(site.freeShipping && {
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "USD" },
            shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
          },
        }),
      },
    })),
    {
      "@type": "FAQPage",
      "@id": `${site.url}/#faq`,
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <JsonLd data={homeJsonLd} />
      <Hero />
      <TrustStrip />
      <Marquee />
      <OurBoxes />
      <SocialProof />
      <Standards />
      <BoxOpen />
      <WhatsInside />
      <WhyCards />
      <PharmaGuideBlock />
      <Gift />
      <Founders />
      <Faq />
      <PreorderCta />
      <StickyBuyBar />
    </>
  );
}
