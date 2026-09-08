/** Pill button class strings shared across the landing page's few CTA usages. */
export const BUTTON = {
  primarySm:
    "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-4 py-[9px] text-sm font-medium text-white transition-colors hover:bg-[#0c1510]",
  primaryLg:
    "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-6 py-[15px] text-base font-medium text-white transition-colors hover:bg-[#0c1510]",
  ghostLg:
    "inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] px-6 py-[15px] text-base font-medium text-[var(--ink)] transition-colors hover:bg-[var(--paper-2)]",
};

/** `:focus-visible` ring matching the reference spec — append to any interactive element. */
export const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--green)] focus-visible:outline-offset-[3px] focus-visible:rounded";

/**
 * The app's global stylesheet sets `h1,h2,h3{font-family:var(--font-heading)}` (Fraunces) —
 * an element selector, which beats an inherited font-family from an ancestor class. Every
 * h1/h2/h3 on this page needs this appended directly to win that specificity fight and render
 * in Instrument Sans instead (registered as --font-instrument-sans on the page wrapper).
 */
export const HEADING_FONT = "font-[family-name:var(--font-instrument-sans)]";
