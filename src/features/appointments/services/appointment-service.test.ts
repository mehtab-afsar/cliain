import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { bookAppointment, rescheduleAppointment } from "./appointment-service";

async function createDoctorAndPatient() {
  const doctor = await db.doctor.create({ data: { name: "Dr. Test", timezone: "UTC" } });
  const patient = await db.patient.create({
    data: { doctorId: doctor.id, phone: `+1555${Date.now()}${Math.floor(Math.random() * 1000)}` },
  });
  return { doctor, patient };
}

async function cleanup(doctorId: string) {
  // Appointment has no cascade from Doctor/Patient, so it must go first, or the cascade
  // delete of Patient (Doctor -> Patient is `onDelete: Cascade`) would be blocked by it.
  await db.appointment.deleteMany({ where: { doctorId } });
  await db.doctor.delete({ where: { id: doctorId } });
}

describe("bookAppointment", () => {
  let doctorId: string | undefined;

  afterEach(async () => {
    if (doctorId) await cleanup(doctorId);
    doctorId = undefined;
  });

  it("rejects an overlapping slot", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    await bookAppointment(doctor.id, {
      patientId: patient.id,
      startAt: "2026-09-01T14:00:00.000Z",
      endAt: "2026-09-01T14:30:00.000Z",
    });

    await expect(
      bookAppointment(doctor.id, {
        patientId: patient.id,
        startAt: "2026-09-01T14:15:00.000Z",
        endAt: "2026-09-01T14:45:00.000Z",
      }),
    ).rejects.toThrow("just booked by someone else");
  });

  it("allows back-to-back, non-overlapping slots", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    await bookAppointment(doctor.id, {
      patientId: patient.id,
      startAt: "2026-09-01T14:00:00.000Z",
      endAt: "2026-09-01T14:30:00.000Z",
    });

    await expect(
      bookAppointment(doctor.id, {
        patientId: patient.id,
        startAt: "2026-09-01T14:30:00.000Z",
        endAt: "2026-09-01T15:00:00.000Z",
      }),
    ).resolves.toBeDefined();
  });

  it("only lets one of two concurrent bookings for the identical slot succeed", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    const attempt = () =>
      bookAppointment(doctor.id, {
        patientId: patient.id,
        startAt: "2026-09-01T16:00:00.000Z",
        endAt: "2026-09-01T16:30:00.000Z",
      });

    const results = await Promise.allSettled([attempt(), attempt()]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const remaining = await db.appointment.count({
      where: { doctorId: doctor.id, status: "booked" },
    });
    expect(remaining).toBe(1);
  });
});

describe("rescheduleAppointment", () => {
  let doctorId: string | undefined;

  afterEach(async () => {
    if (doctorId) await cleanup(doctorId);
    doctorId = undefined;
  });

  it("excludes its own row from the conflict check", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    const appointment = await bookAppointment(doctor.id, {
      patientId: patient.id,
      startAt: "2026-09-02T10:00:00.000Z",
      endAt: "2026-09-02T10:30:00.000Z",
    });

    await expect(
      rescheduleAppointment(doctor.id, {
        appointmentId: appointment.id,
        startAt: "2026-09-02T10:15:00.000Z",
        endAt: "2026-09-02T10:45:00.000Z",
      }),
    ).resolves.toBeDefined();
  });

  it("still rejects moving into another appointment's slot", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    await bookAppointment(doctor.id, {
      patientId: patient.id,
      startAt: "2026-09-03T09:00:00.000Z",
      endAt: "2026-09-03T09:30:00.000Z",
    });
    const second = await bookAppointment(doctor.id, {
      patientId: patient.id,
      startAt: "2026-09-03T10:00:00.000Z",
      endAt: "2026-09-03T10:30:00.000Z",
    });

    await expect(
      rescheduleAppointment(doctor.id, {
        appointmentId: second.id,
        startAt: "2026-09-03T09:15:00.000Z",
        endAt: "2026-09-03T09:45:00.000Z",
      }),
    ).rejects.toThrow("just booked by someone else");
  });
});
