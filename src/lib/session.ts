import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { env } from "./env";
import { verifyPasswordHash } from "./password";

export const SESSION_COOKIE_NAME = "cliain_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

// In dev, sign cookies with a fixed, well-known secret instead of forcing SESSION_SECRET into
// .env.local before you can even finish onboarding. Must be a FIXED string, not randomly
// generated per module load — Next.js's dev server bundles proxy.ts separately from route
// handlers, so each gets its own instance of this module; a random value would differ between
// them and every session token would fail to verify. Production always requires the real env
// var (fail closed) — this constant is never reachable there.
const DEV_SESSION_SECRET =
  process.env.NODE_ENV === "production" ? null : "cliain-insecure-dev-only-session-secret";

function getSessionSecret(): string | null {
  return env.SESSION_SECRET ?? DEV_SESSION_SECRET;
}

async function getDoctorRow() {
  return db.doctor.findFirst({ orderBy: { createdAt: "asc" } });
}

/** A password must be set (via onboarding, or DASHBOARD_PASSWORD) for login to be usable. */
export async function isLoginConfigured(): Promise<boolean> {
  const doctor = await getDoctorRow();
  return Boolean(doctor?.passwordHash || env.DASHBOARD_PASSWORD);
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** DB-stored password (set during onboarding) wins; DASHBOARD_PASSWORD env var is the fallback. */
export async function verifyLoginPassword(input: string): Promise<boolean> {
  const doctor = await getDoctorRow();
  if (doctor?.passwordHash) {
    return verifyPasswordHash(input, doctor.passwordHash);
  }
  if (env.DASHBOARD_PASSWORD) {
    return constantTimeEqual(input, env.DASHBOARD_PASSWORD);
  }
  throw new Error("Dashboard login isn't set up yet — finish onboarding to set a password.");
}

function sign(payload: string): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set — required for dashboard login in production. Generate one with `openssl rand -base64 32`.",
    );
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** A stateless, HMAC-signed cookie value: `v1.<expiresAtMs>.<signature>`. No DB round trip to verify. */
export function createSessionToken(): string {
  const payload = `v1.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/** Never throws — returns false for a missing/malformed/expired/unconfigured session. */
export function isValidSessionToken(token: string | undefined): boolean {
  if (!token || !getSessionSecret()) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiresAtRaw, signature] = parts;
  if (version !== "v1") return false;

  let expectedSignature: string;
  try {
    expectedSignature = sign(`${version}.${expiresAtRaw}`);
  } catch {
    return false;
  }
  if (!constantTimeEqual(signature, expectedSignature)) return false;

  const expiresAt = Number(expiresAtRaw);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
