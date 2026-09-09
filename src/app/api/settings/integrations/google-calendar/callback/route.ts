import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { completeGoogleCalendarConnection, GOOGLE_CALENDAR_OAUTH_STATE_COOKIE } from "@/lib/google-calendar-oauth";
import { encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";

const SETTINGS_PATH = "/dashboard/settings/integrations";

function redirectToSettings(origin: string, result: "connected" | "cancelled" | "error") {
  return NextResponse.redirect(new URL(`${SETTINGS_PATH}?googleCalendar=${result}`, origin));
}

/** Where Google sends the clinic back after the consent screen. Same-site top-level
 *  navigation, so the clinic's own session cookie from earlier in this same browser is still
 *  present — requireCurrentDoctor() re-derives doctorId from *that*, never from `state` (state
 *  is CSRF protection only, not an identity carrier). */
export async function GET(request: Request) {
  const { doctorId } = await requireCurrentDoctor();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const deniedByUser = url.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE);

  if (deniedByUser) {
    // The clinic clicked "Cancel" on Google's consent screen — not an error, just a no-op.
    return redirectToSettings(url.origin, "cancelled");
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToSettings(url.origin, "error");
  }

  try {
    const { refreshToken, email } = await completeGoogleCalendarConnection(code);
    const current = await db.doctor.findUnique({ where: { id: doctorId }, select: { googleCalendarId: true } });

    await db.doctor.update({
      where: { id: doctorId },
      data: {
        googleCalendarRefreshToken: encryptSecret(refreshToken),
        googleCalendarAccountEmail: email,
        // Preserve a previously chosen calendar across a reconnect; default a fresh connect
        // to the account's own main calendar.
        ...(current?.googleCalendarId ? {} : { googleCalendarId: "primary" }),
      },
    });

    return redirectToSettings(url.origin, "connected");
  } catch (error) {
    console.error("[google-calendar-oauth] Failed to complete connection:", error);
    return redirectToSettings(url.origin, "error");
  }
}
