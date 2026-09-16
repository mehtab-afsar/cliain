import "server-only";
import { randomBytes } from "node:crypto";
import type { calendar_v3 } from "googleapis";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { calendarWebhookUrl } from "@/lib/env";
import { getCalendarClient } from "./calendar-sync";
import { cancelAppointment } from "./appointment-service";

/**
 * Real-time mirror of the one-way write path in calendar-sync.ts: when a tenant edits or
 * deletes a booking directly in their Google Calendar (not through the app), this keeps
 * Postgres in sync via Google's push notifications (events.watch) — otherwise reminders and
 * the dashboard would keep showing a time the tenant already moved or a cancellation the
 * tenant already made on their own calendar.
 *
 * Everything here is best-effort: booking must never depend on live sync succeeding. A watch
 * that fails to register just means no real-time updates for that tenant until the next
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
async function bootstrapSyncToken(tenantId: string, calendarId: string): Promise<void> {
  const calendar = await getCalendarClient(tenantId);
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
    await db.tenant.update({ where: { id: tenantId }, data: { googleCalendarSyncToken: syncToken } });
  }
}

/** Registers (or re-registers) a Calendar push-notification channel for this tenant. Silently
 *  no-ops if no publicly reachable webhook URL is configured (e.g. local dev without a tunnel)
 *  — that's a normal, expected state, not an error. */
export async function startWatchingCalendar(tenantId: string, calendarId: string): Promise<void> {
  const publicUrl = calendarWebhookUrl();
  if (!publicUrl) return;

  const channelId = randomBytes(16).toString("hex");
  const token = randomBytes(24).toString("hex");

  try {
    const calendar = await getCalendarClient(tenantId);
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

    await db.tenant.update({
      where: { id: tenantId },
      data: {
        googleCalendarWatchChannelId: channelId,
        googleCalendarWatchResourceId: data.resourceId ?? null,
        googleCalendarWatchExpiresAt: data.expiration ? new Date(Number(data.expiration)) : null,
        googleCalendarWatchToken: encryptSecret(token),
      },
    });

    await bootstrapSyncToken(tenantId, calendarId);
  } catch (error) {
    console.error(`[calendar-watch] Failed to start watch for tenant ${tenantId}:`, error);
  }
}

/** Tells Google to stop sending notifications for this tenant's current channel, and clears
 *  the stored channel/sync state. Safe to call even if no watch is currently registered. */
