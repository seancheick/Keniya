import { describe, expect, it } from "vitest";
import { snack } from "@/lib/admin/__fixtures__/snacks";
import type { Check, Pick } from "@/lib/admin/rules";
import { boxState } from "./box-facts";

const picks = (n: number, over = {}): Pick[] => Array.from({ length: n }, () => ({ snack: snack(over), category: "Savory" }));
const fail: Check = { key: "weight", label: "Packed weight", value: "40 oz", level: "block", pass: false, deficit: 1 };
const warn: Check = { ...fail, key: "brand", level: "warn" };

describe("box status in one word", () => {
  it("empty → add → fix → verify packages → ready to pack", () => {
    expect(boxState([], [], 14, []).label).toBe("Empty");
    expect(boxState(picks(12), [], 14, []).label).toBe("Add 2");
    expect(boxState(picks(14), [], 14, [fail, warn]).label).toBe("Fix 1"); // a warning never blocks
    expect(boxState(picks(14, { packageVerified: false }), [], 14, [warn])).toMatchObject({ label: "Rules ✓", detail: "14 packages to verify in hand before packing" });
    expect(boxState(picks(14), [snack({ packageVerified: false })], 14, []).label).toBe("Rules ✓");
    expect(boxState(picks(14), [], 14, [warn])).toMatchObject({ label: "Ready to pack", tone: "good" });
  });
});
