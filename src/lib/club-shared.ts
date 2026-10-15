/** Snack Club rules shared by the manage page (client) and its server actions. */

/** One-tap reasons on the cancel screen; optional, and only used to make the box better. */
export const CANCEL_REASONS = ["Just need a break", "Too much food", "Too expensive", "Didn't love the snacks", "Something else"] as const;

/** How many renewals a subscriber can skip in one go. */
export const SKIP_CHOICES = [1, 2, 3] as const;
export type SkipMonths = (typeof SKIP_CHOICES)[number];

const SKIP_GRACE_S = 3 * 86_400;

/** Resume a few days after the last skipped renewal: N renewals voided, the next one charged. */
export function skipUntil(periodEndUnix: number, months: SkipMonths): number {
  const d = new Date(periodEndUnix * 1000);
  d.setUTCMonth(d.getUTCMonth() + (months - 1));
  return Math.floor(d.getTime() / 1000) + SKIP_GRACE_S;
}
