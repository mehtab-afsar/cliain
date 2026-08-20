import Link from "next/link";
import { ArrowRight, Bell, CalendarCheck, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingPreviewCard } from "../components/booking-preview-card";

const DETAILS = [
  { icon: PhoneCall, label: "WhatsApp & voice" },
  { icon: Bell, label: "Auto reminders" },
  { icon: CalendarCheck, label: "Calendar sync" },
];

export function HeroSection() {
  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-1 items-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 h-[32rem] w-[32rem] -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-accent/70 blur-3xl"
      />

      <div className="relative grid w-full items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            AI reception for independent clinics
          </span>

          <h1 className="mt-5 max-w-xl font-heading text-4xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Your front desk
            <br className="hidden sm:block" />
            never clocks out.
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Patients text or call, Claude handles the conversation, and every
            booking lands straight on your calendar — no app for them to
            install, no hold music, no missed calls.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" render={<Link href="/onboarding" />} nativeButton={false}>
              Start free setup
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-sm text-muted-foreground">
              5-minute setup · no credit card needed
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-6">
            {DETAILS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="rotate-[-1.5deg] transition-transform duration-300 hover:rotate-0">
            <BookingPreviewCard />
          </div>
        </div>
      </div>
    </section>
  );
}
