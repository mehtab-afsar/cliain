import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <MessageCircle
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 text-primary-foreground/10 sm:h-80 sm:w-80"
        strokeWidth={1}
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-7 px-6 py-24 sm:py-32">
        <h2 className="font-display-xl text-5xl tracking-tight sm:text-6xl">
          Your front desk, live in 5 minutes.
        </h2>
        <p className="max-w-md text-xl leading-relaxed text-primary-foreground/80">
          No credit card, no phone system to replace — just connect your
          WhatsApp number when you&apos;re ready.
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="h-14 rounded-xl px-8 text-base shadow-elevation-md transition-transform hover:-translate-y-0.5"
          render={<Link href="/onboarding" />}
          nativeButton={false}
        >
          Start free setup
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
