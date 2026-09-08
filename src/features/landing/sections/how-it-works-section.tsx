import { HEADING_FONT } from "../styles";

const STEPS = [
  {
    title: "A patient texts or calls",
    body: "They use WhatsApp or ring your clinic's existing number. Nothing to download, no new number to learn.",
  },
  {
    title: "Cliain checks your real calendar",
    body: "It reads your working hours and existing bookings and offers only the slots that are actually open.",
  },
  {
    title: "The appointment is booked",
    body: "The moment the patient picks a time, it's written to your calendar and confirmed back to them.",
  },
  {
    title: "Reminders go out on their own",
    body: "A text 24 hours before and a short voice call 2 hours before. Fewer no-shows, no extra work.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="py-[104px]">
      <div className="mx-auto max-w-[1120px] px-7">
        <h2
          className={`max-w-[18ch] text-[clamp(30px,3.6vw,44px)] leading-[1.08] font-medium tracking-[-0.03em] ${HEADING_FONT}`}
        >
          From a message to a booked appointment, without you.
        </h2>
        <p className="mt-4 max-w-[48ch] text-lg text-[var(--ink-2)]">
          Here is exactly what happens when a patient reaches out.
        </p>

        <ol className="mt-14 border-t border-[var(--line)]">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[40px_1fr] items-baseline gap-x-4 gap-y-1.5 border-b border-[var(--line)] py-[30px] min-[760px]:grid-cols-[72px_1fr_1.3fr] min-[760px]:gap-x-6"
            >
              <span className="text-[15px] tabular-nums text-[var(--muted)]">{index + 1}</span>
              <h3 className={`text-[21px] font-medium tracking-[-0.015em] ${HEADING_FONT}`}>
                {step.title}
              </h3>
              <p className="col-start-2 text-base text-[var(--ink-2)] min-[760px]:col-start-3">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
