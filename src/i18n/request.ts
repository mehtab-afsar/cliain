import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isAppLocale, LOCALE_COOKIE } from "./config";

/**
 * next-intl's per-request configuration — deliberately *not* using next-intl's routing/
 * middleware integration (no `/en/...`, `/hi/...` URL segments). This dashboard sits behind
 * auth, not a public multi-locale site, so we use the plain-cookie pattern instead: the locale
 * is whatever `NEXT_LOCALE` says (set by the language switcher's server action, see
 * i18n/actions.ts), defaulting to English for first-time visitors.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isAppLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
