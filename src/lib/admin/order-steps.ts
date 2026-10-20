// One order's place in the flow and the single thing to do next, in plain words, so anyone can
// run an order: fix flags → pack → label → shipped → delivered. Planning happens before the
// shipment exists, so on an order page it's already done.

export const ORDER_STEPS = ["Planned", "Fix flags", "Pack", "Label", "Shipped", "Delivered"] as const;

export type NextStep = { step: number; tone: "good" | "warn" | "bad"; title: string; body: string };

export function nextStep(input: { status: string; flags: number; swapsToConfirm: boolean; issue?: string | null }): NextStep {
  const { status, flags, swapsToConfirm, issue } = input;
  switch (status) {
    case "planned":
      if (swapsToConfirm)
        return { step: 1, tone: "bad", title: "Confirm the swaps", body: "Some snacks were replaced to fit this customer. Check them and confirm before packing." };
      if (flags)
        return {
          step: 1,
          tone: "bad",
          title: `Fix ${flags} flag${flags > 1 ? "s" : ""}`,
          body: "Each ✕ says what's wrong. Press “Swap for …” to replace a snack and save, or fix its details on the product page.",
        };
      return { step: 2, tone: "good", title: "Ready to pack", body: "Pull each pack from the lot shown, tick it, then press Mark packed." };
    case "packed":
      return { step: 3, tone: "warn", title: "Buy the label", body: "Buy the label in Pirate Ship, then enter the carrier and tracking number below. That marks it shipped." };
    case "shipped":
      return { step: 4, tone: "good", title: "On its way", body: "Mark it delivered when tracking says so, or record an issue." };
    case "delivered":
      return { step: 5, tone: "good", title: "Delivered", body: "Nothing left to do." };
    case "issue":
      return { step: 4, tone: "bad", title: "Issue to resolve", body: issue ? `Recorded issue: ${issue}. Update it below once it's settled.` : "Update the issue below once it's settled." };
    default:
      return { step: 0, tone: "warn", title: status, body: "Unknown order status." };
  }
}

/** The best replacement for a flagged slot: passes, in stock, not already in the box, same kind. */
export function swapSuggestion<T extends { id: string; ok: boolean; short: number; categories: string[] }>(
  slot: { categories: string[] } | undefined,
  options: T[],
  inBox: string[],
): T | null {
  if (!slot) return null;
  return options.find((o) => o.ok && o.short === 0 && !inBox.includes(o.id) && o.categories.some((c) => slot.categories.includes(c))) ?? null;
}
