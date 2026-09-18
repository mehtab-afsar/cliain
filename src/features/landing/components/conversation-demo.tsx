const MESSAGES: { from: "in" | "out"; text: string; time: string; delay: string }[] = [
  {
    from: "out",
    text: "Hi, can I get an appointment for my son this week? He has a cough.",
    time: "9:41",
    delay: "0.4s",
  },
  {
    from: "in",
    text: "Of course. Dr. Rivera has Thursday at 10:20 or Friday at 3:00. Which works better?",
    time: "9:41",
    delay: "1.5s",
  },
  { from: "out", text: "Thursday please", time: "9:42", delay: "2.7s" },
  {
    from: "in",
    text: "Booked — Thursday 11 Sep, 10:20 with Dr. Rivera. I'll text you a reminder the day before.",
    time: "9:42",
    delay: "3.9s",
  },
  { from: "out", text: "Thank you!", time: "9:42", delay: "4.9s" },
];

const BUBBLE_ANIMATION =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-[450ms] motion-safe:ease-out";

export function ConversationDemo() {
  return (
    <div className="relative" aria-label="Example WhatsApp conversation handled by Cliain">
      <div className="mx-auto max-w-[400px] rounded-[28px] border border-[var(--line)] bg-[var(--paper-2)] px-[18px] pt-[22px] pb-[18px] shadow-[0_30px_60px_-40px_rgba(20,32,27,0.25)] min-[900px]:mr-0 min-[900px]:ml-auto">
        <div className="mb-4 flex items-center gap-3 border-b border-[var(--line)] pb-4">
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-[15px] font-semibold text-white">
            R
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[var(--ink)]">Rivera Family Practice</p>
            <p className="text-[13px] text-[var(--muted)]">WhatsApp · answered by Cliain</p>
          </div>
        </div>

        <div className="flex min-h-[292px] flex-col gap-[9px]">
          {MESSAGES.map((message, index) => (
            <div
              key={index}
              className={
                message.from === "out"
                  ? `max-w-[84%] self-end rounded-2xl rounded-br-[5px] bg-[var(--wa)] px-[13px] py-[10px] text-[15px] leading-[1.4] text-[var(--ink)] ${BUBBLE_ANIMATION}`
                  : `max-w-[84%] self-start rounded-2xl rounded-bl-[5px] border border-[var(--line)] bg-white px-[13px] py-[10px] text-[15px] leading-[1.4] text-[var(--ink)] ${BUBBLE_ANIMATION}`
              }
              style={{ animationDelay: message.delay, animationFillMode: "both" }}
            >
              {message.text}
              <time className="mt-1 block text-right text-[11px] text-[var(--muted)]">{message.time}</time>
            </div>
          ))}
        </div>
      </div>

      {/*
        Absolute overlap (desktop) has room to sit left of the phone without touching the
        right-aligned last bubble. Below 900px the phone is too narrow for that gap — the
        card's own width would otherwise collide with "Thank you!" — so it drops into normal
        flow below the phone instead of overlapping it.
      */}
      <div
        role="status"
        className={`static mt-4 flex max-w-[400px] items-center gap-3 rounded-[14px] border border-[var(--line)] bg-white py-3 pr-[14px] pl-3 shadow-[0_20px_40px_-24px_rgba(20,32,27,0.3)] min-[900px]:absolute min-[900px]:bottom-[34px] min-[900px]:left-[-22px] min-[900px]:mt-0 ${BUBBLE_ANIMATION}`}
        style={{ animationDelay: "5.6s", animationFillMode: "both" }}
      >
        <div className="flex h-[48px] w-[44px] flex-col items-center justify-center rounded-[9px] bg-[var(--green-2)] leading-none text-[var(--green)]">
          <span className="mb-0.5 text-[10px] font-medium tracking-[0.02em]">THU</span>
          <span className="text-[20px] font-semibold">11</span>
        </div>
        <p className="text-[14px] leading-[1.35] text-[var(--ink)]">
          Mateo Alvarez · 10:20
          <span className="block text-[13px] text-[var(--muted)]">Added to Google Calendar</span>
        </p>
        <div
          aria-hidden="true"
          className="ml-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-[11px] text-white"
        >
          ✓
        </div>
      </div>

      <p className="mt-4 text-[13px] text-[var(--muted)] min-[900px]:text-right">
        Shown for a clinic booking a patient with a doctor — a gym booking a member into a class
        works the same way.
      </p>
    </div>
  );
}