export async function stopWatchingCalendar(tenantId: string): Promise<void> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (tenant?.googleCalendarWatchChannelId && tenant.googleCalendarWatchResourceId) {
    try {
      const calendar = await getCalendarClient(tenantId);
      if (calendar) {
        await calendar.channels.stop({
          requestBody: {
            id: tenant.googleCalendarWatchChannelId,
            resourceId: tenant.googleCalendarWatchResourceId,
          },
        });
      }
    } catch (error) {
      console.error(`[calendar-watch] Failed to stop watch for tenant ${tenantId}:`, error);
    }
  }

  await db.tenant.update({
    where: { id: tenantId },
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
 * Reconciles one changed Calendar event back onto the Booking it was tagged with at creation
 * time (extendedProperties.private.bookingId — see createCalendarEvent). Events with no such
 * tag are the tenant's own unrelated calendar entries (e.g. lunch) and are skipped; the
 * freebusy read-back in availability-service.ts is what accounts for those.
 */
async function applyExternalCalendarChange(tenantId: string, event: calendar_v3.Schema$Event): Promise<void> {
  const bookingId = event.extendedProperties?.private?.bookingId;
  if (!bookingId) return;

  const booking = await db.booking.findFirst({ where: { id: bookingId, tenantId } });
  if (!booking || booking.status !== "booked") return;

  const by = { actor: "google-calendar-sync" };

  if (event.status === "cancelled") {
    await cancelAppointment(tenantId, booking.id, by, "Cancelled directly on Google Calendar", {
      skipCalendarSync: true,
    });
    return;
  }

  const newStartAt = event.start?.dateTime ? new Date(event.start.dateTime) : null;
  const newEndAt = event.end?.dateTime ? new Date(event.end.dateTime) : null;
  if (!newStartAt || !newEndAt) return;
  if (newStartAt.getTime() === booking.startAt.getTime() && newEndAt.getTime() === booking.endAt.getTime()) {
    return;
  }

  // A reconciliation job runs alone (nothing else is racing this particular write), so a plain
  // conflict check is enough — no need for writeIfSlotFree's Serializable transaction here.
  // Scoped by resourceId, not tenantId, for the same reason as the transactional guard in
  // appointment-service.ts: a tenant can have more than one bookable resource.
  const conflict = await db.booking.findFirst({
    where: {
      resourceId: booking.resourceId,
      status: "booked",
      id: { not: booking.id },
      startAt: { lt: newEndAt },
      endAt: { gt: newStartAt },
    },
  });

  if (conflict) {
    // Don't silently drop the tenant's calendar action, and don't silently overwrite another
    // booking either — flag it on the existing field meant for exactly this ("something's
    // wrong with this booking's calendar mirror, needs a human"), and log it on the trail.
    await db.booking.update({
      where: { id: booking.id },
      data: {
        googleCalendarSyncError: `Google Calendar shows this moved to ${newStartAt.toISOString()}, but that conflicts with another booking — needs manual review.`,
      },
    });
    await db.bookingEvent.create({
      data: {
        bookingId: booking.id,
        tenantId,
        fromStatus: booking.status,
        toStatus: booking.status,
        actor: by.actor,
        reason: "Time changed on Google Calendar, but the new time conflicts with another booking.",
      },
    });
    return;
  }

  await db.booking.update({
    where: { id: booking.id },
    data: { startAt: newStartAt, endAt: newEndAt, googleCalendarSyncError: null },
  });
  await db.bookingEvent.create({
    data: {
      bookingId: booking.id,
      tenantId,
      fromStatus: booking.status,
      toStatus: booking.status,
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
export async function reconcileCalendarChanges(tenantId: string): Promise<void> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.googleCalendarId) return;

  const calendar = await getCalendarClient(tenantId);
  if (!calendar) return;

  if (!tenant.googleCalendarSyncToken) {
    await bootstrapSyncToken(tenantId, tenant.googleCalendarId);
    return;
  }

  let pageToken: string | undefined;
  const changedEvents: calendar_v3.Schema$Event[] = [];

  try {
    do {
      const { data } = await calendar.events.list({
        calendarId: tenant.googleCalendarId,
        syncToken: tenant.googleCalendarSyncToken,
        pageToken,
        showDeleted: true,
      });
      changedEvents.push(...(data.items ?? []));
      pageToken = data.nextPageToken ?? undefined;
      if (!pageToken && data.nextSyncToken) {
        await db.tenant.update({
          where: { id: tenantId },
          data: { googleCalendarSyncToken: data.nextSyncToken },
        });
      }
    } while (pageToken);
  } catch (error) {
    if (isGoogleGoneError(error)) {
      await db.tenant.update({ where: { id: tenantId }, data: { googleCalendarSyncToken: null } });
      await bootstrapSyncToken(tenantId, tenant.googleCalendarId);
      return;
    }
    console.error(`[calendar-watch] reconcile failed for tenant ${tenantId}:`, error);
    return;
  }

  for (const event of changedEvents) {
    try {
      await applyExternalCalendarChange(tenantId, event);
    } catch (error) {
      console.error(`[calendar-watch] Failed to apply change for tenant ${tenantId}, event ${event.id}:`, error);
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
  // No point querying tenants at all if there's nowhere for Google to send notifications —
  // startWatchingCalendar would just no-op for every one of them (e.g. local dev, no tunnel).
  if (!calendarWebhookUrl()) return { renewed: 0, failed: 0 };

  const expiringSoon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tenants = await db.tenant.findMany({
    where: {
      googleCalendarRefreshToken: { not: null },
      googleCalendarId: { not: null },
      OR: [{ googleCalendarWatchExpiresAt: null }, { googleCalendarWatchExpiresAt: { lt: expiringSoon } }],
    },
  });

  let renewed = 0;
  let failed = 0;
  for (const tenant of tenants) {
    try {
      await stopWatchingCalendar(tenant.id);
      await startWatchingCalendar(tenant.id, tenant.googleCalendarId!);
      renewed += 1;
    } catch (error) {
      failed += 1;
      console.error(`[calendar-watch] Failed to renew watch for tenant ${tenant.id}:`, error);
    }
  }
  return { renewed, failed };
}
