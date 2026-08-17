import "server-only";
import { db } from "@/lib/db";
import type { Patient } from "@prisma/client";

export async function getPatientByPhone(phone: string): Promise<Patient | null> {
  return db.patient.findUnique({ where: { phone } });
}

export type CreatePatientInput = {
  phone: string;
  name?: string;
};

export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  return db.patient.upsert({
    where: { phone: input.phone },
    create: { phone: input.phone, name: input.name },
    update: input.name ? { name: input.name } : {},
  });
}

export async function listPatients(): Promise<Patient[]> {
  return db.patient.findMany({ orderBy: { createdAt: "desc" } });
}
