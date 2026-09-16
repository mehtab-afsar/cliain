import "server-only";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import { resolveTimezone } from "@/lib/timezone";
import type { Offering } from "@prisma/client";
import { getPrimaryResourceForTenant, getPrimaryOfferingForTenant, getTenantById } from "./doctor-repository";
import { getBusyIntervals } from "./calendar-sync";

export type AvailabilitySlot = {
  startAt: string; // ISO, UTC
  endAt: string; // ISO, UTC
  label: string; // e.g. "2:30 PM", in the resource's local time
  // Only set for class-mode offerings (see checkClassAvailability) — which Session this slot
  // is, and how many more people can still be booked into it.
  sessionId?: string;
  remainingCapacity?: number;
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

/**
 * The existing appointment-mode path: one resource, exclusively booked in fixed
 * offering.durationMinutes slots between WorkingHours open/close. Unchanged from before
 * class-mode support was added — checkAvailability() below just dispatches into this.
 */
async function checkAppointmentAvailability(
  tenantId: string,
  offering: Offering,
  params: CheckAvailabilityParams,
): Promise<AvailabilitySlot[]> {
  const tenant = await getTenantById(tenantId);
  const resource = await getPrimaryResourceForTenant(tenantId);
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

/**
 * Class-mode: bookable times are whatever Session rows actually exist (see Session in
 * schema.prisma) — there's no generated grid of slots the way appointment mode has, since a
 * class only exists where someone (onboarding, staff) scheduled one. A session is offered if
 * it isn't already at capacity and isn't in the past.
 */
async function checkClassAvailability(
  tenantId: string,
  params: CheckAvailabilityParams,
): Promise<AvailabilitySlot[]> {
  const tenant = await getTenantById(tenantId);
  const resource = await getPrimaryResourceForTenant(tenantId);
  const zone = resolveTimezone(resource.location.timezone ?? tenant.timezone);

  const localDate = DateTime.fromISO(params.date, { zone });
  if (!localDate.isValid) {
    throw new Error(`Invalid date "${params.date}".`);
  }

  const dayStartUtc = localDate.startOf("day").toUTC();
  const dayEndUtc = localDate.endOf("day").toUTC();
  const now = DateTime.now().setZone(zone);

  const sessions = await db.session.findMany({
    where: {
      resourceId: resource.id,
      status: "scheduled",
      startAt: { gte: dayStartUtc.toJSDate(), lt: dayEndUtc.toJSDate() },
    },
    include: { bookings: { where: { status: "booked" }, select: { partySize: true } } },
    orderBy: { startAt: "asc" },
  });

  const rangeStart = params.earliestTime ? parseHoursMinutes(params.earliestTime) : null;
  const rangeEnd = params.latestTime ? parseHoursMinutes(params.latestTime) : null;

  const slots: AvailabilitySlot[] = [];
  for (const session of sessions) {
    const startLocal = DateTime.fromJSDate(session.startAt, { zone });
    if (startLocal < now) continue;

    const startMinutes = startLocal.hour * 60 + startLocal.minute;
    if (rangeStart && startMinutes < rangeStart.hour * 60 + rangeStart.minute) continue;
    if (rangeEnd && startMinutes > rangeEnd.hour * 60 + rangeEnd.minute) continue;

    const bookedSoFar = session.bookings.reduce((sum, booking) => sum + booking.partySize, 0);
    const remainingCapacity = session.capacity - bookedSoFar;
    if (remainingCapacity <= 0) continue;

    slots.push({
      startAt: session.startAt.toISOString(),
      endAt: session.endAt.toISOString(),
      label: startLocal.toFormat("h:mm a"),
      sessionId: session.id,
      remainingCapacity,
    });
  }

  return slots;
}

export async function checkAvailability(
  tenantId: string,
  params: CheckAvailabilityParams,
): Promise<AvailabilitySlot[]> {
  const offering = await getPrimaryOfferingForTenant(tenantId);
  return offering.mode === "class"
    ? checkClassAvailability(tenantId, params)
    : checkAppointmentAvailability(tenantId, offering, params);
}
