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
