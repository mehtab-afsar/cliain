import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { bookAppointment, markArrived } from "./appointment-service";
import { autoCompleteAndNoShow } from "./scheduler-service";

// A Tuesday, fixed so "clinic closed 2h ago" / "past grace period" math is deterministic.
const FAKE_NOW = "2026-09-01T20:00:00.000Z";

async function createDoctorWithHours() {
  const doctor = await db.doctor.create({ data: { name: "Dr. Test", timezone: "UTC" } });
  // 09:00-17:00 on every weekday so whichever day FAKE_NOW's date falls has known hours.
  await db.workingHours.createMany({
    data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      doctorId: doctor.id,
      dayOfWeek,
      isOpen: true,
      startTime: "09:00",
      endTime: "17:00",
    })),
  });
  const patient = await db.patient.create({
    data: { doctorId: doctor.id, phone: `+1555${Date.now()}${Math.floor(Math.random() * 1000)}` },
  });
  return { doctor, patient };
}

async function cleanup(doctorId: string) {
  await db.appointment.deleteMany({ where: { doctorId } });
  await db.workingHours.deleteMany({ where: { doctorId } });
  await db.doctor.delete({ where: { id: doctorId } });
}

describe("autoCompleteAndNoShow", () => {
  let doctorId: string | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FAKE_NOW));
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (doctorId) await cleanup(doctorId);
    doctorId = undefined;
  });

  it("marks a past-due appointment with no arrival as no_show once past the grace period", async () => {
    const { doctor, patient } = await createDoctorWithHours();
    doctorId = doctor.id;

    const appointment = await bookAppointment(
      doctor.id,
      { patientId: patient.id, startAt: "2026-09-01T09:00:00.000Z", endAt: "2026-09-01T09:30:00.000Z" },
      { actor: "test" },
    );

    await autoCompleteAndNoShow();

    const updated = await db.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(updated.status).toBe("no_show");
  });

  it("marks a past-due appointment with an arrival as completed once past close + 2h", async () => {
    const { doctor, patient } = await createDoctorWithHours();
    doctorId = doctor.id;

    const appointment = await bookAppointment(
      doctor.id,
      { patientId: patient.id, startAt: "2026-09-01T09:00:00.000Z", endAt: "2026-09-01T09:30:00.000Z" },
      { actor: "test" },
    );
    await markArrived(doctor.id, appointment.id, { actor: "staff:u1", channel: "dashboard" });

    await autoCompleteAndNoShow();

    const updated = await db.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(updated.status).toBe("completed");
    expect(updated.completedAt).not.toBeNull();
  });

  it("leaves a recently-ended appointment untouched", async () => {
    const { doctor, patient } = await createDoctorWithHours();
    doctorId = doctor.id;

    // Ends 5 minutes before "now" — well inside the 30-minute no-show grace period.
    const appointment = await bookAppointment(
      doctor.id,
      { patientId: patient.id, startAt: "2026-09-01T19:30:00.000Z", endAt: "2026-09-01T19:55:00.000Z" },
      { actor: "test" },
    );

    await autoCompleteAndNoShow();

    const updated = await db.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(updated.status).toBe("booked");
  });

  it("is idempotent — re-running doesn't error or double-transition", async () => {
    const { doctor, patient } = await createDoctorWithHours();
    doctorId = doctor.id;

    const appointment = await bookAppointment(
      doctor.id,
      { patientId: patient.id, startAt: "2026-09-01T09:00:00.000Z", endAt: "2026-09-01T09:30:00.000Z" },
      { actor: "test" },
    );

    await autoCompleteAndNoShow();
    await autoCompleteAndNoShow();

    const updated = await db.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(updated.status).toBe("no_show");

    const events = await db.appointmentEvent.findMany({ where: { appointmentId: appointment.id } });
    expect(events.filter((e) => e.toStatus === "no_show")).toHaveLength(1);
  });
});
