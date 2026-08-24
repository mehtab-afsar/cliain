import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { listTeamMembers } from "@/features/invitations/services/invitation-service";

export async function GET() {
  const { doctorId } = await requireCurrentDoctor();
  const members = await listTeamMembers(doctorId);
  return NextResponse.json({ members });
}
