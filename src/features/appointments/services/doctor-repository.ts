import "server-only";
import { db } from "@/lib/db";

export async function getDoctorById(doctorId: string) {
  return db.doctor.findUniqueOrThrow({
    where: { id: doctorId },
    include: { workingHours: true },
  });
}
