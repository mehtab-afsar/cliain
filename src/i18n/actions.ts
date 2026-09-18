"use server";

import { cookies } from "next/headers";
import { isAppLocale, LOCALE_COOKIE } from "./config";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persists the staff member's dashboard-language preference as a plain cookie — no Prisma
 * column, no per-tenant setting; this is a per-browser UI preference, not tenant data (see
 * request.ts's doc comment for why locale and `template.labels` are kept separate).
 *
 * Cookie writes can't happen during render (see Next's docs on Server Functions), so this has
 * to be a Server Function; the language switcher calls it and then triggers a router refresh so
 * the server tree (which reads the cookie in i18n/request.ts) re-renders with the new locale.
 */
export async function setLocaleAction(locale: string): Promise<void> {
  if (!isAppLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: ONE_YEAR_IN_SECONDS,
    path: "/",
    sameSite: "lax",
  });
}
