/**
 * Supported UI *locales* — the staff-facing dashboard chrome's language (English/Hindi).
 *
 * This is deliberately a different axis from `template.labels` (src/features/templates):
 * labels are vertical terminology ("Patient" vs "Member"), are resolved per-tenant, and are
 * English-only today. Locale is "what language does the text around those labels render in" —
 * sourced from a plain `NEXT_LOCALE` cookie (see request.ts), not from the tenant/template. Do
 * not wire template code to read locale, and do not make `template.labels` locale-aware here.
 */
export const locales = ["en", "hi"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value);
}
