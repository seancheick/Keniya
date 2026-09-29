import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { boxes } from "@/lib/box";
import { site } from "@/lib/site";

const BOX_LABELS: Record<string, string> = {
  pregnancy_comfort: "Pregnancy Comfort Box",
  blood_sugar: "Balanced Blood Sugar Box",
  heart: "Heart Wellness Box",
  glp1: "GLP-1 Companion Box",
  menopause: "Menopause Comfort Box",
  postpartum: "Postpartum Recovery Box",
};

export function WaitlistConfirmEmail({
  boxInterest,
  quizWho,
  quizCraving,
}: {
  boxInterest: string;
  quizWho?: string;
  quizCraving?: string;
}) {
  const boxName = BOX_LABELS[boxInterest] ?? "Keniya snack box";
  // GLP-1 / menopause / postpartum are waitlist-only; don't tell them to preorder.
  const canPreorder = boxes.some((b) => b.slug === boxInterest);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://keniyahealth.com";

  return (
    <Html>
      <Head />
      <Preview>You&apos;re holding a spot for the Keniya founding release.</Preview>
      <Body
        style={{
          backgroundColor: "#FAF5EE",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          margin: 0,
          padding: "32px 16px",
        }}
      >
        <Container
          style={{
            maxWidth: "520px",
            margin: "0 auto",
            padding: "40px 32px 48px",
            backgroundColor: "#FFFDF8",
            borderRadius: "20px",
            border: "1px solid #E5DACB",
          }}
        >
          <Text
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 500,
              color: "#33302B",
              letterSpacing: "-0.02em",
            }}
          >
            Keniya
            <span style={{ color: "#C2704E" }}>.</span>
          </Text>

          <Heading
            style={{
              margin: "28px 0 12px",
              fontSize: "26px",
              fontWeight: 500,
              lineHeight: 1.2,
              color: "#33302B",
            }}
          >
            You&apos;re on the list.
          </Heading>

          <Text style={{ margin: "0 0 16px", fontSize: "16px", lineHeight: 1.65, color: "#6B655C" }}>
            We saved your spot for the <strong style={{ color: "#33302B" }}>{boxName}</strong>
            {quizWho ? ` (${quizWho.toLowerCase()})` : ""}.{" "}
            {canPreorder
              ? `Preorders are open now: only ${site.firstRunPerBox} of each box, shipping ${site.shipDate}.`
              : "This box is still in development. You'll be first to know when it opens."}
          </Text>

          {(quizWho || quizCraving) && (
            <Section
              style={{
                margin: "20px 0",
                padding: "16px 18px",
                backgroundColor: "#F1E8DC",
                borderRadius: "12px",
              }}
            >
              <Text style={{ margin: 0, fontSize: "13px", color: "#5F7057", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                What we noted
              </Text>
              {quizWho && (
                <Text style={{ margin: "8px 0 0", fontSize: "15px", color: "#33302B" }}>
                  For: {quizWho}
                </Text>
              )}
              {quizCraving && (
                <Text style={{ margin: "4px 0 0", fontSize: "15px", color: "#33302B" }}>
                  Cravings: {quizCraving}
                </Text>
              )}
            </Section>
          )}

          <Text style={{ margin: "0 0 8px", fontSize: "15px", lineHeight: 1.6, color: "#6B655C" }}>
            Fourteen real snacks. One &ldquo;Packed for You&rdquo; guide with the why behind every
            pick. No sample-count tricks.
          </Text>

          <Section style={{ margin: "28px 0 8px", textAlign: "center" }}>
            <Link
              href={canPreorder ? `${siteUrl}/#box-${boxInterest}` : `${siteUrl}/#boxes`}
              style={{
                display: "inline-block",
                padding: "14px 28px",
                backgroundColor: "#C2704E",
                color: "#FBEFE8",
                borderRadius: "9999px",
                fontSize: "15px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              {canPreorder ? "Preorder your box" : "See the boxes"}
            </Link>
          </Section>

          <Hr style={{ borderColor: "#E5DACB", margin: "32px 0 20px" }} />

          <Text style={{ margin: 0, fontSize: "12px", lineHeight: 1.5, color: "#6B655C" }}>
            Questions? Write to{" "}
            <Link href={`mailto:${site.email}`} style={{ color: "#5F7057" }}>
              {site.email}
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WaitlistConfirmEmail;
