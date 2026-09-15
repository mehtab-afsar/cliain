import "server-only";
import { randomBytes } from "node:crypto";
import type { calendar_v3 } from "googleapis";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { calendarWebhookUrl } from "@/lib/env";
import { getCalendarClient } from "./calendar-sync";
import { cancelAppointment } from "./appointment-service";

/**
 * Real-time mirror of the one-way write path in calendar-sync.ts: when a doctor edits or
 * deletes an appointment directly in their Google Calendar (not through the app), this keeps
 * Postgres in sync via Google's push notifications (events.watch) — otherwise reminders and
 * the dashboard would keep showing a time the doctor already moved or a cancellation the
 * doctor already made on their own calendar.
 *
 * Everything here is best-effort: booking must never depend on live sync succeeding. A watch
 * that fails to register just means no real-time updates for that doctor until the next
 * renewal pass — not a broken booking flow.
 */

function isGoogleGoneError(error: unknown): boolean {
  const status = (error as { code?: number; status?: number; response?: { status?: number } })?.status
    ?? (error as { code?: number; response?: { status?: number } })?.response?.status
    ?? (error as { code?: number })?.code;
  return status === 410;
}

/** Establishes the incremental-sync cursor without acting on any existing events — the very
 *  first events.list call after a fresh watch just needs a nextSyncToken to read forward from. */
async function bootstrapSyncToken(doctorId: string, calendarId: string): Promise<void> {
  const calendar = await getCalendarClient(doctorId);
  if (!calendar) return;

  let pageToken: string | undefined;
  let syncToken: string | undefined;
  do {
    const { data } = await calendar.events.list({
      calendarId,
      pageToken,
      timeMin: new Date().toISOString(),
    });
    pageToken = data.nextPageToken ?? undefined;
    syncToken = data.nextSyncToken ?? syncToken;
  } while (pageToken);

  if (syncToken) {
    await db.doctor.update({ where: { id: doctorId }, data: { googleCalendarSyncToken: syncToken } });
  }
}

/** Registers (or re-registers) a Calendar push-notification channel for this doctor. Silently
 *  no-ops if no publicly reachable webhook URL is configured (e.g. local dev without a tunnel)
 *  — that's a normal, expected state, not an error. */
export async function startWatchingCalendar(doctorId: string, calendarId: string): Promise<void> {
  const publicUrl = calendarWebhookUrl();
  if (!publicUrl) return;

  const channelId = randomBytes(16).toString("hex");
  const token = randomBytes(24).toString("hex");

  try {
    const calendar = await getCalendarClient(doctorId);
    if (!calendar) return;

    const { data } = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: `${publicUrl}/api/webhooks/google-calendar/${channelId}`,
        token,
      },
    });

    await db.doctor.update({
      where: { id: doctorId },
      data: {
        googleCalendarWatchChannelId: channelId,
        googleCalendarWatchResourceId: data.resourceId ?? null,
        googleCalendarWatchExpiresAt: data.expiration ? new Date(Number(data.expiration)) : null,
        googleCalendarWatchToken: encryptSecret(token),
      },
    });

    await bootstrapSyncToken(doctorId, calendarId);
  } catch (error) {
    console.error(`[calendar-watch] Failed to start watch for doctor ${doctorId}:`, error);
  }
}

/** Tells Google to stop sending notifications for this doctor's current channel, and clears
 *  the stored channel/sync state. Safe to call even if no watch is currently registered. */
export async function stopWatchingCalendar(doctorId: string): Promise<void> {
  const doctor = await db.doctor.findUnique({ where: { id: doctorId } });
  if (doctor?.googleCalendarWatchChannelId && doctor.googleCalendarWatchResourceId) {
    try {
      const calendar = await getCalendarClient(doctorId);
      if (calendar) {
        await calendar.channels.stop({
          requestBody: {
            id: doctor.googleCalendarWatchChannelId,
            resourceId: doctor.googleCalendarWatchResourceId,
          },
        });
      }
    } catch (error) {
      console.error(`[calendar-watch] Failed to stop watch for doctor ${doctorId}:`, error);
    }
  }

  await db.doctor.update({
    where: { id: doctorId },
    data: {
      googleCalendarWatchChannelId: null,
      googleCalendarWatchResourceId: null,
      googleCalendarWatchExpiresAt: null,
      googleCalendarWatchToken: null,
      googleCalendarSyncToken: null,
    },
  });
}

/**
 * Reconciles one changed Calendar event back onto the Appointment it was tagged with at
 * creation time (extendedProperties.private.appointmentId — see createCalendarEvent). Events
 * with no such tag are the doctor's own unrelated calendar entries (e.g. lunch) and are
 * skipped; the freebusy read-back in availability-service.ts is what accounts for those.
 */
