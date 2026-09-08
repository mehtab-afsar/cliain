import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const BYPASS_EMAIL = "beta-tester@cliain.local";

export type Session = { user: { id: string; name: string | null; email: string } };

/**
 * Beta-phase bypass — set BYPASS_AUTH=true to skip Google sign-in entirely and use one fixed
 * local "Beta Tester" account for every request, no login screen at all. Every session-reading
 * call site in the app goes through this instead of importing `auth` from "@/lib/auth"
 * directly, so turning real sign-in back on later is just unsetting this one env var — nothing
 * else to rebuild. Unset before anyone but the team can reach this deployment: this doesn't
 * just skip login for you, it removes it for everyone — every visitor becomes the same shared
 * account with full dashboard access.
 */
export async function getSession(): Promise<Session | null> {
  if (process.env.BYPASS_AUTH === "true") {
    const user = await db.user.upsert({
      where: { email: BYPASS_EMAIL },
      create: { email: BYPASS_EMAIL, name: "Beta Tester" },
      update: {},
    });
    return { user: { id: user.id, name: user.name, email: user.email } };
  }

  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    user: {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? "",
    },
  };
}
