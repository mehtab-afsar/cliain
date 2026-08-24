import type { InvitationSummary, TeamMember } from "@/features/invitations/services/invitation-service";

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const response = await fetch("/api/settings/team");
  if (!response.ok) return [];
  const { members } = (await response.json()) as { members: TeamMember[] };
  return members;
}

export async function fetchInvitations(): Promise<InvitationSummary[]> {
  const response = await fetch("/api/settings/invitations");
  if (!response.ok) return [];
  const { invitations } = (await response.json()) as { invitations: InvitationSummary[] };
  return invitations;
}

export async function createInvitationRequest(): Promise<InvitationSummary> {
  const response = await fetch("/api/settings/invitations", { method: "POST" });
  if (!response.ok) {
    const { error } = (await response.json()) as { error?: string };
    throw new Error(error ?? "Failed to create invite link.");
  }
  const { invitation } = (await response.json()) as { invitation: InvitationSummary };
  return invitation;
}

export async function revokeInvitationRequest(invitationId: string): Promise<void> {
  await fetch("/api/settings/invitations", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invitationId }),
  });
}
