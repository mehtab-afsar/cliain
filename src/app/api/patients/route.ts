import { NextResponse } from "next/server";
import { listPatients } from "@/features/patients/services/patient-service";

export async function GET() {
  const patients = await listPatients();
  return NextResponse.json({ patients });
}
