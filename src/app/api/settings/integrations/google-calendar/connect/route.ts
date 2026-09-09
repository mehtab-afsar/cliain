import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import {
  buildGoogleCalendarAuthUrl,
  googleCalendarConfigured,
  GOOGLE_CALENDAR_OAUTH_STATE_COOKIE,
} from "@/lib/google-calendar-oauth";

/** The "Connect Google Calendar" button in Settings links straight here (a real navigation,
 *  not a fetch) — this redirects on to Google's normal consent screen, same shape as the
 *  existing "Continue with Google" sign-in, just asking for calendar access instead of
 *  identity. */
export async function GET() {
  await requireCurrentDoctor();

  if (!googleCalendarConfigured()) {
    return NextResponse.json(
      { error: "Google Calendar isn't configured on this deployment yet." },
      { status: 400 },
    );
  }

  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });

  return NextResponse.redirect(buildGoogleCalendarAuthUrl(state));
}
