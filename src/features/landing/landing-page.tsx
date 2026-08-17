import { SiteHeader } from "./sections/site-header";
import { HeroSection } from "./sections/hero-section";
import { SiteFooter } from "./sections/site-footer";

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <HeroSection />
      </main>
      <SiteFooter />
    </div>
  );
}
