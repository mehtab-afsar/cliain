import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { listAppointments } from "@/features/appointments/services/appointment-service";

export async function GET() {
  const { doctorId } = await requireCurrentDoctor();
  const appointments = await listAppointments(doctorId);
  return NextResponse.json({ appointments });
}
