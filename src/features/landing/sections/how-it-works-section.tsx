import { Bell, CalendarSearch, CheckCircle2, MessageCircle } from "lucide-react";

const STEPS = [
  {
    icon: MessageCircle,
    title: "Patient reaches out",
    description: "A WhatsApp message or a phone call to your clinic's real number — nothing new for them to install.",
  },
  {
    icon: CalendarSearch,
    title: "Cliain checks real availability",
    description: "Your actual working hours and existing bookings — never a double-booking, never a guess.",
  },
  {
    icon: CheckCircle2,
    title: "Booking confirmed instantly",
    description: "Written straight to your calendar the moment the patient picks a time.",
  },
  {
    icon: Bell,
    title: "Reminders send themselves",
    description: "A text 24 hours out, a voice call 2 hours out — no-shows drop without anyone lifting a finger.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
      <div className="max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 font-mono text-xs tracking-wide text-primary-foreground uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
          How it works
        </span>
        <h2 className="font-display-xl mt-6 text-4xl tracking-tight text-foreground sm:text-5xl">
          From a text message to a booked appointment.
        </h2>
      </div>

      <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <div key={step.title} className="relative border-t-2 border-primary pt-6">
            <span
              aria-hidden="true"
              className="font-display-xl pointer-events-none absolute top-3 right-0 text-7xl text-primary/10 select-none"
            >
              0{index + 1}
            </span>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <step.icon className="h-4 w-4 text-primary-foreground" />
            </div>
            <h3 className="relative mt-4 font-heading text-xl text-foreground">{step.title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
