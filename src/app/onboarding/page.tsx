import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentDoctor } from "@/lib/current-doctor";
import { OnboardingView } from "@/features/onboarding";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) {
    // Landing on /onboarding unauthenticated means "new clinic starting fresh" — route
    // through /signup, not /login, so the copy they see says "Create your account" rather
    // than "Welcome back".
    redirect("/signup?next=/onboarding");
  }

  const current = await getCurrentDoctor();
  if (current) {
    redirect("/dashboard");
  }

  return <OnboardingView />;
}
