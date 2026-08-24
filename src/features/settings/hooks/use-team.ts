"use client";

import { useCallback, useEffect, useState } from "react";
import type { InvitationSummary, TeamMember } from "@/features/invitations/services/invitation-service";
import {
  createInvitationRequest,
  fetchInvitations,
  fetchTeamMembers,
  revokeInvitationRequest,
} from "../services/team-client";

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [nextMembers, nextInvitations] = await Promise.all([fetchTeamMembers(), fetchInvitations()]);
    setMembers(nextMembers);
    setInvitations(nextInvitations);
  }, []);

  useEffect(() => {
    Promise.all([fetchTeamMembers(), fetchInvitations()]).then(([nextMembers, nextInvitations]) => {
      setMembers(nextMembers);
      setInvitations(nextInvitations);
    });
  }, []);

  const invite = useCallback(async () => {
    setIsCreating(true);
    setError(null);
    try {
      await createInvitationRequest();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite link.");
    } finally {
      setIsCreating(false);
    }
  }, [refresh]);

  const revoke = useCallback(
    async (invitationId: string) => {
      await revokeInvitationRequest(invitationId);
      await refresh();
    },
    [refresh],
  );

  return { members, invitations, isCreating, error, invite, revoke };
}
