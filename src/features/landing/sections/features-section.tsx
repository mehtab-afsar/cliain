import { Calendar, CheckCircle2, MessageSquare, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HEADING_FONT } from "../styles";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MessageSquare,
    title: "WhatsApp and phone, same result",
    body: "Patients pick the channel. Either way they get the same availability, the same booking, the same confirmation.",
  },
  {
    icon: Calendar,
    title: "Google Calendar stays the source of truth",
    body: "Every booking mirrors to the calendar you already use. Block time there and Cliain stops offering it.",
  },
  {
    icon: CheckCircle2,
    title: "No double bookings, ever",
    body: "A slot is checked against existing appointments before it's offered, and again before it's confirmed.",
  },
  {
    icon: User,
    title: "Your patient list builds itself",
    body: "Anyone who messages or calls appears in your dashboard with their history, even if they haven't booked yet.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-[var(--paper-2)] py-[104px]">
      <div className="mx-auto max-w-[1120px] px-7">
        <h2
          className={`max-w-[18ch] text-[clamp(30px,3.6vw,44px)] leading-[1.08] font-medium tracking-[-0.03em] ${HEADING_FONT}`}
        >
          Built around how a small clinic actually runs.
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-x-16 min-[760px]:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="border-t border-[var(--line)] py-7">
              <h3
                className={`flex items-center gap-2.5 text-[19px] font-medium tracking-[-0.01em] ${HEADING_FONT}`}
              >
                <feature.icon
                  className="h-[18px] w-[18px] shrink-0 text-[var(--green)]"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                {feature.title}
              </h3>
              <p className="mt-2 max-w-[40ch] text-base text-[var(--ink-2)]">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
