import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { site } from "@/lib/site";

/** Brand palette (globals.css), inlined because email clients ignore stylesheets. */
export const c = {
  cream: "#FAF5EE",
  creamDeep: "#F1E8DC",
  card: "#FFFDF8",
  line: "#E5DACB",
  ink: "#33302B",
  inkSoft: "#6B655C",
  sage: "#5F7057",
  terracotta: "#C2704E",
  terracottaDeep: "#A65A3D",
  blush: "#EBD8CD",
  blushInk: "#8A4E33",
};

const serif = "Georgia, 'Times New Roman', serif";
const sans =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? site.url).replace(
  /\/$/,
  "",
);

export const t = {
  eyebrow: {
    margin: "0 0 10px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: c.sage,
    fontFamily: sans,
  },
  h1: {
    margin: "0 0 14px",
    fontSize: "30px",
    lineHeight: 1.2,
    fontWeight: 400,
    color: c.ink,
    fontFamily: serif,
  },
  body: {
    margin: "0 0 16px",
    fontSize: "16px",
    lineHeight: 1.65,
    color: c.inkSoft,
    fontFamily: sans,
  },
  small: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.6,
    color: c.inkSoft,
    fontFamily: sans,
  },
};

export function Button({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Section style={{ margin: "28px 0 8px", textAlign: "center" }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          padding: "15px 32px",
          backgroundColor: c.terracotta,
          color: "#FFFDF8",
          borderRadius: "9999px",
          fontSize: "16px",
          fontWeight: 600,
          textDecoration: "none",
          fontFamily: sans,
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

/** Soft-tinted panel for details (order summary, what's inside, notes). */
export function Panel({
  children,
  tint = c.creamDeep,
}: {
  children: ReactNode;
  tint?: string;
}) {
  return (
    <Section
      style={{
        margin: "20px 0",
        padding: "18px 20px",
        backgroundColor: tint,
        borderRadius: "14px",
      }}
    >
      {children}
    </Section>
  );
}

/** "4 × Comfort — gentle picks" rows: what's in a box, by category (never specific snacks). */
export function CategoryList({
  categories,
}: {
  categories: { name: string; count: number; note: string }[];
}) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
      <tbody>
        {categories.map((cat) => (
          <tr key={cat.name}>
            <td
              valign="top"
              style={{
                width: "36px",
                padding: "6px 0",
                fontSize: "15px",
                fontWeight: 700,
                color: c.terracotta,
                fontFamily: sans,
              }}
            >
              {cat.count}×
            </td>
            <td
              valign="top"
              style={{
                padding: "6px 0",
                fontSize: "14px",
                lineHeight: 1.45,
                color: c.inkSoft,
                fontFamily: sans,
              }}
            >
              <strong style={{ color: c.ink }}>{cat.name}</strong> · {cat.note}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EmailShell({
  preview,
  children,
  image,
  imageAlt = "",
  footerNote,
  internal = false,
}: {
  preview: string;
  children: ReactNode;
  /** Optional full-width photo under the logo (absolute path on the site, e.g. /images/box-heart.jpg). */
  image?: string;
  imageAlt?: string;
  footerNote?: ReactNode;
  /** Team-only email (order alert): drop the customer-facing footer. */
  internal?: boolean;
}) {
  return (
    <Html lang="en">
      <Head>
        {/* Keep the cream design in Apple Mail / Gmail dark mode instead of auto-inverting. */}
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: c.cream,
          margin: 0,
          padding: "32px 12px",
          fontFamily: sans,
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            backgroundColor: c.card,
            borderRadius: "22px",
            border: `1px solid ${c.line}`,
            overflow: "hidden",
          }}
        >
          <Section style={{ padding: "28px 32px 0" }}>
            <Link href={siteUrl} style={{ textDecoration: "none" }}>
              <Text
                style={{
                  margin: 0,
                  fontSize: "26px",
                  color: c.ink,
                  fontFamily: serif,
                }}
              >
                Keniya<span style={{ color: c.terracotta }}>.</span>
              </Text>
            </Link>
          </Section>

          {image && (
            <Section style={{ padding: "22px 32px 0" }}>
              <Img
                src={`${siteUrl}${image}`}
                alt={imageAlt}
                width="496"
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "16px",
                  display: "block",
                }}
              />
            </Section>
          )}

          <Section style={{ padding: "28px 32px 36px" }}>{children}</Section>

          {!internal && (
            <Section style={{ padding: "0 32px 32px" }}>
              <Hr style={{ borderColor: c.line, margin: "0 0 18px" }} />
              {footerNote && (
                <Text style={{ ...t.small, marginBottom: "10px" }}>
                  {footerNote}
                </Text>
              )}
              <Text style={t.small}>
                Questions? Just reply, or write to{" "}
                <Link href={`mailto:${site.email}`} style={{ color: c.sage }}>
                  {site.email}
                </Link>
                .
              </Text>
              <Text
                style={{
                  ...t.small,
                  marginTop: "10px",
                  fontSize: "11px",
                  color: "#9A938A",
                }}
              >
                Keniya picks packaged snacks with care. It isn&apos;t medical
                advice.
              </Text>
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  );
}
