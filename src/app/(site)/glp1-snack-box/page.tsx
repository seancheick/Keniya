import { BoxLandingPage, landingMetadata } from "@/components/box-landing";
import { landingFor } from "@/lib/landing";

export const metadata = landingMetadata(landingFor("glp1"));

export default function Page() {
  return <BoxLandingPage slug="glp1" />;
}
