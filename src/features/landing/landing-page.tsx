import type { CSSProperties } from "react";
import { Instrument_Sans } from "next/font/google";
import { SiteHeader } from "./sections/site-header";
import { HeroSection } from "./sections/hero-section";
import { HowItWorksSection } from "./sections/how-it-works-section";
import { FeaturesSection } from "./sections/features-section";
import { QuoteSection } from "./sections/quote-section";
import { CloseSection } from "./sections/close-section";
import { LandingFooter } from "./sections/landing-footer";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-sans",
});

// Scoped to this page only — the rest of the app (dashboard, onboarding, login) keeps its own
// warm-sage/Fraunces design untouched. Every landing component reads these via CSS custom
// property inheritance (e.g. `text-[var(--ink)]`), not via any change to the global theme.
const TOKENS = {
  "--ink": "#14201B",
  "--ink-2": "#3C4A43",
  "--muted": "#73807A",
  "--line": "#E3E9E5",
  "--paper": "#FFFFFF",
  "--paper-2": "#F5F7F5",
  "--green": "#1E6B4E",
  "--green-2": "#E7F1EC",
  "--wa": "#DCF8C6",
} as CSSProperties;

export function LandingPage() {
  return (
    <div
      className={`${instrumentSans.className} ${instrumentSans.variable} flex min-h-dvh flex-col bg-[var(--paper)] text-[17px] leading-[1.55] text-[var(--ink)] antialiased`}
      style={TOKENS}
    >
      <SiteHeader />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <QuoteSection />
        <CloseSection />
      </main>
      <LandingFooter />
    </div>
  );
}
