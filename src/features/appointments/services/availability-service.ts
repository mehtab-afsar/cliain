import "server-only";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import { resolveTimezone } from "@/lib/timezone";
import { getDoctorById } from "./doctor-repository";

/** No per-clinic configuration for this yet — one fixed slot length for the MVP. */
export const SLOT_DURATION_MINUTES = 30;

export type AvailabilitySlot = {
  startAt: string; // ISO, UTC
  endAt: string; // ISO, UTC
  label: string; // e.g. "2:30 PM", in the doctor's local time
};

function parseHoursMinutes(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

function clampTime(
  time: { hour: number; minute: number },
  bound: string | undefined,
  mode: "max" | "min",
): { hour: number; minute: number } {
  if (!bound) return time;
  const boundTime = parseHoursMinutes(bound);
  const timeMinutes = time.hour * 60 + time.minute;
  const boundMinutes = boundTime.hour * 60 + boundTime.minute;
  const useBound = mode === "max" ? boundMinutes > timeMinutes : boundMinutes < timeMinutes;
  return useBound ? boundTime : time;
}

export type CheckAvailabilityParams = {
  date: string; // "YYYY-MM-DD", local to the doctor's timezone
  earliestTime?: string; // "HH:MM", local — optional lower bound
  latestTime?: string; // "HH:MM", local — optional upper bound
};

export async function checkAvailability(
  doctorId: string,
  params: CheckAvailabilityParams,
): Promise<AvailabilitySlot[]> {
  const doctor = await getDoctorById(doctorId);
  const zone = resolveTimezone(doctor.timezone);

  const localDate = DateTime.fromISO(params.date, { zone });
  if (!localDate.isValid) {
    throw new Error(`Invalid date "${params.date}".`);
  }
  const dayOfWeek = localDate.weekday % 7; // luxon: Mon=1..Sun=7 -> our 0=Sun..6=Sat

  const hours = doctor.workingHours.find((day) => day.dayOfWeek === dayOfWeek);
  if (!hours || !hours.isOpen) return [];

  const rangeStart = clampTime(parseHoursMinutes(hours.startTime), params.earliestTime, "max");
  const rangeEnd = clampTime(parseHoursMinutes(hours.endTime), params.latestTime, "min");

  const dayStartUtc = localDate.startOf("day").toUTC();
  const dayEndUtc = localDate.endOf("day").toUTC();

  const existingAppointments = await db.appointment.findMany({
    where: {
      doctorId: doctor.id,
      status: "booked",
      startAt: { lt: dayEndUtc.toJSDate() },
      endAt: { gt: dayStartUtc.toJSDate() },
    },
    select: { startAt: true, endAt: true },
  });

  const now = DateTime.now().setZone(zone);
  const slots: AvailabilitySlot[] = [];

  let cursor = localDate.set({ hour: rangeStart.hour, minute: rangeStart.minute, second: 0, millisecond: 0 });
  const end = localDate.set({ hour: rangeEnd.hour, minute: rangeEnd.minute, second: 0, millisecond: 0 });

  while (cursor.plus({ minutes: SLOT_DURATION_MINUTES }) <= end) {
    const slotStart = cursor;
    const slotEnd = cursor.plus({ minutes: SLOT_DURATION_MINUTES });

    const isPast = slotStart < now;
    const overlapsExisting = existingAppointments.some(
      (appt) => slotStart.toJSDate() < appt.endAt && slotEnd.toJSDate() > appt.startAt,
    );

    if (!isPast && !overlapsExisting) {
      slots.push({
        startAt: slotStart.toUTC().toISO()!,
        endAt: slotEnd.toUTC().toISO()!,
        label: slotStart.toFormat("h:mm a"),
      });
    }

    cursor = cursor.plus({ minutes: SLOT_DURATION_MINUTES });
  }

  return slots;
}
