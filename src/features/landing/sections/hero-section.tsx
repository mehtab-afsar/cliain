import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingPreviewCard } from "../components/booking-preview-card";

export function HeroSection() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-16">
      <div className="grid w-full items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div>
          <p className="text-sm font-medium tracking-wide text-primary">
            AI scheduling for independent clinics
          </p>
          <h1 className="mt-4 max-w-xl font-heading text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Never miss another booking.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Patients book, reschedule, and get reminded over WhatsApp —
            automatically. Your calendar stays in sync, and your front desk
            stays free for patients in the room.
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
        </div>

        <div className="flex justify-center lg:justify-end">
          <BookingPreviewCard />
        </div>
      </div>
    </section>
  );
}
