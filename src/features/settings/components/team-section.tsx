"use client";

import { Button } from "@/components/ui/button";
import { useTeam } from "../hooks/use-team";

export function TeamSection() {
  const { members, invitations, isCreating, error, invite, revoke } = useTeam();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-lg text-foreground">Team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite staff to share this clinic&apos;s patients and appointments.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        {members.map((member) => (
          <div key={member.userId} className="flex items-center justify-between text-sm">
            <span className="text-foreground">{member.name || member.email}</span>
            <span className="text-muted-foreground capitalize">{member.role}</span>
          </div>
        ))}
      </div>

      {invitations.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Pending invites</p>
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <code className="truncate text-xs text-muted-foreground">{invitation.url}</code>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(invitation.url)}
                >
                  Copy
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => revoke(invitation.id)}>
                  Revoke
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" variant="outline" disabled={isCreating} onClick={() => invite()} className="self-start">
        {isCreating ? "Creating…" : "Invite staff member"}
      </Button>
    </div>
  );
}
