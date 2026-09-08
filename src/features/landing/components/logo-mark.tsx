import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  /** Renders just the icon, for collapsed/constrained layouts. */
  compact?: boolean;
};

/** The app-wide brand mark — sidebar, top-nav, login, onboarding, invitations. Same icon
 * construction as the landing page's own `BrandMark`, built from the shared `primary` token
 * (now the same green everywhere) rather than a landing-specific literal color. */
export function LogoMark({ className, compact }: LogoMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-heading text-foreground", className)}>
      <span
        className="relative inline-block h-[22px] w-[22px] shrink-0 rounded-[7px] bg-primary"
        aria-hidden="true"
      >
        <span className="absolute top-[6px] left-[6px] h-[10px] w-[10px] rounded-full bg-primary-foreground" />
      </span>
      {compact ? null : <span className="text-xl font-medium tracking-tight">Cliain</span>}
    </span>
  );
}
