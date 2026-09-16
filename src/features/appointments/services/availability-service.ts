import "server-only";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import { resolveTimezone } from "@/lib/timezone";
import { getPrimaryResourceForTenant, getPrimaryOfferingForTenant, getTenantById } from "./doctor-repository";
import { getBusyIntervals } from "./calendar-sync";

export type AvailabilitySlot = {
  startAt: string; // ISO, UTC
  endAt: string; // ISO, UTC
  label: string; // e.g. "2:30 PM", in the resource's local time
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
  date: string; // "YYYY-MM-DD", local to the resource's timezone
  earliestTime?: string; // "HH:MM", local — optional lower bound
  latestTime?: string; // "HH:MM", local — optional upper bound
};

export async function checkAvailability(
  tenantId: string,
  params: CheckAvailabilityParams,
): Promise<AvailabilitySlot[]> {
  const tenant = await getTenantById(tenantId);
  const resource = await getPrimaryResourceForTenant(tenantId);
  const offering = await getPrimaryOfferingForTenant(tenantId);
  const zone = resolveTimezone(resource.location.timezone ?? tenant.timezone);
  const slotDurationMinutes = offering.durationMinutes;

  const localDate = DateTime.fromISO(params.date, { zone });
  if (!localDate.isValid) {
    throw new Error(`Invalid date "${params.date}".`);
  }
  const dayOfWeek = localDate.weekday % 7; // luxon: Mon=1..Sun=7 -> our 0=Sun..6=Sat

  const hours = resource.workingHours.find((day) => day.dayOfWeek === dayOfWeek);
  if (!hours || !hours.isOpen) return [];

  const rangeStart = clampTime(parseHoursMinutes(hours.startTime), params.earliestTime, "max");
  const rangeEnd = clampTime(parseHoursMinutes(hours.endTime), params.latestTime, "min");

  const dayStartUtc = localDate.startOf("day").toUTC();
  const dayEndUtc = localDate.endOf("day").toUTC();

  const existingBookings = await db.booking.findMany({
    where: {
      resourceId: resource.id,
      status: "booked",
      startAt: { lt: dayEndUtc.toJSDate() },
      endAt: { gt: dayStartUtc.toJSDate() },
    },
    select: { startAt: true, endAt: true },
  });

  // Time blocked directly on the resource's real Google Calendar (not booked through this app)
  // is just as unavailable as a Postgres booking — same day window as the query above.
  const calendarBusyIntervals = tenant.googleCalendarId
    ? await getBusyIntervals(tenant.id, tenant.googleCalendarId, dayStartUtc.toJSDate(), dayEndUtc.toJSDate())
    : [];

  const now = DateTime.now().setZone(zone);
  const slots: AvailabilitySlot[] = [];

  let cursor = localDate.set({ hour: rangeStart.hour, minute: rangeStart.minute, second: 0, millisecond: 0 });
  const end = localDate.set({ hour: rangeEnd.hour, minute: rangeEnd.minute, second: 0, millisecond: 0 });

  while (cursor.plus({ minutes: slotDurationMinutes }) <= end) {
    const slotStart = cursor;
    const slotEnd = cursor.plus({ minutes: slotDurationMinutes });

    const isPast = slotStart < now;
    const overlapsExisting = existingBookings.some(
      (booking) => slotStart.toJSDate() < booking.endAt && slotEnd.toJSDate() > booking.startAt,
    );
    const overlapsCalendarBusy = calendarBusyIntervals.some(
      (busy) => slotStart.toJSDate() < busy.end && slotEnd.toJSDate() > busy.start,
    );

    if (!isPast && !overlapsExisting && !overlapsCalendarBusy) {
      slots.push({
        startAt: slotStart.toUTC().toISO()!,
        endAt: slotEnd.toUTC().toISO()!,
        label: slotStart.toFormat("h:mm a"),
      });
    }

    cursor = cursor.plus({ minutes: slotDurationMinutes });
  }

  return slots;
}
