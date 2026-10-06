import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartReminderEmail } from "./CartReminderEmail";
import { boxes } from "@/lib/box";
import { landingFor } from "@/lib/landing";
import { site } from "@/lib/site";

describe("expired-checkout reminder", () => {
  it("links the canonical box page and explains admission must start again", () => {
    const box = { ...boxes.find(b => b.slug === "heart")!, categories: [] };
    const html = renderToStaticMarkup(createElement(CartReminderEmail, { box }));
    expect(html).toContain(`${site.url.replace(/\/$/, "")}${landingFor(box.slug).path}`);
    expect(html).toContain("Your previous checkout has expired");
    expect(html).toContain("A box has not been reserved for you");
    expect(html).not.toContain("checkout.stripe.com");
    expect(html).not.toContain("checkout is saved");
  });
});
