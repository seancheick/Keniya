import { describe, expect, it } from "vitest";
import { clubPaymentIssue } from "./club-shared";

describe("customer billing status", () => {
  it.each(["past_due", "unpaid", "incomplete"])("explains %s rather than promising another box", (status) => {
    expect(clubPaymentIssue(status)).toContain("Payment needs attention");
  });
  it.each(["active", "canceled"])("does not invent a payment problem for %s", (status) => {
    expect(clubPaymentIssue(status)).toBeNull();
  });
});
