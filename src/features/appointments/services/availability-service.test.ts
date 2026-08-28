import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import { checkAvailability } from "./availability-service";
import { bookAppointment } from "./appointment-service";

// Fixed so past-slot filtering (which compares against the real clock) is deterministic
// regardless of when the suite actually runs.
const FAKE_NOW = "2026-09-01T12:00:00.000Z";

function nextIsoWeekday(from: DateTime, isoWeekday: number): DateTime {
  const diff = (isoWeekday - from.weekday + 7) % 7;
  return from.plus({ days: diff === 0 ? 7 : diff });
}

async function createDoctorWithHours(dayOfWeek: number, startTime: string, endTime: string, isOpen = true) {
  const doctor = await db.doctor.create({ data: { name: "Dr. Test", timezone: "UTC" } });
  await db.workingHours.create({
    data: { doctorId: doctor.id, dayOfWeek, startTime, endTime, isOpen },
  });
  return doctor;
}

async function cleanup(doctorId: string) {
  await db.appointment.deleteMany({ where: { doctorId } });
  await db.doctor.delete({ where: { id: doctorId } });
}

describe("checkAvailability", () => {
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

  it("excludes slots that overlap an existing booking", async () => {
    const now = DateTime.fromISO(FAKE_NOW, { zone: "utc" });
    const today = now.toISODate()!;
    const doctor = await createDoctorWithHours(now.weekday % 7, "09:00", "17:00");
    doctorId = doctor.id;
    const patient = await db.patient.create({
      data: { doctorId, phone: `+1555${Date.now()}${Math.floor(Math.random() * 1000)}` },
    });

    await bookAppointment(doctorId, {
      patientId: patient.id,
      startAt: `${today}T14:00:00.000Z`,
      endAt: `${today}T14:30:00.000Z`,
    });

    const slots = await checkAvailability(doctorId, { date: today });
    expect(slots.some((s) => s.startAt === `${today}T14:00:00.000Z`)).toBe(false);
    // An untouched neighboring slot should still be offered.
    expect(slots.some((s) => s.startAt === `${today}T13:00:00.000Z`)).toBe(true);
  });

  it("excludes slots that are already in the past", async () => {
    const now = DateTime.fromISO(FAKE_NOW, { zone: "utc" }); // 12:00, so 09:00 is past and 13:00 isn't
    const today = now.toISODate()!;
    const doctor = await createDoctorWithHours(now.weekday % 7, "09:00", "17:00");
    doctorId = doctor.id;

    const slots = await checkAvailability(doctorId, { date: today });
    expect(slots.some((s) => s.startAt === `${today}T09:00:00.000Z`)).toBe(false);
    expect(slots.some((s) => s.startAt === `${today}T13:00:00.000Z`)).toBe(true);
  });

  it("returns no slots for a day the clinic is marked closed", async () => {
    const now = DateTime.fromISO(FAKE_NOW, { zone: "utc" });
    const today = now.toISODate()!;
    const doctor = await createDoctorWithHours(now.weekday % 7, "09:00", "17:00", false);
    doctorId = doctor.id;

    const slots = await checkAvailability(doctorId, { date: today });
    expect(slots).toEqual([]);
  });

  it("handles the Sunday boundary (dayOfWeek 0)", async () => {
    const now = DateTime.fromISO(FAKE_NOW, { zone: "utc" });
    const sunday = nextIsoWeekday(now, 7); // Luxon: Sunday = 7
    const doctor = await createDoctorWithHours(0, "09:00", "17:00");
    doctorId = doctor.id;

    const slots = await checkAvailability(doctorId, { date: sunday.toISODate()! });
    expect(slots.length).toBeGreaterThan(0);
  });

  it("handles the Saturday boundary (dayOfWeek 6)", async () => {
    const now = DateTime.fromISO(FAKE_NOW, { zone: "utc" });
    const saturday = nextIsoWeekday(now, 6);
    const doctor = await createDoctorWithHours(6, "09:00", "17:00");
    doctorId = doctor.id;

    const slots = await checkAvailability(doctorId, { date: saturday.toISODate()! });
    expect(slots.length).toBeGreaterThan(0);
  });

  it("rejects an invalid date", async () => {
    const doctor = await createDoctorWithHours(1, "09:00", "17:00");
    doctorId = doctor.id;

    await expect(checkAvailability(doctorId, { date: "not-a-date" })).rejects.toThrow(
      'Invalid date "not-a-date"',
    );
  });
});
