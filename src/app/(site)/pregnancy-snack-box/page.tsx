import { BoxLandingPage, landingMetadata } from "@/components/box-landing";
import { landingFor } from "@/lib/landing";

export const metadata = landingMetadata(landingFor("pregnancy_comfort"));

export default function Page() {
  return <BoxLandingPage slug="pregnancy_comfort" />;
}
