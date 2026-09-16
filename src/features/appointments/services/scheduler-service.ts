import "server-only";
import { DateTime } from "luxon";
import type { Resource, WorkingHours } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveTimezone } from "@/lib/timezone";
import { markNoShow, completeAppointment } from "./appointment-service";
import { sendDueReminders } from "./reminder-service";
import { renewExpiringCalendarWatches } from "./calendar-watch-service";

const NO_SHOW_GRACE_MINUTES = 30;
const AUTO_COMPLETE_GRACE_HOURS = 2;

const SCHEDULER_ACTOR = { actor: "scheduler" };

/** The resource's close time (from WorkingHours) plus a grace window, for the booking's own day. Null if that weekday has no defined hours — caller falls back to endAt + the same grace. */
function closeTimePlusGrace(
  resource: Resource & { workingHours: WorkingHours[]; location: { timezone: string } },
  bookingStartAt: Date,
): Date | null {
  const zone = resolveTimezone(resource.location.timezone);
  const local = DateTime.fromJSDate(bookingStartAt, { zone });
  const dayOfWeek = local.weekday % 7; // luxon: Mon=1..Sun=7 -> our 0=Sun..6=Sat

  const hours = resource.workingHours.find((day) => day.dayOfWeek === dayOfWeek);
  if (!hours || !hours.isOpen) return null;

  const [hour, minute] = hours.endTime.split(":").map(Number);
  return local
    .set({ hour, minute, second: 0, millisecond: 0 })
    .plus({ hours: AUTO_COMPLETE_GRACE_HOURS })
    .toJSDate();
}

/**
 * The lifecycle poll job body — called on the same recurring interval as reminders (see
 * runScheduledJobs below). Idempotent: only ever moves a booking forward from a state it's
 * still sitting in, safe to re-run every tick.
 */
export async function autoCompleteAndNoShow(): Promise<{ completed: number; noShow: number }> {
  let completed = 0;
  let noShow = 0;
  const now = new Date();

  const overdue = await db.booking.findMany({
    where: {
      status: { in: ["booked", "arrived", "in_progress"] },
      endAt: { lt: now },
    },
    include: {
      resource: { include: { workingHours: true, location: true } },
      events: { where: { toStatus: "arrived" } },
    },
  });

  for (const booking of overdue) {
    const hasArrived = booking.events.length > 0;

    if (!hasArrived) {
      const graceEnd = new Date(booking.endAt.getTime() + NO_SHOW_GRACE_MINUTES * 60 * 1000);
      if (now > graceEnd) {
        await markNoShow(
          booking.tenantId,
          booking.id,
          SCHEDULER_ACTOR,
          "auto: no arrival within grace period",
        );
        noShow += 1;
      }
      continue;
    }

    const cutoff =
      closeTimePlusGrace(booking.resource, booking.startAt) ??
      new Date(booking.endAt.getTime() + AUTO_COMPLETE_GRACE_HOURS * 60 * 60 * 1000);

    if (now >= cutoff) {
      await completeAppointment(booking.tenantId, booking.id, SCHEDULER_ACTOR, "auto: end of day");
      completed += 1;
    }
  }

  return { completed, noShow };
}

/** Everything the cron tick runs — one wiring path for both instrumentation.ts and /api/cron/reminders. */
export async function runScheduledJobs() {
  const reminders = await sendDueReminders();
  const lifecycle = await autoCompleteAndNoShow();
  const calendarWatch = await renewExpiringCalendarWatches();
  return { reminders, lifecycle, calendarWatch };
}
