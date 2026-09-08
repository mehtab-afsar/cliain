import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { clearNeedsReview } from "@/features/patients/services/patient-service";

type RouteParams = { params: Promise<{ patientId: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const { patientId } = await params;
  const { doctorId } = await requireCurrentDoctor();

  try {
    await clearNeedsReview(doctorId, patientId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }
}
