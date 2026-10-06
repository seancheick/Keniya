import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { WaitlistConfirmEmail } from "./WaitlistConfirmEmail";

describe("waitlist confirmation", () => {
  it("does not imply a purchase or reservation", () => {
    const html = renderToStaticMarkup(createElement(WaitlistConfirmEmail, { boxInterest: "heart" }));
    expect(html).toContain("Joining this list does not reserve a box");
    expect(html).not.toContain("Preorders are open now");
    expect(html).not.toContain("Your spot");
    expect(html).not.toContain("Preorder the");
  });
});
