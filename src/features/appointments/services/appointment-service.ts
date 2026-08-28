import "server-only";
import { db } from "@/lib/db";
import type { Appointment } from "@prisma/client";
import { resolveTimezone } from "@/lib/timezone";
import { getDoctorById } from "./doctor-repository";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "./calendar-sync";

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

  const conflict = await db.appointment.findFirst({
    where: {
      doctorId: doctor.id,
      status: "booked",
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });
  if (conflict) {
    throw new Error("That slot was just booked by someone else — please choose another time.");
  }

  const patient = await db.patient.findFirstOrThrow({ where: { id: input.patientId, doctorId: doctor.id } });

  const appointment = await db.appointment.create({
    data: {
      doctorId: doctor.id,
      patientId: input.patientId,
      startAt,
      endAt,
      reason: input.reason,
      status: "booked",
    },
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

  const conflict = await db.appointment.findFirst({
    where: {
      doctorId: doctor.id,
      status: "booked",
      id: { not: input.appointmentId },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });
  if (conflict) {
    throw new Error("That slot was just booked by someone else — please choose another time.");
  }

  const appointment = await db.appointment.update({
    where: { id: input.appointmentId },
    data: { startAt, endAt },
  });

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
