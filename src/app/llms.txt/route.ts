import { loadPublicCatalog } from "@/lib/public-sales";
import { giftLanding, landingFor } from "@/lib/landing";
import { site } from "@/lib/site";
import { publicStandards } from "@/lib/standards";

// Numbers come from the live box rules (revalidated on save in the admin).
export const revalidate = 3600;

// llms.txt (llmstxt.org): a plain-markdown site summary for AI tools. Generated from the
// same data the site renders so it can't drift.
export async function GET() {
  const { rules, boxes } = await loadPublicCatalog();
  const base = site.url.replace(/\/$/, "");
  const body = `# ${site.name}

> ${site.description}

${site.name} (from kɛnɛya, "health" in Dioula) is a small, founder-run US company. Every box is a one-time purchase at $${site.preorderPriceUSD} with ${site.freeShippingLabel.toLowerCase()} to US addresses, no subscription, and a full refund any time before it ships. Each box has its own nutrition and ingredient standards; a snack has to pass its box's limits, and each lineup needs approval from our pharmacist before preorders open. The founding release is a small run per box (shown below). ${site.name} curates sealed, packaged snacks and does not give medical or nutritional advice.

## Boxes

${boxes.map((b) => `- [${b.name}](${base}${landingFor(b.slug).path}) ${b.founding > 0 ? `(${b.founding} founding boxes)` : "(availability pending)"}: ${b.forWho} ${b.why} Standards: ${publicStandards(b.slug, rules).join("; ")}.`).join("\n")}
- [Gifts](${base}${giftLanding.path}): send any box as a gift, with your note printed and packed inside.

## Pages

- [Home — choose a box, how we pick, FAQ](${base}/)
- [Our story](${base}/about)
- [Privacy policy](${base}/privacy)
- [Terms of service](${base}/terms)

## Contact

- ${site.email}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
