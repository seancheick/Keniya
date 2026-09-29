import type { Box } from "@/lib/box";
import { landingFor } from "@/lib/landing";
import { site } from "@/lib/site";

const base = site.url.replace(/\/$/, "");

/** One Product entity per box, @id'd to its landing page so home and landing agree. */
export function productJsonLd(box: Box) {
  const url = `${base}${landingFor(box.slug).path}`;
  return {
    "@type": "Product",
    "@id": `${url}#product`,
    name: box.name,
    description: `${box.forWho} ${box.why}`,
    image: `${base}${box.image}`,
    sku: box.slug,
    url,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      url,
      price: site.preorderPriceUSD,
      priceCurrency: "USD",
      availability: "https://schema.org/PreOrder",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${base}/#organization` },
      ...(site.freeShipping && {
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "USD" },
          shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
        },
      }),
    },
  };
}

export function faqJsonLd(id: string, faqs: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    "@id": id,
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbJsonLd(path: string, name: string) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
      { "@type": "ListItem", position: 2, name, item: `${base}${path}` },
    ],
  };
}
