/**
 * The new landing page's own brand mark — a green rounded square with a centered white dot,
 * matching the reference design's `.brand i` construction. Deliberately separate from the
 * shared `logo-mark.tsx` (used across dashboard/onboarding/login/invitations, which keeps its
 * current warm-palette wordmark) — this one is landing-only.
 */
export function BrandMark() {
  return (
    <span className="inline-flex items-center gap-2.5 text-[19px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
      <span className="relative inline-block h-[22px] w-[22px] shrink-0 rounded-[7px] bg-[var(--green)]" aria-hidden="true">
        <span className="absolute top-[6px] left-[6px] h-[10px] w-[10px] rounded-full bg-white" />
      </span>
      Cliain
    </span>
  );
}
