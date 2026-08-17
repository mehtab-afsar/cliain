import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export const SESSION_COOKIE_NAME = "cliain_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

/** Both must be set for login to work at all — checked upfront by the login page/route. */
export function isLoginConfigured(): boolean {
  return Boolean(env.DASHBOARD_PASSWORD && env.SESSION_SECRET);
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyPassword(input: string): boolean {
  if (!env.DASHBOARD_PASSWORD) {
    throw new Error(
      "DASHBOARD_PASSWORD is not set — required for dashboard login. Set it in .env.local.",
    );
  }
  return constantTimeEqual(input, env.DASHBOARD_PASSWORD);
}

function sign(payload: string): string {
  if (!env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET is not set — required for dashboard login. Generate one with `openssl rand -base64 32` and add it to .env.local.",
    );
  }
  return createHmac("sha256", env.SESSION_SECRET).update(payload).digest("base64url");
}

/** A stateless, HMAC-signed cookie value: `v1.<expiresAtMs>.<signature>`. No DB round trip to verify. */
export function createSessionToken(): string {
  const payload = `v1.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/** Never throws — returns false for a missing/malformed/expired/unconfigured session. */
export function isValidSessionToken(token: string | undefined): boolean {
  if (!token || !env.SESSION_SECRET) return false;

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
