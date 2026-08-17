import "server-only";
import { db } from "@/lib/db";

/** Single-clinic, single-doctor MVP: resolves to the one configured doctor. */
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