async function applyExternalCalendarChange(doctorId: string, event: calendar_v3.Schema$Event): Promise<void> {
  const appointmentId = event.extendedProperties?.private?.appointmentId;
  if (!appointmentId) return;

  const appointment = await db.appointment.findFirst({ where: { id: appointmentId, doctorId } });
  if (!appointment || appointment.status !== "booked") return;

  const by = { actor: "google-calendar-sync" };

  if (event.status === "cancelled") {
    await cancelAppointment(doctorId, appointment.id, by, "Cancelled directly on Google Calendar", {
      skipCalendarSync: true,
    });
    return;
  }

  const newStartAt = event.start?.dateTime ? new Date(event.start.dateTime) : null;
  const newEndAt = event.end?.dateTime ? new Date(event.end.dateTime) : null;
  if (!newStartAt || !newEndAt) return;
  if (newStartAt.getTime() === appointment.startAt.getTime() && newEndAt.getTime() === appointment.endAt.getTime()) {
    return;
  }

  // A reconciliation job runs alone (nothing else is racing this particular write), so a plain
  // conflict check is enough — no need for writeIfSlotFree's Serializable transaction here.
  const conflict = await db.appointment.findFirst({
    where: {
      doctorId,
      status: "booked",
      id: { not: appointment.id },
      startAt: { lt: newEndAt },
      endAt: { gt: newStartAt },
    },
  });

  if (conflict) {
    // Don't silently drop the doctor's calendar action, and don't silently overwrite another
    // booking either — flag it on the existing field meant for exactly this ("something's
    // wrong with this appointment's calendar mirror, needs a human"), and log it on the trail.
    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        googleCalendarSyncError: `Google Calendar shows this moved to ${newStartAt.toISOString()}, but that conflicts with another booking — needs manual review.`,
      },
    });
    await db.appointmentEvent.create({
      data: {
        appointmentId: appointment.id,
        doctorId,
        fromStatus: appointment.status,
        toStatus: appointment.status,
        actor: by.actor,
        reason: "Time changed on Google Calendar, but the new time conflicts with another booking.",
      },
    });
    return;
  }

  await db.appointment.update({
    where: { id: appointment.id },
    data: { startAt: newStartAt, endAt: newEndAt, googleCalendarSyncError: null },
  });
  await db.appointmentEvent.create({
    data: {
      appointmentId: appointment.id,
      doctorId,
      fromStatus: appointment.status,
      toStatus: appointment.status,
      actor: by.actor,
      reason: "Time changed directly on Google Calendar.",
    },
  });
}

/**
 * Called when a push notification arrives — the notification itself carries no event data,
 * just a signal that *something* changed, so this pages through events.list with the stored
 * syncToken to find out what. A 410 Gone means the token expired or was invalidated; the only
 * recovery is dropping it and re-establishing a fresh baseline (bootstrapSyncToken), which
 * means any changes made during the gap are missed — an accepted gap for an MVP, since the
 * freebusy read-back in availability-service.ts still protects against double-booking even
 * when incremental sync has fallen behind.
 */
export async function reconcileCalendarChanges(doctorId: string): Promise<void> {
  const doctor = await db.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor?.googleCalendarId) return;

  const calendar = await getCalendarClient(doctorId);
  if (!calendar) return;

  if (!doctor.googleCalendarSyncToken) {
    await bootstrapSyncToken(doctorId, doctor.googleCalendarId);
    return;
  }

  let pageToken: string | undefined;
  const changedEvents: calendar_v3.Schema$Event[] = [];

  try {
    do {
      const { data } = await calendar.events.list({
        calendarId: doctor.googleCalendarId,
        syncToken: doctor.googleCalendarSyncToken,
        pageToken,
        showDeleted: true,
      });
      changedEvents.push(...(data.items ?? []));
      pageToken = data.nextPageToken ?? undefined;
      if (!pageToken && data.nextSyncToken) {
        await db.doctor.update({
          where: { id: doctorId },
          data: { googleCalendarSyncToken: data.nextSyncToken },
        });
      }
    } while (pageToken);
  } catch (error) {
    if (isGoogleGoneError(error)) {
      await db.doctor.update({ where: { id: doctorId }, data: { googleCalendarSyncToken: null } });
      await bootstrapSyncToken(doctorId, doctor.googleCalendarId);
      return;
    }
    console.error(`[calendar-watch] reconcile failed for doctor ${doctorId}:`, error);
    return;
  }

  for (const event of changedEvents) {
    try {
      await applyExternalCalendarChange(doctorId, event);
    } catch (error) {
      console.error(`[calendar-watch] Failed to apply change for doctor ${doctorId}, event ${event.id}:`, error);
    }
  }
}

/**
 * Renews any watch channel expiring soon (Google caps a channel at ~1 month) — Google doesn't
 * auto-replace an expiring channel, a fresh events.watch call is required. Wired into the
 * existing 5-minute cron (see scheduler-service.ts's runScheduledJobs), which covers both the
 * in-process node-cron path and the serverless /api/cron/reminders path with no extra wiring.
 */
export async function renewExpiringCalendarWatches(): Promise<{ renewed: number; failed: number }> {
  // No point querying doctors at all if there's nowhere for Google to send notifications —
  // startWatchingCalendar would just no-op for every one of them (e.g. local dev, no tunnel).
  if (!calendarWebhookUrl()) return { renewed: 0, failed: 0 };

  const expiringSoon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const doctors = await db.doctor.findMany({
    where: {
      googleCalendarRefreshToken: { not: null },
      googleCalendarId: { not: null },
      OR: [{ googleCalendarWatchExpiresAt: null }, { googleCalendarWatchExpiresAt: { lt: expiringSoon } }],
    },
  });

  let renewed = 0;
  let failed = 0;
  for (const doctor of doctors) {
    try {
      await stopWatchingCalendar(doctor.id);
      await startWatchingCalendar(doctor.id, doctor.googleCalendarId!);
      renewed += 1;
    } catch (error) {
      failed += 1;
      console.error(`[calendar-watch] Failed to renew watch for doctor ${doctor.id}:`, error);
    }
  }
  return { renewed, failed };
}
