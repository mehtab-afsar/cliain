import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingPreviewCard } from "../components/booking-preview-card";
import { CallPreviewCard } from "../components/call-preview-card";

export function HeroSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28 lg:py-32">
      <div className="grid w-full items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 font-mono text-xs tracking-wide text-primary-foreground uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            AI reception for independent clinics
          </span>

          <h1 className="font-display-xl mt-6 max-w-xl text-6xl leading-[0.95] tracking-tight text-foreground sm:text-7xl lg:text-[5.25rem]">
            Your front desk{" "}
            <br className="hidden sm:block" />
            never clocks out.
          </h1>

          <p className="mt-6 max-w-lg text-xl leading-relaxed text-muted-foreground">
            Patients text or call, Cliain handles the conversation, and every
            booking lands straight on your calendar — no app for them to
            install, no hold music, no missed calls.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              className="h-14 rounded-xl px-8 text-base shadow-elevation-md transition-transform hover:-translate-y-0.5"
              render={<Link href="/onboarding" />}
              nativeButton={false}
            >
              Start free setup
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-sm text-muted-foreground">
              5-minute setup · no credit card needed
            </p>
          </div>
        </div>

        <div className="relative flex flex-col items-center pb-10 sm:pb-0 lg:items-end">
          <BookingPreviewCard />
          <div className="mt-4 sm:absolute sm:-bottom-6 sm:-left-6 sm:mt-0 lg:-left-10">
            <CallPreviewCard />
          </div>
        </div>
      </div>
    </section>
  );
}
