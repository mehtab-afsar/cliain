import "server-only";
import { db } from "@/lib/db";

/**
 * Legacy singleton — resolves to whichever clinic was created first. Only the
 * not-yet-multi-tenant AI agent / WhatsApp / Vapi / cron paths should still call
 * this; every dashboard-facing code path should have a real `doctorId` from
 * `requireCurrentDoctor()` and use `getDoctorById` instead.
 */
export async function getPrimaryDoctor() {
  const doctor = await db.doctor.findFirst({
    include: { workingHours: true },
    orderBy: { createdAt: "asc" },
  });
  if (!doctor) {
    throw new Error("No doctor configured yet — finish onboarding first.");
  }
  return doctor;
}

export async function getDoctorById(doctorId: string) {
  return db.doctor.findUniqueOrThrow({
    where: { id: doctorId },
    include: { workingHours: true },
  });
}
