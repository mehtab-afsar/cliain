// Placeholder testimonials — replace with real ones before launch.
const QUOTES = [
  {
    text: "We used to lose the calls that came in while I was with a patient. Now they're just on the calendar when I look up.",
    initial: "R",
    name: "Dr. Ana Rivera, family practice, solo clinic",
  },
  {
    text: "Members used to text the front desk and wait an hour for a reply. Now they book the class themselves and it's already on my schedule.",
    initial: "M",
    name: "Marcus Ide, owner, independent gym",
  },
];

export function QuoteSection() {
  return (
    <section className="pt-10 pb-[104px]">
      <div className="mx-auto max-w-[1120px] px-7">
        <div className="grid grid-cols-1 gap-12 min-[760px]:grid-cols-2 min-[760px]:gap-16">
          {QUOTES.map((quote) => (
            <figure key={quote.name}>
              <blockquote className="max-w-[26ch] text-[clamp(20px,2.2vw,26px)] leading-[1.3] font-normal tracking-[-0.02em]">
                &quot;{quote.text}&quot;
              </blockquote>
              <figcaption className="mt-[22px] flex items-center gap-3 text-[15px] text-[var(--muted)]">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-[13px] font-semibold text-white"
                  aria-hidden="true"
                >
                  {quote.initial}
                </span>
                {quote.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
