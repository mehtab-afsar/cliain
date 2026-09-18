import Link from "next/link";
import { ConversationDemo } from "../components/conversation-demo";
import { BUTTON, FOCUS_RING, HEADING_FONT } from "../styles";

const FACTS = [
  { title: "Answers around the clock", body: "Nights, weekends, and the lunch hour." },
  { title: "Replies in under 15 seconds", body: "Text or voice, no hold music." },
  { title: "Never double-books", body: "Every slot is checked before it's offered." },
];

export function HeroSection() {
  return (
    <section className="pt-20 pb-14">
      <div className="mx-auto max-w-[1120px] px-7">
        <div className="grid grid-cols-1 items-center gap-11 min-[900px]:grid-cols-[1.05fr_0.95fr] min-[900px]:gap-16">
          <div>
            <h1
              className={`max-w-[11ch] text-[clamp(40px,5.4vw,66px)] leading-[1.02] font-medium tracking-[-0.035em] ${HEADING_FONT}`}
            >
              Every call answered. Every booking on your calendar.
            </h1>
            <p className="mt-[26px] max-w-[44ch] text-[19px] leading-[1.5] text-[var(--ink-2)]">
              Cliain answers your business&apos;s WhatsApp and phone, checks the hours you actually
              have free, and books the visit — a patient with a doctor, a member into a class.
              Nothing for them to install. No one for you to hire.
            </p>
            <div className="mt-[34px] flex flex-wrap items-center gap-3">
              <Link href="/onboarding" className={`${BUTTON.primaryLg} ${FOCUS_RING}`}>
                Connect your WhatsApp number
              </Link>
              <a href="#how" className={`${BUTTON.ghostLg} ${FOCUS_RING}`}>
                See how a booking happens
              </a>
            </div>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Free to set up. Takes about five minutes. Keep the phone number you already have.
            </p>
          </div>

          <ConversationDemo />
        </div>

        <div className="mt-16 border-t border-b border-[var(--line)]">
          <ul className="grid grid-cols-1 min-[700px]:grid-cols-3">
            {FACTS.map((fact, index) => (
              <li
                key={fact.title}
                className={`py-[22px] text-[15px] text-[var(--ink-2)] ${
                  index > 0
                    ? "border-t border-[var(--line)] min-[700px]:border-t-0 min-[700px]:border-l min-[700px]:pl-7"
                    : ""
                }`}
              >
                <b className="block text-[17px] font-medium text-[var(--ink)]">{fact.title}</b>
                {fact.body}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
