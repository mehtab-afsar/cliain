import "server-only";
import { db } from "@/lib/db";
import type { Patient } from "@prisma/client";

export async function getPatientByPhone(doctorId: string, phone: string): Promise<Patient | null> {
  return db.patient.findFirst({ where: { doctorId, phone } });
}

export type CreatePatientInput = {
  phone: string;
  name?: string;
};

export async function createPatient(doctorId: string, input: CreatePatientInput): Promise<Patient> {
  return db.patient.upsert({
    where: { doctorId_phone: { doctorId, phone: input.phone } },
    create: { doctorId, phone: input.phone, name: input.name },
    update: input.name ? { name: input.name } : {},
  });
}

export async function listPatients(doctorId: string): Promise<Patient[]> {
  return db.patient.findMany({ where: { doctorId }, orderBy: { createdAt: "desc" } });
}

/** Patients the "escalate" tool has handed off to staff — oldest first, so the longest-waiting one surfaces first. */
export async function listPatientsNeedingReview(doctorId: string) {
  return db.patient.findMany({
    where: { doctorId, needsHumanReview: true },
    orderBy: { needsHumanReviewAt: "asc" },
    include: {
      conversations: { orderBy: { createdAt: "desc" }, take: 3 },
      appointments: {
        where: { status: { in: ["booked", "arrived", "in_progress"] } },
        orderBy: { startAt: "asc" },
        take: 1,
      },
    },
  });
}

/** Resumes normal AI handling for this patient — see the "escalate" tool and runTool() in ai-agent/services/tools. */
export async function clearNeedsReview(doctorId: string, patientId: string): Promise<Patient> {
  await db.patient.findFirstOrThrow({ where: { id: patientId, doctorId } });
  return db.patient.update({
    where: { id: patientId },
    data: { needsHumanReview: false, needsHumanReviewReason: null, needsHumanReviewAt: null },
  });
}
