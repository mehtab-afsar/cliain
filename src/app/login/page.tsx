import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginView } from "@/features/login";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : undefined;

  // Beta bypass (see src/lib/session.ts) — nobody should see the real Google sign-in screen
  // while this is on, whether they land here via a stale link or by typing the URL directly.
  if (process.env.BYPASS_AUTH === "true") {
    redirect(safeNext ?? "/dashboard");
  }

  // Already signed in — /login is for getting a session, not for showing the button again.
  const session = await getSession();
  if (session?.user) {
    redirect(safeNext ?? "/dashboard");
  }

  return <LoginView mode="signin" next={safeNext} />;
}
