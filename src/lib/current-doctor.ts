import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type CurrentDoctor = { doctorId: string; role: "owner" | "staff"; userId: string };

/** Null if signed out, or signed in with zero memberships (new user, not yet onboarded/invited). */
export async function getCurrentDoctor(): Promise<CurrentDoctor | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const membership = await db.membership.findFirst({ where: { userId } });
  if (!membership) return null;

  return { doctorId: membership.doctorId, role: membership.role, userId };
}

/** Throws — use in API routes/services that require an authenticated, onboarded tenant. */
export async function requireCurrentDoctor(): Promise<CurrentDoctor> {
  const current = await getCurrentDoctor();
  if (!current) throw new Error("Not signed in to a clinic.");
  return current;
}
