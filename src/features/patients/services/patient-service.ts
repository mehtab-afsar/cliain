import "server-only";
import { db } from "@/lib/db";
import type { Customer } from "@prisma/client";

export async function getPatientByPhone(tenantId: string, phone: string): Promise<Customer | null> {
  return db.customer.findFirst({ where: { tenantId, phone } });
}

export type CreatePatientInput = {
  phone: string;
  name?: string;
};

export async function createPatient(tenantId: string, input: CreatePatientInput): Promise<Customer> {
  return db.customer.upsert({
    where: { tenantId_phone: { tenantId, phone: input.phone } },
    create: { tenantId, phone: input.phone, name: input.name },
    update: input.name ? { name: input.name } : {},
  });
}

export async function listPatients(tenantId: string): Promise<Customer[]> {
  return db.customer.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

/** Patients the "escalate" tool has handed off to staff — oldest first, so the longest-waiting one surfaces first. */
export async function listPatientsNeedingReview(tenantId: string) {
  return db.customer.findMany({
    where: { tenantId, needsHumanReview: true },
    orderBy: { needsHumanReviewAt: "asc" },
    include: {
      conversations: { orderBy: { createdAt: "desc" }, take: 3 },
      bookings: {
        where: { status: { in: ["booked", "arrived", "in_progress"] } },
        orderBy: { startAt: "asc" },
        take: 1,
      },
    },
  });
}

/** Resumes normal AI handling for this patient — see the "escalate" tool and runTool() in ai-agent/services/tools. */
export async function clearNeedsReview(tenantId: string, patientId: string): Promise<Customer> {
  await db.customer.findFirstOrThrow({ where: { id: patientId, tenantId } });
  return db.customer.update({
    where: { id: patientId },
    data: { needsHumanReview: false, needsHumanReviewReason: null, needsHumanReviewAt: null },
  });
}
