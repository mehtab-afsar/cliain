import Link from "next/link";
import { FOCUS_RING } from "../styles";

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--line)] py-7 text-sm text-[var(--muted)]">
      <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-3 px-7">
        <span>© 2026 Cliain</span>
        <nav className="flex items-center gap-5">
          <Link href="/privacy" className={`transition-colors hover:text-[var(--ink)] ${FOCUS_RING}`}>
            Privacy
          </Link>
          <Link href="/terms" className={`transition-colors hover:text-[var(--ink)] ${FOCUS_RING}`}>
            Terms
          </Link>
          <a
            href="mailto:hello@cliain.com"
            className={`transition-colors hover:text-[var(--ink)] ${FOCUS_RING}`}
          >
            hello@cliain.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
