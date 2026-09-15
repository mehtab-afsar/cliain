import "server-only";
import { google } from "googleapis";
import { getGoogleCalendarRefreshToken } from "@/lib/integration-credentials";
import { env } from "@/lib/env";

/** OAuth2Client mints a fresh access token from the stored refresh token on demand — no
 *  manual token-refresh logic needed here, same as the old JWT client self-minted per request. */
export async function getCalendarClient(doctorId: string) {
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
  // Tagged onto the Calendar event as extendedProperties.private.appointmentId, so a later
  // incremental sync (calendar-watch-service.ts) can reliably match an externally-edited
  // event back to the Appointment row that created it, without relying on googleCalendarEventId
  // alone (which can't be looked up efficiently from an events.list page).
  appointmentId: string;
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
        extendedProperties: { private: { appointmentId: details.appointmentId } },
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

export type BusyInterval = { start: Date; end: Date };

/**
 * Reads time blocked directly on the doctor's real Google Calendar (an event created outside
 * this app, or one of ours) via the purpose-built freebusy endpoint — no paging, and it never
 * leaks event titles/attendees into availability logic, which matters since `calendarId` may
 * be the doctor's own primary personal calendar.
 *
 * Best-effort, fail-open: a Calendar outage or misconfiguration must never block booking, it
 * only means this read-back is skipped for that check (the existing Postgres check still runs).
 */
export async function getBusyIntervals(
  doctorId: string,
  calendarId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<BusyInterval[]> {
  try {
    const calendar = await getCalendarClient(doctorId);
    if (!calendar) return [];

    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: windowStart.toISOString(),
        timeMax: windowEnd.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busy = data.calendars?.[calendarId]?.busy ?? [];
    return busy
      .filter((block) => block.start && block.end)
      .map((block) => ({ start: new Date(block.start!), end: new Date(block.end!) }));
  } catch (error) {
    console.error(`[calendar-sync] freebusy query failed for doctor ${doctorId}:`, error);
    return [];
  }
}
