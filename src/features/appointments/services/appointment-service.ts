import "server-only";
import { db } from "@/lib/db";
import { Prisma, type Booking, type BookingStatus } from "@prisma/client";
import { resolveTimezone } from "@/lib/timezone";
import { getTenantById, getPrimaryResourceForTenant, getPrimaryOfferingForTenant } from "./doctor-repository";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent, getBusyIntervals } from "./calendar-sync";

const SLOT_TAKEN_MESSAGE = "That slot was just booked by someone else — please choose another time.";

/**
 * A best-effort guard against a slot that's free in Postgres but blocked directly on the
 * tenant's real Google Calendar. Deliberately called BEFORE writeIfSlotFree, not inside its
 * transaction — an external HTTP call has no place inside a Serializable transaction (it would
 * hold Postgres locks open across network I/O). This only narrows the race window between
 * showing a slot and committing the booking, it doesn't eliminate it; getBusyIntervals already
 * fails open (returns []) on any Calendar error, so this never blocks booking on its own.
 */
async function assertNotCalendarBusy(
  tenant: { id: string; googleCalendarId: string | null },
  startAt: Date,
  endAt: Date,
): Promise<void> {
  if (!tenant.googleCalendarId) return;
  const busy = await getBusyIntervals(tenant.id, tenant.googleCalendarId, startAt, endAt);
  if (busy.some((block) => startAt < block.end && endAt > block.start)) {
    throw new Error(SLOT_TAKEN_MESSAGE);
  }
}

/**
 * A Postgres serialization failure (code 40001) surfaces differently depending on where in
 * the stack it's caught: the classic shape is a `PrismaClientKnownRequestError` with code
 * "P2034", but with the driver-adapter architecture (`@prisma/adapter-pg`) it can instead
 * arrive as a raw `DriverAdapterError` whose `cause.kind` is "TransactionWriteConflict" —
 * confirmed by reproducing the conflict directly, not just from docs. Checking only the first
 * shape left the second one leaking through as a confusing raw driver error instead of the
 * friendly "slot taken" message.
 */
function isSerializationFailure(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
    return true;
  }
  if (error instanceof Error && error.name === "DriverAdapterError") {
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause && typeof cause === "object" && "kind" in cause) {
      return (cause as { kind?: unknown }).kind === "TransactionWriteConflict";
    }
  }
  return false;
}

/** Who made a transition, for the BookingEvent audit trail. */
export type Actor = { actor: string; channel?: string | null };

type EventInput = {
  bookingId: string;
  tenantId: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  by: Actor;
  reason?: string | null;
};

function writeEvent(tx: Prisma.TransactionClient, input: EventInput) {
  return tx.bookingEvent.create({
    data: {
      bookingId: input.bookingId,
      tenantId: input.tenantId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actor: input.by.actor,
      channel: input.by.channel ?? null,
      reason: input.reason ?? null,
    },
  });
}

/**
 * The conflict check and the write used to be two separate, unsynchronized round-trips — two
 * concurrent bookings for the same slot could both pass the check before either committed,
 * producing a real double-booking (there's no DB-level constraint backstopping this, only a
 * plain index). Serializable isolation makes Postgres itself detect that race: if the read
 * set either transaction based its decision on changes before it commits, one of them fails
 * with a serialization error (P2034) instead of silently succeeding — converted below into
 * the same friendly message the manual check already threw, so callers don't need to change.
 * Deliberately not retried automatically: a P2034 here means the slot really was just taken,
 * so surfacing it as "pick another time" is the correct behavior, not a transient hiccup.
 *
 * Scoped by resourceId, not tenantId: a tenant can have more than one bookable resource (see
 * Resource), and two different resources double-booking the same clock time is not a
 * conflict. Scoping by tenantId alone — as this used to, back when a tenant only ever had one
 * implicit resource — would falsely reject a free slot on a different resource.
 */
