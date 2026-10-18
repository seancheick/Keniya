import { describe, expect, it } from "vitest";
import { nextStep, swapSuggestion } from "./order-steps";

describe("one next step per order", () => {
  it("planned: confirm swaps first, then fix flags, then pack", () => {
    expect(nextStep({ status: "planned", flags: 2, swapsToConfirm: true })).toMatchObject({ step: 1, title: "Confirm the swaps" });
    expect(nextStep({ status: "planned", flags: 2, swapsToConfirm: false })).toMatchObject({ step: 1, tone: "bad", title: "Fix 2 flags" });
    expect(nextStep({ status: "planned", flags: 1, swapsToConfirm: false }).title).toBe("Fix 1 flag");
    expect(nextStep({ status: "planned", flags: 0, swapsToConfirm: false })).toMatchObject({ step: 2, tone: "good", title: "Ready to pack" });
  });
  it("then label, shipped, delivered; an issue says what was recorded", () => {
    expect(nextStep({ status: "packed", flags: 0, swapsToConfirm: false }).title).toBe("Buy the label");
    expect(nextStep({ status: "shipped", flags: 0, swapsToConfirm: false }).step).toBe(4);
    expect(nextStep({ status: "delivered", flags: 0, swapsToConfirm: false }).step).toBe(5);
    expect(nextStep({ status: "issue", flags: 0, swapsToConfirm: false, issue: "damaged" })).toMatchObject({ tone: "bad", body: expect.stringContaining("damaged") });
  });
});

describe("swap suggestion", () => {
  const opt = (id: string, over: Partial<{ ok: boolean; short: number; categories: string[] }> = {}) => ({ id, ok: true, short: 0, categories: ["Savory"], ...over });
  it("same kind, passing, in stock, not already in the box", () => {
    const options = [opt("bad", { ok: false }), opt("short", { short: 2 }), opt("taken"), opt("sweet", { categories: ["Sweet"] }), opt("good")];
    expect(swapSuggestion({ categories: ["Savory"] }, options, ["taken"])?.id).toBe("good");
    expect(swapSuggestion({ categories: ["Protein"] }, options, [])).toBeNull();
    expect(swapSuggestion(undefined, options, [])).toBeNull();
  });
});
