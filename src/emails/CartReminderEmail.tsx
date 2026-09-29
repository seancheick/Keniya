import { Heading, Text } from "@react-email/components";
import type { Box } from "@/lib/box";
import { site } from "@/lib/site";
import { Button, EmailShell, Panel, TwoColList, c, t } from "@/emails/layout";

/** One reminder after a Stripe Checkout session expires unpaid. */
export function CartReminderEmail({ box, recoveryUrl }: { box: Box; recoveryUrl: string }) {
  return (
    <EmailShell
      preview={`Your ${box.name} is still waiting. Only ${site.firstRunPerBox} were made.`}
      image={box.image}
      imageAlt={box.imageAlt}
      footerNote="This is the only reminder we'll send about this checkout."
    >
      <Text style={t.eyebrow}>Still thinking it over?</Text>
      <Heading style={t.h1}>You left your {box.shortName} box behind.</Heading>
      <Text style={t.body}>
        No rush, but there are only {site.firstRunPerBox} founding {box.name}es, and once they&apos;re
        gone, they&apos;re gone. Your checkout is saved, so it takes about a minute to finish.
      </Text>

      <Button href={recoveryUrl}>Finish my order</Button>

      <Panel>
        <Text style={{ ...t.small, color: c.ink }}>
          ✓ ${site.preorderPriceUSD}, free shipping
          <br />✓ Ships {site.shipDate}
          <br />✓ Full refund any time before it ships
          <br />✓ One-time purchase, no subscription
        </Text>
      </Panel>

      <Text style={{ ...t.eyebrow, marginTop: "24px" }}>What goes in</Text>
      <TwoColList items={box.items} />
    </EmailShell>
  );
}
