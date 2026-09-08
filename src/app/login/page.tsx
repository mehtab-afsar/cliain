import { redirect } from "next/navigation";
import { LoginView } from "@/features/login";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  // Beta bypass (see src/lib/session.ts) — nobody should see the real Google sign-in screen
  // while this is on, whether they land here via a stale link or by typing the URL directly.
  if (process.env.BYPASS_AUTH === "true") {
    redirect(next && next.startsWith("/") ? next : "/dashboard");
  }

  return <LoginView next={next} />;
}
