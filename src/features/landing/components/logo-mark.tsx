import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  /** Renders just the initial, for collapsed/constrained layouts. */
  compact?: boolean;
};

export function LogoMark({ className, compact }: LogoMarkProps) {
  return (
    <span
      className={cn(
        "font-heading text-foreground",
        compact ? "text-lg" : "text-xl font-medium tracking-tight",
        className,
      )}
    >
      {compact ? "C" : "Cliain"}
    </span>
  );
}