async function writeIfSlotFree<T>(
  conflictScope: { resourceId: string; startAt: Date; endAt: Date; excludeBookingId?: string },
  write: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await db.$transaction(
      async (tx) => {
        const conflict = await tx.booking.findFirst({
          where: {
            resourceId: conflictScope.resourceId,
            status: "booked",
            ...(conflictScope.excludeBookingId
              ? { id: { not: conflictScope.excludeBookingId } }
              : {}),
            startAt: { lt: conflictScope.endAt },
            endAt: { gt: conflictScope.startAt },
          },
        });
        if (conflict) {
          throw new Error(SLOT_TAKEN_MESSAGE);
        }
        return write(tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (isSerializationFailure(error)) {
      throw new Error(SLOT_TAKEN_MESSAGE);
    }
    throw error;
  }
}

/** A plain status transition that doesn't touch startAt/endAt — arrived, completed, no-show, cancel. */
async function transitionStatus(
  tenantId: string,
  bookingId: string,
  toStatus: BookingStatus,
  by: Actor,
  reason: string | undefined,
  extra?: Prisma.BookingUpdateInput,
): Promise<Booking> {
  const existing = await db.booking.findFirstOrThrow({
    where: { id: bookingId, tenantId },
  });

  return db.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: toStatus, statusReason: reason ?? null, ...extra },
    });
    await writeEvent(tx, {
      bookingId,
      tenantId,
      fromStatus: existing.status,
      toStatus,
      by,
      reason,
    });
    return updated;
  });
}

export type BookAppointmentInput = {
  patientId: string;
  startAt: string; // ISO, UTC
  endAt: string; // ISO, UTC
  reason?: string;
};

export async function bookAppointment(
  tenantId: string,
  input: BookAppointmentInput,
  by: Actor,
): Promise<Booking> {
  const tenant = await getTenantById(tenantId);
  const resource = await getPrimaryResourceForTenant(tenantId);
  const offering = await getPrimaryOfferingForTenant(tenantId);
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  const customer = await db.customer.findFirstOrThrow({ where: { id: input.patientId, tenantId: tenant.id } });

  await assertNotCalendarBusy(tenant, startAt, endAt);

  const booking = await writeIfSlotFree({ resourceId: resource.id, startAt, endAt }, async (tx) => {
    const created = await tx.booking.create({
      data: {
        tenantId: tenant.id,
        customerId: input.patientId,
        resourceId: resource.id,
        offeringId: offering.id,
        startAt,
        endAt,
        reason: input.reason,
        status: "booked",
      },
    });
    await writeEvent(tx, {
      bookingId: created.id,
      tenantId: tenant.id,
      fromStatus: null,
      toStatus: "booked",
      by,
    });
    return created;
  });

  if (tenant.googleCalendarId) {
    const sync = await createCalendarEvent({
      tenantId: tenant.id,
      calendarId: tenant.googleCalendarId,
      bookingId: booking.id,
      summary: `${customer.name ?? "Patient"} — ${resource.name}`,
      description: input.reason,
      startAt,
      endAt,
      timezone: resolveTimezone(resource.location.timezone ?? tenant.timezone),
    });
    await db.booking.update({
      where: { id: booking.id },
      data: sync.ok
        ? { googleCalendarEventId: sync.eventId }
        : { googleCalendarSyncError: sync.error },
    });
  }

  return booking;
}

export async function cancelAppointment(
  tenantId: string,
  bookingId: string,
  by: Actor,
  reason?: string,
  // Set by calendar-watch-service.ts when the cancellation is itself the reaction to the
  // Calendar event having already been deleted externally — calling deleteCalendarEvent in
  // that case would be a redundant no-op against an event that's already gone.
  options?: { skipCalendarSync?: boolean },
): Promise<Booking> {
  const tenant = await getTenantById(tenantId);
  const existing = await db.booking.findFirstOrThrow({
    where: { id: bookingId, tenantId: tenant.id },
  });

  const booking = await transitionStatus(tenantId, bookingId, "cancelled", by, reason);

  if (!options?.skipCalendarSync && tenant.googleCalendarId && existing.googleCalendarEventId) {
    await deleteCalendarEvent(tenant.id, tenant.googleCalendarId, existing.googleCalendarEventId);
  }

  return booking;
}

export async function markArrived(
  tenantId: string,
  bookingId: string,
  by: Actor,
): Promise<Booking> {
  return transitionStatus(tenantId, bookingId, "arrived", by, undefined);
}

