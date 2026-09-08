// Placeholder testimonial — replace with a real one before launch.
export function QuoteSection() {
  return (
    <section className="pt-10 pb-[104px]">
      <div className="mx-auto max-w-[1120px] px-7">
        <figure>
          <blockquote className="max-w-[26ch] text-[clamp(22px,2.6vw,30px)] leading-[1.3] font-normal tracking-[-0.02em]">
            &quot;We used to lose the calls that came in while I was with a patient. Now
            they&apos;re just on the calendar when I look up.&quot;
          </blockquote>
          <figcaption className="mt-[22px] flex items-center gap-3 text-[15px] text-[var(--muted)]">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-[13px] font-semibold text-white"
              aria-hidden="true"
            >
              R
            </span>
            Dr. Ana Rivera, family practice, solo clinic
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
