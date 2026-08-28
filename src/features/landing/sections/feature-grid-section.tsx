import { CalendarCheck, PhoneCall, ShieldCheck, Users } from "lucide-react";

const FEATURES = [
  {
    icon: PhoneCall,
    title: "Text or call, their choice",
    description: "Patients reach you however they prefer — a WhatsApp message or a real phone call, same booking guarantees either way.",
  },
  {
    icon: ShieldCheck,
    title: "Never double-booked",
    description: "Every slot is checked against real, existing appointments before it's ever offered to a patient.",
  },
  {
    icon: CalendarCheck,
    title: "Calendar sync",
    description: "Every booking mirrors to Google Calendar automatically, so your existing calendar stays current.",
  },
  {
    icon: Users,
    title: "Every patient remembered",
    description: "Anyone who's messaged or called shows up in your dashboard automatically, even before they've booked.",
  },
];

export function FeatureGridSection() {
  return (
    <section id="features" className="border-t border-border bg-secondary/40">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 font-mono text-xs tracking-wide text-primary-foreground uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            What you get
          </span>
          <h2 className="font-display-xl mt-6 text-4xl tracking-tight text-foreground sm:text-5xl">
            Built for how a clinic actually runs.
          </h2>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 shadow-elevation-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-elevation-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary">
                <feature.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-5 font-heading text-lg text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