export async function completeAppointment(
  tenantId: string,
  bookingId: string,
  by: Actor,
  reason?: string,
): Promise<Booking> {
  return transitionStatus(tenantId, bookingId, "completed", by, reason, {
    completedAt: new Date(),
    completedBy: by.actor,
  });
}

export async function markNoShow(
  tenantId: string,
  bookingId: string,
  by: Actor,
  reason?: string,
): Promise<Booking> {
  return transitionStatus(tenantId, bookingId, "no_show", by, reason);
}

export type RescheduleAppointmentInput = {
  appointmentId: string;
  startAt: string; // ISO, UTC
  endAt: string; // ISO, UTC
};

/**
 * Freezes the old row at status "rescheduled" and creates a brand-new "booked" row for the
 * new time, rather than mutating startAt/endAt in place — so "originally 2pm, moved to 4pm"
 * stays on record as two distinct rows instead of being overwritten. Both writes, plus the
 * conflict check for the new slot, happen in one Serializable transaction (same guarantee as
 * bookAppointment) — excludeBookingId is still needed even though the old row moves to a
 * non-"booked" status, because that flip happens inside this same transaction, after the
 * conflict check already ran.
 */
export async function rescheduleAppointment(
  tenantId: string,
  input: RescheduleAppointmentInput,
  by: Actor,
  reason?: string,
): Promise<Booking> {
  const tenant = await getTenantById(tenantId);
  const resource = await getPrimaryResourceForTenant(tenantId);
  const existing = await db.booking.findFirstOrThrow({
    where: { id: input.appointmentId, tenantId: tenant.id },
  });
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  await assertNotCalendarBusy(tenant, startAt, endAt);

  const booking = await writeIfSlotFree(
    { resourceId: existing.resourceId, startAt, endAt, excludeBookingId: existing.id },
    async (tx) => {
      await tx.booking.update({
        where: { id: existing.id },
        data: { status: "rescheduled", statusReason: reason ?? null },
      });
      await writeEvent(tx, {
        bookingId: existing.id,
        tenantId: tenant.id,
        fromStatus: existing.status,
        toStatus: "rescheduled",
        by,
        reason,
      });

      const created = await tx.booking.create({
        data: {
          tenantId: tenant.id,
          customerId: existing.customerId,
          resourceId: existing.resourceId,
          offeringId: existing.offeringId,
          startAt,
          endAt,
          reason: existing.reason,
          status: "booked",
          rescheduledFromId: existing.id,
        },
      });
      await writeEvent(tx, {
        bookingId: created.id,
        tenantId: tenant.id,
        fromStatus: null,
        toStatus: "booked",
        by,
        reason: `Rescheduled from ${existing.id}`,
      });
      return created;
    },
  );

  if (tenant.googleCalendarId && existing.googleCalendarEventId) {
    await updateCalendarEvent(tenant.id, tenant.googleCalendarId, existing.googleCalendarEventId, {
      startAt,
      endAt,
      timezone: resolveTimezone(resource.location.timezone ?? tenant.timezone),
    });
    // The calendar event id lived on the old row — carry it to the new one so a later
    // cancel/reschedule of this booking can still find and manage that same event.
    await db.booking.update({
      where: { id: booking.id },
      data: { googleCalendarEventId: existing.googleCalendarEventId },
    });
  }

  return booking;
}

export async function listUpcomingAppointmentsForPatient(customerId: string) {
  return db.booking.findMany({
    where: { customerId, status: "booked", startAt: { gt: new Date() } },
    orderBy: { startAt: "asc" },
  });
}

export async function listAppointments(tenantId: string) {
  return db.booking.findMany({
    // "rescheduled" rows are frozen, superseded history — the row a reschedule creates is
    // what shows up here instead; the old one is still visible via rescheduledFrom on the
    // booking detail page.
    where: { tenantId, status: { not: "rescheduled" } },
    include: { customer: true },
    orderBy: { startAt: "asc" },
  });
}

export async function getAppointmentDetail(tenantId: string, bookingId: string) {
  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, tenantId },
    include: {
      customer: true,
      events: { orderBy: { at: "desc" } },
    },
  });

  const transcript = await db.conversation.findMany({
    where: { customerId: booking.customerId },
    orderBy: { createdAt: "asc" },
  });

  return { appointment: booking, transcript };
}
