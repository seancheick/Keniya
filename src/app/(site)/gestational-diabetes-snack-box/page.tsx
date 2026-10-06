import { BoxLandingPage, landingMetadata } from "@/components/box-landing";

// Copy and standards come from the live box rules (revalidated on save in the admin).
export const revalidate = 3600;

export const generateMetadata = () => landingMetadata("gestational_diabetes");

export default function Page() {
  return <BoxLandingPage slug="gestational_diabetes" />;
}
