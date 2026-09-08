import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentDoctor } from "@/lib/current-doctor";
import { OnboardingView } from "@/features/onboarding";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login?next=/onboarding");
  }

  const current = await getCurrentDoctor();
  if (current) {
    redirect("/dashboard");
  }

  return <OnboardingView />;
}
