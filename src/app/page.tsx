import { Hero } from "@/components/sections/hero";
import { Marquee } from "@/components/sections/marquee";
import { OurBoxes } from "@/components/sections/our-boxes";
import { Standards } from "@/components/sections/standards";
import { BoxOpen } from "@/components/sections/box-open";
import { WhatsInside } from "@/components/sections/whats-inside";
import { WhyCards } from "@/components/sections/why-cards";
import { Gift } from "@/components/sections/gift";
import { Founders } from "@/components/sections/founders";
import { Faq } from "@/components/sections/faq";
import { PreorderCta } from "@/components/sections/preorder-cta";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <OurBoxes />
      <Standards />
      <BoxOpen />
      <WhatsInside />
      <WhyCards />
      <Gift />
      <Founders />
      <Faq />
      <PreorderCta />
    </>
  );
}
