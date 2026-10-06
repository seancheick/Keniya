import { Heading, Text } from "@react-email/components";
import type { PublicBox as Box } from "@/lib/box";
import { landingFor } from "@/lib/landing";
import { site } from "@/lib/site";
import { Button, EmailShell, Panel, CategoryList, c, t } from "@/emails/layout";

/** One reminder after a Stripe Checkout session expires unpaid. */
export function CartReminderEmail({ box }: { box: Box }) {
  return (
    <EmailShell
      preview={`Take another look at the ${box.name}. Availability is checked when you preorder.`}
      image={box.image}
      imageAlt={box.imageAlt}
      footerNote="This is the only reminder we'll send about this checkout."
    >
      <Text style={t.eyebrow}>Still thinking it over?</Text>
      <Heading style={t.h1}>Still interested in the {box.shortName} box?</Heading>
      <Text style={t.body}>
        Your previous checkout has expired. You can visit the box page to start a new preorder
        while it is available. A box has not been reserved for you.
      </Text>

      <Button href={`${site.url.replace(/\/$/, "")}${landingFor(box.slug).path}`}>View the box</Button>

      <Panel>
        <Text style={{ ...t.small, color: c.ink }}>
          ✓ ${site.preorderPriceUSD}, free shipping
          <br />✓ Ships {site.shipDate}
          <br />✓ Full refund any time before it ships
          <br />✓ One-time purchase, no subscription
        </Text>
      </Panel>

      <Text style={{ ...t.eyebrow, marginTop: "24px" }}>What goes in</Text>
      <CategoryList categories={box.categories} />
    </EmailShell>
  );
}
