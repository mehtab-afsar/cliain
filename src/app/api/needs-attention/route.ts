import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { listPatientsNeedingReview } from "@/features/patients/services/patient-service";

export async function GET() {
  const { doctorId } = await requireCurrentDoctor();
  const patients = await listPatientsNeedingReview(doctorId);

  return NextResponse.json({
    patients: patients.map((patient) => ({
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      needsHumanReviewReason: patient.needsHumanReviewReason,
      needsHumanReviewAt: patient.needsHumanReviewAt?.toISOString() ?? null,
      recentMessages: patient.conversations
        .slice()
        .reverse()
        .map((message) => ({ role: message.role, content: message.content })),
      upcomingAppointmentId: patient.bookings[0]?.id ?? null,
    })),
  });
}
