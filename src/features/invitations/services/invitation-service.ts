import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { MembershipRole } from "@prisma/client";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type InvitationSummary = {
  id: string;
  role: MembershipRole;
  expiresAt: string;
  createdAt: string;
  url: string;
};

function inviteUrl(origin: string, token: string): string {
  return `${origin}/invite/${token}`;
}

export async function createInvitation(
  doctorId: string,
  createdByUserId: string,
  origin: string,
  role: MembershipRole = "staff",
): Promise<InvitationSummary> {
  const token = randomBytes(24).toString("base64url");
  const invitation = await db.invitation.create({
    data: {
      doctorId,
      token,
      role,
      createdByUserId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
  });
  return {
    id: invitation.id,
    role: invitation.role,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    url: inviteUrl(origin, token),
  };
}

export async function listOutstandingInvitations(
  doctorId: string,
  origin: string,
): Promise<InvitationSummary[]> {
  const invitations = await db.invitation.findMany({
    where: { doctorId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return invitations.map((invitation) => ({
    id: invitation.id,
    role: invitation.role,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    url: inviteUrl(origin, invitation.token),
  }));
}

export async function revokeInvitation(doctorId: string, invitationId: string): Promise<void> {
  await db.invitation.deleteMany({ where: { id: invitationId, doctorId } });
}

export type InvitationLookup =
  | { status: "valid"; doctorId: string; clinicName: string | null }
  | { status: "invalid" };

export async function getInvitationByToken(token: string): Promise<InvitationLookup> {
  const invitation = await db.invitation.findUnique({ where: { token }, include: { doctor: true } });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return { status: "invalid" };
  }
  return { status: "valid", doctorId: invitation.doctorId, clinicName: invitation.doctor.clinicName };
}

export type AcceptInvitationResult =
  | { status: "joined"; doctorId: string }
  | { status: "already-member-elsewhere" }
  | { status: "invalid" };

/** No org-switcher exists yet, so a user already belonging to any clinic is blocked rather than silently added to a second one. */
export async function acceptInvitation(token: string, userId: string): Promise<AcceptInvitationResult> {
  const invitation = await db.invitation.findUnique({ where: { token } });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return { status: "invalid" };
  }

  const existingMembership = await db.membership.findFirst({ where: { userId } });
  if (existingMembership) {
    return { status: "already-member-elsewhere" };
  }

  await db.$transaction([
    db.membership.create({ data: { userId, doctorId: invitation.doctorId, role: invitation.role } }),
    db.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date(), acceptedByUserId: userId },
    }),
  ]);

  return { status: "joined", doctorId: invitation.doctorId };
}

export type TeamMember = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: MembershipRole;
};

export async function listTeamMembers(doctorId: string): Promise<TeamMember[]> {
  const memberships = await db.membership.findMany({
    where: { doctorId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((membership) => ({
    userId: membership.userId,
    name: membership.user.name,
    email: membership.user.email,
    image: membership.user.image,
    role: membership.role,
  }));
}
