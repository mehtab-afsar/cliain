import Link from "next/link";
import { BUTTON, FOCUS_RING, HEADING_FONT } from "../styles";

export function CloseSection() {
  return (
    <section id="start" className="border-t border-[var(--line)] py-[104px] text-left">
      <div className="mx-auto max-w-[1120px] px-7">
        <div className="grid grid-cols-1 items-center gap-10 min-[760px]:grid-cols-[1fr_auto]">
          <div>
            <h2
              className={`max-w-[18ch] text-[clamp(30px,3.6vw,44px)] leading-[1.08] font-medium tracking-[-0.03em] ${HEADING_FONT}`}
            >
              Your front desk, live in five minutes.
            </h2>
            <p className="mt-3 max-w-[40ch] text-[var(--ink-2)]">
              Connect the WhatsApp number your clinic already uses. No card, no contract, nothing
              to replace.
            </p>
          </div>
          <Link href="/onboarding" className={`${BUTTON.primaryLg} ${FOCUS_RING}`}>
            Connect your WhatsApp number
          </Link>
        </div>
      </div>
    </section>
  );
}
