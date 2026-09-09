import "server-only";
import { google } from "googleapis";
import { getGoogleCalendarRefreshToken } from "@/lib/integration-credentials";
import { env } from "@/lib/env";

/** OAuth2Client mints a fresh access token from the stored refresh token on demand — no
 *  manual token-refresh logic needed here, same as the old JWT client self-minted per request. */
async function getCalendarClient(doctorId: string) {
  const refreshToken = await getGoogleCalendarRefreshToken(doctorId);
  if (!refreshToken || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;

  const auth = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth });
}

export type CalendarSyncResult =
  | { ok: true; eventId: string }
  | { ok: false; error: string };

type EventDetails = {
  doctorId: string;
  calendarId: string;
  summary: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
};

/** Best-effort: Postgres is the source of truth, Calendar is a one-way mirror. Never throws. */
export async function createCalendarEvent(details: EventDetails): Promise<CalendarSyncResult> {
  try {
    const calendar = await getCalendarClient(details.doctorId);
    if (!calendar) return { ok: false, error: "Google Calendar is not configured." };

    const response = await calendar.events.insert({
      calendarId: details.calendarId,
      requestBody: {
        summary: details.summary,
        description: details.description,
        start: { dateTime: details.startAt.toISOString(), timeZone: details.timezone },
        end: { dateTime: details.endAt.toISOString(), timeZone: details.timezone },
      },
    });
    const eventId = response.data.id;
    if (!eventId) return { ok: false, error: "Calendar API did not return an event id." };
    return { ok: true, eventId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown Calendar API error." };
  }
}

export async function updateCalendarEvent(
  doctorId: string,
  calendarId: string,
  eventId: string,
  patch: { startAt: Date; endAt: Date; timezone: string },
): Promise<CalendarSyncResult> {
  try {
    const calendar = await getCalendarClient(doctorId);
    if (!calendar) return { ok: false, error: "Google Calendar is not configured." };

    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        start: { dateTime: patch.startAt.toISOString(), timeZone: patch.timezone },
        end: { dateTime: patch.endAt.toISOString(), timeZone: patch.timezone },
      },
    });
    return { ok: true, eventId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown Calendar API error." };
  }
}

export async function deleteCalendarEvent(
  doctorId: string,
  calendarId: string,
  eventId: string,
): Promise<CalendarSyncResult> {
  try {
    const calendar = await getCalendarClient(doctorId);
    if (!calendar) return { ok: false, error: "Google Calendar is not configured." };

    await calendar.events.delete({ calendarId, eventId });
    return { ok: true, eventId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown Calendar API error." };
  }
}
