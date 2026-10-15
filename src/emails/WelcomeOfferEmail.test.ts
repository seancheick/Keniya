import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WelcomeOfferEmail } from "./WelcomeOfferEmail";
import { site } from "@/lib/site";

describe("first-box code email", () => {
  it("shows the code and links back with an absolute URL (mail clients have no base)", () => {
    const html = renderToStaticMarkup(createElement(WelcomeOfferEmail, { code: "WELCOME20", percentOff: 20, priceLabel: "$37.60" }));
    expect(html).toContain("WELCOME20");
    expect(html).toContain(`href="${site.url.replace(/\/$/, "")}/#boxes"`);
    expect(html).not.toContain('href="/#boxes"');
  });
});
