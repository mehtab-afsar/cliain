import { SiteHeader } from "./sections/site-header";
import { HeroSection } from "./sections/hero-section";
import { ProofStripSection } from "./sections/proof-strip-section";
import { HowItWorksSection } from "./sections/how-it-works-section";
import { FeatureGridSection } from "./sections/feature-grid-section";
import { FinalCtaSection } from "./sections/final-cta-section";
import { SiteFooter } from "./sections/site-footer";

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main>
        <HeroSection />
        <ProofStripSection />
        <HowItWorksSection />
        <FeatureGridSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
