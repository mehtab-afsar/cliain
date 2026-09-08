import "server-only";
import { DateTime } from "luxon";
import type { Doctor, WorkingHours } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveTimezone } from "@/lib/timezone";
import { markNoShow, completeAppointment } from "./appointment-service";
import { sendDueReminders } from "./reminder-service";

const NO_SHOW_GRACE_MINUTES = 30;
const AUTO_COMPLETE_GRACE_HOURS = 2;

const SCHEDULER_ACTOR = { actor: "scheduler" };

/** The clinic's close time (from WorkingHours) plus a grace window, for the appointment's own day. Null if that weekday has no defined hours — caller falls back to endAt + the same grace. */
function closeTimePlusGrace(
  doctor: Doctor & { workingHours: WorkingHours[] },
  appointmentStartAt: Date,
): Date | null {
  const zone = resolveTimezone(doctor.timezone);
  const local = DateTime.fromJSDate(appointmentStartAt, { zone });
  const dayOfWeek = local.weekday % 7; // luxon: Mon=1..Sun=7 -> our 0=Sun..6=Sat

  const hours = doctor.workingHours.find((day) => day.dayOfWeek === dayOfWeek);
  if (!hours || !hours.isOpen) return null;

  const [hour, minute] = hours.endTime.split(":").map(Number);
  return local
    .set({ hour, minute, second: 0, millisecond: 0 })
    .plus({ hours: AUTO_COMPLETE_GRACE_HOURS })
    .toJSDate();
}

/**
 * The lifecycle poll job body — called on the same recurring interval as reminders (see
 * runScheduledJobs below). Idempotent: only ever moves an appointment forward from a state
 * it's still sitting in, safe to re-run every tick.
 */
export async function autoCompleteAndNoShow(): Promise<{ completed: number; noShow: number }> {
  let completed = 0;
  let noShow = 0;
  const now = new Date();

  const overdue = await db.appointment.findMany({
    where: {
      status: { in: ["booked", "arrived", "in_progress"] },
      endAt: { lt: now },
    },
    include: {
      doctor: { include: { workingHours: true } },
      events: { where: { toStatus: "arrived" } },
    },
  });

  for (const appointment of overdue) {
    const hasArrived = appointment.events.length > 0;

    if (!hasArrived) {
      const graceEnd = new Date(appointment.endAt.getTime() + NO_SHOW_GRACE_MINUTES * 60 * 1000);
      if (now > graceEnd) {
        await markNoShow(
          appointment.doctorId,
          appointment.id,
          SCHEDULER_ACTOR,
          "auto: no arrival within grace period",
        );
        noShow += 1;
      }
      continue;
    }

    const cutoff =
      closeTimePlusGrace(appointment.doctor, appointment.startAt) ??
      new Date(appointment.endAt.getTime() + AUTO_COMPLETE_GRACE_HOURS * 60 * 60 * 1000);

    if (now >= cutoff) {
      await completeAppointment(appointment.doctorId, appointment.id, SCHEDULER_ACTOR, "auto: end of day");
      completed += 1;
    }
  }

  return { completed, noShow };
}

/** Everything the cron tick runs — one wiring path for both instrumentation.ts and /api/cron/reminders. */
export async function runScheduledJobs() {
  const reminders = await sendDueReminders();
  const lifecycle = await autoCompleteAndNoShow();
  return { reminders, lifecycle };
}
