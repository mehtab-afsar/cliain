import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentDoctor } from "@/lib/current-doctor";
import { OnboardingView } from "@/features/onboarding";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/onboarding");
  }

  const current = await getCurrentDoctor();
  if (current) {
    redirect("/dashboard");
  }

  return <OnboardingView />;
}
