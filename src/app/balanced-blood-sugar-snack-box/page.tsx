import { BoxLandingPage, landingMetadata } from "@/components/box-landing";
import { landingFor } from "@/lib/landing";

export const metadata = landingMetadata(landingFor("blood_sugar"));

export default function Page() {
  return <BoxLandingPage slug="blood_sugar" />;
}
