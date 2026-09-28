import { CtaSection } from "@/components/landing/cta-section";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PopularDestinations } from "@/components/landing/popular-destinations";

export default function HomePage() {
  return (
    <>
      <Hero />
      <PopularDestinations />
      <HowItWorks />
      <CtaSection />
    </>
  );
}
