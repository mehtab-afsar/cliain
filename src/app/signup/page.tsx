import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentDoctor } from "@/lib/current-doctor";
import { LoginView } from "@/features/login";

type SignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/onboarding";

  // Beta bypass (see src/lib/session.ts) — same short-circuit as /login.
  if (process.env.BYPASS_AUTH === "true") {
    redirect(safeNext);
  }

  const session = await getSession();
  if (session?.user) {
    // Already has a Google session. A clinic already set up means "sign up" doesn't apply
    // any more — send them to the dashboard instead of showing the button again. No clinic
    // yet means they're mid-signup already (e.g. came back to this tab) — skip straight to
    // onboarding rather than making them click "Continue with Google" a second time.
    const current = await getCurrentDoctor();
    redirect(current ? "/dashboard" : safeNext);
  }

  return <LoginView mode="signup" next={safeNext} />;
}
