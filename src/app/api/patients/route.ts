import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { listPatients } from "@/features/patients/services/patient-service";

export async function GET() {
  const { doctorId } = await requireCurrentDoctor();
  const patients = await listPatients(doctorId);
  return NextResponse.json({ patients });
}
