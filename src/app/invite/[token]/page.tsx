import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { acceptInvitation, getInvitationByToken } from "@/features/invitations/services/invitation-service";
import { InviteMessage } from "@/features/invitations/components/invite-message";
import { SignInToJoin } from "@/features/invitations/components/sign-in-to-join";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const lookup = await getInvitationByToken(token);

  if (lookup.status === "invalid") {
    return (
      <InviteMessage
        title="This invite link is no longer valid"
        body="Ask the clinic owner to send a new one."
      />
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return <SignInToJoin token={token} clinicName={lookup.clinicName} />;
  }

  const result = await acceptInvitation(token, session.user.id);

  if (result.status === "joined") {
    redirect("/dashboard");
  }

  if (result.status === "already-member-elsewhere") {
    return (
      <InviteMessage
        title="You're already part of a clinic"
        body="Multi-clinic membership isn't supported yet."
      />
    );
  }

  return (
    <InviteMessage
      title="This invite link is no longer valid"
      body="Ask the clinic owner to send a new one."
    />
  );
}
