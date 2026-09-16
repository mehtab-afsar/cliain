import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  bookAppointment,
  cancelAppointment,
  markArrived,
  completeAppointment,
  markNoShow,
  rescheduleAppointment,
} from "./appointment-service";

// Stubbed rather than hit against a real Google account — every helper here is a no-op
// (resolves undefined/[]) unless a test explicitly configures it, and is only reached at all
// when a test's doctor has googleCalendarId set (every other test leaves it unset).
vi.mock("./calendar-sync", () => ({
  getBusyIntervals: vi.fn().mockResolvedValue([]),
  createCalendarEvent: vi.fn().mockResolvedValue({ ok: true, eventId: "evt_test" }),
  updateCalendarEvent: vi.fn().mockResolvedValue({ ok: true, eventId: "evt_test" }),
  deleteCalendarEvent: vi.fn().mockResolvedValue({ ok: true, eventId: "evt_test" }),
}));

async function createDoctorAndPatient() {
  const doctor = await db.tenant.create({ data: { timezone: "UTC" } });
  const location = await db.location.create({
    data: { tenantId: doctor.id, timezone: "UTC" },
  });
  const resource = await db.resource.create({
    data: { tenantId: doctor.id, locationId: location.id, type: "practitioner", name: "Dr. Test" },
  });
  const offering = await db.offering.create({
    data: { tenantId: doctor.id, name: "Consultation", durationMinutes: 30, resourceType: "practitioner" },
  });
  const patient = await db.customer.create({
    data: { tenantId: doctor.id, phone: `+1555${Date.now()}${Math.floor(Math.random() * 1000)}` },
  });
  return { doctor, patient, resource, offering };
}

async function cleanup(doctorId: string) {
  // Booking has no cascade from Tenant/Customer/Resource, so it must go first, or the cascade
  // delete of those (Tenant -> * is `onDelete: Cascade`) would be blocked by it.
  await db.booking.deleteMany({ where: { tenantId: doctorId } });
  await db.tenant.delete({ where: { id: doctorId } });
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
    }, { actor: "test" });

    await expect(
      bookAppointment(doctor.id, {
        patientId: patient.id,
        startAt: "2026-09-01T14:15:00.000Z",
        endAt: "2026-09-01T14:45:00.000Z",
      }, { actor: "test" }),
    ).rejects.toThrow("just booked by someone else");
  });

  it("allows back-to-back, non-overlapping slots", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    await bookAppointment(doctor.id, {
      patientId: patient.id,
      startAt: "2026-09-01T14:00:00.000Z",
      endAt: "2026-09-01T14:30:00.000Z",
    }, { actor: "test" });

    await expect(
      bookAppointment(doctor.id, {
        patientId: patient.id,
        startAt: "2026-09-01T14:30:00.000Z",
        endAt: "2026-09-01T15:00:00.000Z",
      }, { actor: "test" }),
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
      }, { actor: "test" });

    const results = await Promise.allSettled([attempt(), attempt()]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const remaining = await db.booking.count({
      where: { tenantId: doctor.id, status: "booked" },
    });
    expect(remaining).toBe(1);
  });

  it("rejects a slot blocked directly on the doctor's Google Calendar, even with no Postgres conflict", async () => {
    const { getBusyIntervals } = await import("./calendar-sync");
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;
    await db.tenant.update({ where: { id: doctor.id }, data: { googleCalendarId: "primary" } });

    vi.mocked(getBusyIntervals).mockResolvedValueOnce([
      { start: new Date("2026-09-01T18:00:00.000Z"), end: new Date("2026-09-01T18:30:00.000Z") },
    ]);

    await expect(
      bookAppointment(
        doctor.id,
        { patientId: patient.id, startAt: "2026-09-01T18:00:00.000Z", endAt: "2026-09-01T18:30:00.000Z" },
        { actor: "test" },
      ),
    ).rejects.toThrow("just booked by someone else");

    const remaining = await db.booking.count({ where: { tenantId: doctor.id } });
    expect(remaining).toBe(0);
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
    }, { actor: "test" });

    await expect(
      rescheduleAppointment(doctor.id, {
        appointmentId: appointment.id,
        startAt: "2026-09-02T10:15:00.000Z",
        endAt: "2026-09-02T10:45:00.000Z",
      }, { actor: "test" }),
    ).resolves.toBeDefined();
  });

  it("still rejects moving into another appointment's slot", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    await bookAppointment(doctor.id, {
      patientId: patient.id,
      startAt: "2026-09-03T09:00:00.000Z",
      endAt: "2026-09-03T09:30:00.000Z",
    }, { actor: "test" });
    const second = await bookAppointment(doctor.id, {
      patientId: patient.id,
      startAt: "2026-09-03T10:00:00.000Z",
      endAt: "2026-09-03T10:30:00.000Z",
    }, { actor: "test" });

    await expect(
      rescheduleAppointment(doctor.id, {
        appointmentId: second.id,
        startAt: "2026-09-03T09:15:00.000Z",
        endAt: "2026-09-03T09:45:00.000Z",
      }, { actor: "test" }),
    ).rejects.toThrow("just booked by someone else");
  });

  it("freezes the old row as rescheduled and creates a new booked row", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    const original = await bookAppointment(
      doctor.id,
      {
        patientId: patient.id,
        startAt: "2026-09-04T10:00:00.000Z",
        endAt: "2026-09-04T10:30:00.000Z",
      },
      { actor: "test" },
    );

    const moved = await rescheduleAppointment(
      doctor.id,
      { appointmentId: original.id, startAt: "2026-09-04T14:00:00.000Z", endAt: "2026-09-04T14:30:00.000Z" },
      { actor: "test" },
    );

    expect(moved.id).not.toBe(original.id);
    expect(moved.status).toBe("booked");
    expect(moved.rescheduledFromId).toBe(original.id);

    const frozen = await db.booking.findUniqueOrThrow({ where: { id: original.id } });
    expect(frozen.status).toBe("rescheduled");

    const events = await db.bookingEvent.findMany({
      where: { bookingId: { in: [original.id, moved.id] } },
    });
    expect(events.some((e) => e.bookingId === original.id && e.toStatus === "rescheduled")).toBe(true);
    expect(events.some((e) => e.bookingId === moved.id && e.toStatus === "booked")).toBe(true);
  });

  it("only lets one of two concurrent reschedules into the identical slot succeed", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    const first = await bookAppointment(
      doctor.id,
      { patientId: patient.id, startAt: "2026-09-05T09:00:00.000Z", endAt: "2026-09-05T09:30:00.000Z" },
      { actor: "test" },
    );
    const second = await bookAppointment(
      doctor.id,
      { patientId: patient.id, startAt: "2026-09-05T11:00:00.000Z", endAt: "2026-09-05T11:30:00.000Z" },
      { actor: "test" },
    );

    const targetSlot = { startAt: "2026-09-05T15:00:00.000Z", endAt: "2026-09-05T15:30:00.000Z" };
    const results = await Promise.allSettled([
      rescheduleAppointment(doctor.id, { appointmentId: first.id, ...targetSlot }, { actor: "test" }),
      rescheduleAppointment(doctor.id, { appointmentId: second.id, ...targetSlot }, { actor: "test" }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const bookedAtTarget = await db.booking.count({
      where: { tenantId: doctor.id, status: "booked", startAt: new Date(targetSlot.startAt) },
    });
    expect(bookedAtTarget).toBe(1);
  });
});

