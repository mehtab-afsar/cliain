import "server-only";
import { readFileSync } from "node:fs";
import { google } from "googleapis";
import { env } from "@/lib/env";

const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"];

function loadServiceAccountCredentials(): { client_email: string; private_key: string } | null {
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }
  if (env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    return JSON.parse(readFileSync(env.GOOGLE_SERVICE_ACCOUNT_FILE, "utf-8"));
  }
  return null;
}

function getCalendarClient() {
  const credentials = loadServiceAccountCredentials();
  if (!credentials) return null;

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: CALENDAR_SCOPES,
  });
  return google.calendar({ version: "v3", auth });
}

export type CalendarSyncResult =
  | { ok: true; eventId: string }
  | { ok: false; error: string };

type EventDetails = {
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
    const calendar = getCalendarClient();
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
  calendarId: string,
  eventId: string,
  patch: { startAt: Date; endAt: Date; timezone: string },
): Promise<CalendarSyncResult> {
  try {
    const calendar = getCalendarClient();
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
  calendarId: string,
  eventId: string,
): Promise<CalendarSyncResult> {
  try {
    const calendar = getCalendarClient();
    if (!calendar) return { ok: false, error: "Google Calendar is not configured." };

    await calendar.events.delete({ calendarId, eventId });
    return { ok: true, eventId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown Calendar API error." };
  }
}
