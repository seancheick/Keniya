import { boxes } from "@/lib/box";
import { site } from "@/lib/site";

export const dynamic = "force-static";

// llms.txt (llmstxt.org): a plain-markdown site summary for AI tools. Generated from the
// same data the site renders so it can't drift.
export function GET() {
  const base = site.url.replace(/\/$/, "");
  const body = `# ${site.name}

> ${site.description}

${site.name} (from kɛnɛya, "health" in Dioula) is a small, founder-run US company. Every box is a one-time purchase at $${site.preorderPriceUSD} with ${site.freeShippingLabel.toLowerCase()} to US addresses, no subscription, and a full refund any time before it ships. The founding release is limited to ${site.firstRunPerBox} of each box. ${site.name} curates sealed, packaged snacks and does not give medical or nutritional advice.

## Boxes

${boxes.map((b) => `- [${b.name}](${base}/#box-${b.slug}): ${b.forWho} ${b.why}`).join("\n")}

## Pages

- [Home — boxes, selection standards, FAQ](${base}/)
- [Our story](${base}/about)
- [Privacy policy](${base}/privacy)
- [Terms of service](${base}/terms)

## Contact

- ${site.email}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
