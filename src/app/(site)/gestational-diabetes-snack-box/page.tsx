import { BoxLandingPage, landingMetadata } from "@/components/box-landing";
import { landingFor } from "@/lib/landing";

export const metadata = landingMetadata(landingFor("gestational_diabetes"));

export default function Page() {
  return <BoxLandingPage slug="gestational_diabetes" />;
}
