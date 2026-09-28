import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "#FAF5EE",
          color: "#33302B",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 56,
            letterSpacing: "-0.02em",
          }}
        >
          Keniya
          <span style={{ color: "#C2704E" }}>.</span>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 40,
            maxWidth: 900,
            lineHeight: 1.2,
          }}
        >
          Snack boxes with a why
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 22,
            color: "#6B655C",
            maxWidth: 820,
          }}
        >
          {`Pregnancy · Blood sugar · Heart health · ${site.snackCount} snacks · $${site.preorderPriceUSD} · Free shipping · Founding 50`}
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 18,
            color: "#5F7057",
          }}
        >
          keniyahealth.com · Curated with PharmaGuide
        </div>
      </div>
    ),
    { ...size },
  );
}
