import "server-only";
import { db } from "@/lib/db";
import { Prisma, type Appointment, type AppointmentStatus } from "@prisma/client";
import { resolveTimezone } from "@/lib/timezone";
import { getDoctorById } from "./doctor-repository";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "./calendar-sync";

const SLOT_TAKEN_MESSAGE = "That slot was just booked by someone else — please choose another time.";

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

/** Who made a transition, for the AppointmentEvent audit trail. */
export type Actor = { actor: string; channel?: string | null };

type EventInput = {
  appointmentId: string;
  doctorId: string;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus;
  by: Actor;
  reason?: string | null;
};

function writeEvent(tx: Prisma.TransactionClient, input: EventInput) {
  return tx.appointmentEvent.create({
    data: {
      appointmentId: input.appointmentId,
      doctorId: input.doctorId,
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
 */
async function writeIfSlotFree<T>(
  conflictScope: { doctorId: string; startAt: Date; endAt: Date; excludeAppointmentId?: string },
  write: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await db.$transaction(
      async (tx) => {
        const conflict = await tx.appointment.findFirst({
          where: {
            doctorId: conflictScope.doctorId,
            status: "booked",
            ...(conflictScope.excludeAppointmentId
              ? { id: { not: conflictScope.excludeAppointmentId } }
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
  doctorId: string,
  appointmentId: string,
  toStatus: AppointmentStatus,
  by: Actor,
  reason: string | undefined,
  extra?: Prisma.AppointmentUpdateInput,
): Promise<Appointment> {
  const existing = await db.appointment.findFirstOrThrow({
    where: { id: appointmentId, doctorId },
  });

  return db.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: toStatus, statusReason: reason ?? null, ...extra },
    });
    await writeEvent(tx, {
      appointmentId,
      doctorId,
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
  doctorId: string,
  input: BookAppointmentInput,
  by: Actor,
): Promise<Appointment> {
  const doctor = await getDoctorById(doctorId);
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  const patient = await db.patient.findFirstOrThrow({ where: { id: input.patientId, doctorId: doctor.id } });

  const appointment = await writeIfSlotFree({ doctorId: doctor.id, startAt, endAt }, async (tx) => {
    const created = await tx.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId: input.patientId,
        startAt,
        endAt,
        reason: input.reason,
        status: "booked",
      },
    });
    await writeEvent(tx, {
      appointmentId: created.id,
      doctorId: doctor.id,
      fromStatus: null,
      toStatus: "booked",
      by,
    });
    return created;
  });

  if (doctor.googleCalendarId) {
    const sync = await createCalendarEvent({
      doctorId: doctor.id,
      calendarId: doctor.googleCalendarId,
      summary: `${patient.name ?? "Patient"} — ${doctor.name}`,
      description: input.reason,
      startAt,
      endAt,
      timezone: resolveTimezone(doctor.timezone),
    });
    await db.appointment.update({
      where: { id: appointment.id },
      data: sync.ok
        ? { googleCalendarEventId: sync.eventId }
        : { googleCalendarSyncError: sync.error },
    });
  }

  return appointment;
}

export async function cancelAppointment(
  doctorId: string,
  appointmentId: string,
  by: Actor,
  reason?: string,
): Promise<Appointment> {
  const doctor = await getDoctorById(doctorId);
  const existing = await db.appointment.findFirstOrThrow({
    where: { id: appointmentId, doctorId: doctor.id },
  });

  const appointment = await transitionStatus(doctorId, appointmentId, "cancelled", by, reason);

  if (doctor.googleCalendarId && existing.googleCalendarEventId) {
    await deleteCalendarEvent(doctor.id, doctor.googleCalendarId, existing.googleCalendarEventId);
  }

  return appointment;
}

export async function markArrived(
  doctorId: string,
  appointmentId: string,
  by: Actor,
): Promise<Appointment> {
  return transitionStatus(doctorId, appointmentId, "arrived", by, undefined);
}

export async function completeAppointment(
  doctorId: string,
  appointmentId: string,
  by: Actor,
  reason?: string,
): Promise<Appointment> {
  return transitionStatus(doctorId, appointmentId, "completed", by, reason, {
    completedAt: new Date(),
    completedBy: by.actor,
  });
}

export async function markNoShow(
  doctorId: string,
  appointmentId: string,
  by: Actor,
  reason?: string,
): Promise<Appointment> {
  return transitionStatus(doctorId, appointmentId, "no_show", by, reason);
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
 * bookAppointment) — excludeAppointmentId is still needed even though the old row moves to a
 * non-"booked" status, because that flip happens inside this same transaction, after the
 * conflict check already ran.
 */
export async function rescheduleAppointment(
  doctorId: string,
  input: RescheduleAppointmentInput,
  by: Actor,
  reason?: string,
): Promise<Appointment> {
  const doctor = await getDoctorById(doctorId);
  const existing = await db.appointment.findFirstOrThrow({
    where: { id: input.appointmentId, doctorId: doctor.id },
  });
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  const appointment = await writeIfSlotFree(
    { doctorId: doctor.id, startAt, endAt, excludeAppointmentId: existing.id },
    async (tx) => {
      await tx.appointment.update({
        where: { id: existing.id },
        data: { status: "rescheduled", statusReason: reason ?? null },
      });
      await writeEvent(tx, {
        appointmentId: existing.id,
        doctorId: doctor.id,
        fromStatus: existing.status,
        toStatus: "rescheduled",
        by,
        reason,
      });

      const created = await tx.appointment.create({
        data: {
          doctorId: doctor.id,
          patientId: existing.patientId,
          startAt,
          endAt,
          reason: existing.reason,
          status: "booked",
          rescheduledFromId: existing.id,
        },
      });
      await writeEvent(tx, {
        appointmentId: created.id,
        doctorId: doctor.id,
        fromStatus: null,
        toStatus: "booked",
        by,
        reason: `Rescheduled from ${existing.id}`,
      });
      return created;
    },
  );

  if (doctor.googleCalendarId && existing.googleCalendarEventId) {
    await updateCalendarEvent(doctor.id, doctor.googleCalendarId, existing.googleCalendarEventId, {
      startAt,
      endAt,
      timezone: resolveTimezone(doctor.timezone),
    });
    // The calendar event id lived on the old row — carry it to the new one so a later
    // cancel/reschedule of this appointment can still find and manage that same event.
    await db.appointment.update({
      where: { id: appointment.id },
      data: { googleCalendarEventId: existing.googleCalendarEventId },
    });
  }

  return appointment;
}

export async function listUpcomingAppointmentsForPatient(patientId: string) {
  return db.appointment.findMany({
    where: { patientId, status: "booked", startAt: { gt: new Date() } },
    orderBy: { startAt: "asc" },
  });
}

export async function listAppointments(doctorId: string) {
  return db.appointment.findMany({
    // "rescheduled" rows are frozen, superseded history — the row a reschedule creates is
    // what shows up here instead; the old one is still visible via rescheduledFrom on the
    // appointment detail page.
    where: { doctorId, status: { not: "rescheduled" } },
    include: { patient: true },
    orderBy: { startAt: "asc" },
  });
}

export async function getAppointmentDetail(doctorId: string, appointmentId: string) {
  const appointment = await db.appointment.findFirstOrThrow({
    where: { id: appointmentId, doctorId },
    include: {
      patient: true,
      events: { orderBy: { at: "desc" } },
    },
  });

  const transcript = await db.conversation.findMany({
    where: { patientId: appointment.patientId },
    orderBy: { createdAt: "asc" },
  });

  return { appointment, transcript };
}
