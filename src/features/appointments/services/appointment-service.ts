import "server-only";
import { db } from "@/lib/db";
import { Prisma, type Appointment } from "@prisma/client";
import { resolveTimezone } from "@/lib/timezone";
import { getDoctorById } from "./doctor-repository";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "./calendar-sync";

const SLOT_TAKEN_MESSAGE = "That slot was just booked by someone else — please choose another time.";

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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new Error(SLOT_TAKEN_MESSAGE);
    }
    throw error;
  }
}

export type BookAppointmentInput = {
  patientId: string;
  startAt: string; // ISO, UTC
  endAt: string; // ISO, UTC
  reason?: string;
};

export async function bookAppointment(doctorId: string, input: BookAppointmentInput): Promise<Appointment> {
  const doctor = await getDoctorById(doctorId);
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  const patient = await db.patient.findFirstOrThrow({ where: { id: input.patientId, doctorId: doctor.id } });

  const appointment = await writeIfSlotFree(
    { doctorId: doctor.id, startAt, endAt },
    (tx) =>
      tx.appointment.create({
        data: {
          doctorId: doctor.id,
          patientId: input.patientId,
          startAt,
          endAt,
          reason: input.reason,
          status: "booked",
        },
      }),
  );

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

export async function cancelAppointment(doctorId: string, appointmentId: string): Promise<Appointment> {
  const doctor = await getDoctorById(doctorId);
  const existing = await db.appointment.findFirstOrThrow({
    where: { id: appointmentId, doctorId: doctor.id },
  });

  const appointment = await db.appointment.update({
    where: { id: appointmentId },
    data: { status: "cancelled" },
  });

  if (doctor.googleCalendarId && existing.googleCalendarEventId) {
    await deleteCalendarEvent(doctor.id, doctor.googleCalendarId, existing.googleCalendarEventId);
  }

  return appointment;
}

export type RescheduleAppointmentInput = {
  appointmentId: string;
  startAt: string; // ISO, UTC
  endAt: string; // ISO, UTC
};

export async function rescheduleAppointment(
  doctorId: string,
  input: RescheduleAppointmentInput,
): Promise<Appointment> {
  const doctor = await getDoctorById(doctorId);
  const existing = await db.appointment.findFirstOrThrow({
    where: { id: input.appointmentId, doctorId: doctor.id },
  });
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  const appointment = await writeIfSlotFree(
    { doctorId: doctor.id, startAt, endAt, excludeAppointmentId: input.appointmentId },
    (tx) => tx.appointment.update({ where: { id: input.appointmentId }, data: { startAt, endAt } }),
  );

  if (doctor.googleCalendarId && existing.googleCalendarEventId) {
    await updateCalendarEvent(doctor.id, doctor.googleCalendarId, existing.googleCalendarEventId, {
      startAt,
      endAt,
      timezone: resolveTimezone(doctor.timezone),
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
    where: { doctorId },
    include: { patient: true },
    orderBy: { startAt: "asc" },
  });
}
