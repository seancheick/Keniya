import "server-only";
import { boxes, type Box, type PublicBox } from "@/lib/box";
import { landingFor, type BoxLanding } from "@/lib/landing";
import { fillStandards, publicComposition, type PublicRules } from "@/lib/standards";

/** Box copy with every `{{slug.field}}` filled, and "what goes in" derived from the live recipe. */
export const publicBoxes = (rules: PublicRules): PublicBox[] =>
  boxes.map((b) => ({
    ...b,
    forWho: fillStandards(b.forWho, rules),
    why: fillStandards(b.why, rules),
    ...(b.caution && { caution: fillStandards(b.caution, rules) }),
    categories: publicComposition(b.slug, rules, b.composition),
  }));

export function publicLanding(slug: Box["slug"], rules: PublicRules): BoxLanding {
  const l = landingFor(slug);
  const f = (s: string) => fillStandards(s, rules);
  return {
    ...l,
    title: f(l.title),
    description: f(l.description),
    h1: f(l.h1),
    intro: f(l.intro),
    forWho: l.forWho.map(f),
    screening: l.screening.map((s) => ({ title: f(s.title), body: f(s.body) })),
    faqs: l.faqs.map((q) => ({ q: f(q.q), a: f(q.a) })),
  };
}
