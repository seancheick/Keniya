import { Heading, Text } from "@react-email/components";
import { site } from "@/lib/site";
import { Button, EmailShell, Panel, c, siteUrl, t } from "@/emails/layout";

/** The first-box code, sent right after the visitor claims it on the site. */
export function WelcomeOfferEmail({ code, percentOff, priceLabel }: { code: string; percentOff: number; priceLabel: string }) {
  return (
    <EmailShell
      preview={`Your code ${code}: ${percentOff}% off your first Keniya box.`}
      image="/images/hero-box.jpg"
      imageAlt="An example Keniya snack box"
      footerNote="You're getting this because you asked for the first-box code on keniyahealth.com. We only email when there's news."
    >
      <Text style={t.eyebrow}>Welcome to Keniya</Text>
      <Heading style={t.h1}>Your first box, {percentOff}% off.</Heading>
      <Text style={t.body}>
        {site.snackCount} snacks picked for your box, free US shipping, no subscription. With your code
        the first box is <strong style={{ color: c.ink }}>{priceLabel}</strong>.
      </Text>
      <Panel>
        <Text style={{ ...t.eyebrow, margin: "0 0 6px" }}>Your code</Text>
        <Text style={{ ...t.h1, margin: 0, letterSpacing: "0.08em" }}>{code}</Text>
        <Text style={{ ...t.small, margin: "8px 0 0" }}>
          For your first order with this email address. It applies on its own when you order on the
          site with the same email.
        </Text>
      </Panel>
      <Button href={`${siteUrl}/#boxes`}>Find my box</Button>
    </EmailShell>
  );
}
