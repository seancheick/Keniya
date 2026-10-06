import { BoxLandingPage, landingMetadata } from "@/components/box-landing";
import { landingFor } from "@/lib/landing";

export const metadata = landingMetadata(landingFor("postpartum"));

export default function Page() {
  return <BoxLandingPage slug="postpartum" />;
}
