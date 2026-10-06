import "server-only";
import { loadBoxRules } from "@/lib/admin/db";
import { DEFAULT_BOX_RULES } from "@/lib/admin/types";
import { boxes, type Box } from "@/lib/box";
import { landingFor, type BoxLanding } from "@/lib/landing";
import { fillStandards, type PublicRules } from "@/lib/standards";

/**
 * The rules the public site prints are the rules the engine enforces: the live `box_rules`
 * rows merged over the defaults, exactly what eligibility uses. Pages that call this are
 * revalidated when a rule is saved in the admin (see saveBoxRules), so there's nothing to
 * remember. If the database is unreachable the defaults are used and the error is logged.
 */
export async function loadPublicRules(): Promise<PublicRules> {
  try {
    return await loadBoxRules();
  } catch (err) {
    console.error("public rules: falling back to defaults", err);
    return DEFAULT_BOX_RULES;
  }
}

/** Box copy with every `{{slug.field}}` filled from the effective rules. */
export const publicBoxes = (rules: PublicRules): Box[] =>
  boxes.map((b) => ({ ...b, forWho: fillStandards(b.forWho, rules), why: fillStandards(b.why, rules), ...(b.caution && { caution: fillStandards(b.caution, rules) }) }));

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
    categoryWhy: Object.fromEntries(Object.entries(l.categoryWhy).map(([k, v]) => [k, f(v)])),
    screening: l.screening.map((s) => ({ title: f(s.title), body: f(s.body) })),
    faqs: l.faqs.map((q) => ({ q: f(q.q), a: f(q.a) })),
  };
}