describe("lifecycle transitions", () => {
  let doctorId: string | undefined;

  afterEach(async () => {
    if (doctorId) await cleanup(doctorId);
    doctorId = undefined;
  });

  async function bookOne(doctor: { id: string }, patient: { id: string }) {
    return bookAppointment(
      doctor.id,
      { patientId: patient.id, startAt: "2026-09-06T09:00:00.000Z", endAt: "2026-09-06T09:30:00.000Z" },
      { actor: "test" },
    );
  }

  it("markArrived writes an event and updates status", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;
    const appointment = await bookOne(doctor, patient);

    const updated = await markArrived(doctor.id, appointment.id, { actor: "staff:u1", channel: "dashboard" });
    expect(updated.status).toBe("arrived");

    const events = await db.bookingEvent.findMany({ where: { bookingId: appointment.id } });
    expect(events.some((e) => e.toStatus === "arrived" && e.actor === "staff:u1")).toBe(true);
  });

  it("completeAppointment sets completedAt/completedBy", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;
    const appointment = await bookOne(doctor, patient);

    const updated = await completeAppointment(doctor.id, appointment.id, { actor: "staff:u1" }, "seen and done");
    expect(updated.status).toBe("completed");
    expect(updated.completedAt).not.toBeNull();
    expect(updated.completedBy).toBe("staff:u1");
    expect(updated.statusReason).toBe("seen and done");
  });

  it("markNoShow sets status and reason", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;
    const appointment = await bookOne(doctor, patient);

    const updated = await markNoShow(doctor.id, appointment.id, { actor: "scheduler" }, "auto: no arrival");
    expect(updated.status).toBe("no_show");
    expect(updated.statusReason).toBe("auto: no arrival");
  });

  it("cancelAppointment writes an event with the given reason", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;
    const appointment = await bookOne(doctor, patient);

    const updated = await cancelAppointment(doctor.id, appointment.id, { actor: "test" }, "patient asked");
    expect(updated.status).toBe("cancelled");

    const events = await db.bookingEvent.findMany({ where: { bookingId: appointment.id } });
    expect(events.some((e) => e.toStatus === "cancelled" && e.reason === "patient asked")).toBe(true);
  });
});
