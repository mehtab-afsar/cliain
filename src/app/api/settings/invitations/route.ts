import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import {
  createInvitation,
  listOutstandingInvitations,
  revokeInvitation,
} from "@/features/invitations/services/invitation-service";

export async function GET(request: Request) {
  const { doctorId } = await requireCurrentDoctor();
  const origin = new URL(request.url).origin;
  const invitations = await listOutstandingInvitations(doctorId, origin);
  return NextResponse.json({ invitations });
}

export async function POST(request: Request) {
  const { doctorId, role, userId } = await requireCurrentDoctor();
  if (role !== "owner") {
    return NextResponse.json({ error: "Only the clinic owner can invite staff." }, { status: 403 });
  }
  const origin = new URL(request.url).origin;
  const invitation = await createInvitation(doctorId, userId, origin);
  return NextResponse.json({ invitation });
}

export async function DELETE(request: Request) {
  const { doctorId, role } = await requireCurrentDoctor();
  if (role !== "owner") {
    return NextResponse.json({ error: "Only the clinic owner can revoke invites." }, { status: 403 });
  }
  const { invitationId } = (await request.json()) as { invitationId: string };
  await revokeInvitation(doctorId, invitationId);
  return NextResponse.json({ ok: true });
}
