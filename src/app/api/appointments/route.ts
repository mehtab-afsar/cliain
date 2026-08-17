import { NextResponse } from "next/server";
import { listAppointments } from "@/features/appointments/services/appointment-service";

export async function GET() {
  const appointments = await listAppointments();
  return NextResponse.json({ appointments });
}
