import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export type ToolSession = {
  tenantId: string;
  channel: "whatsapp" | "voice";
  issuedAt: number; // epoch ms
};

// Long enough to cover one WhatsApp turn (a handful of tool calls, seconds) or one Vapi call
// (minutes), short enough that a token leaking somewhere (logs, an error message) is a
// narrow window, not a standing credential.
const TOKEN_TTL_MS = 15 * 60 * 1000;

function getSecret(): string {
  if (!env.TOOL_TOKEN_SECRET) {
    throw new Error(
      "TOOL_TOKEN_SECRET is not set — required to mint or verify tool session tokens. " +
        "Generate one with `openssl rand -base64 32` and add it to .env.local.",
    );
  }
  return env.TOOL_TOKEN_SECRET;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/**
 * Mints a short-lived, signed session that binds every tool call for this webhook delivery to
 * one tenant. Call this ONLY after the webhook's own signature check (verifyMetaSignature /
 * verifyVapiSecret) has already proven the request genuinely belongs to that tenant — never
 * from a caller-supplied or path-supplied tenant id alone. Downstream code (runAgentTurn,
 * runTool) trusts this token, not any tenant id passed alongside it.
 */
export function mintToolToken(session: Omit<ToolSession, "issuedAt">): string {
  const full: ToolSession = { ...session, issuedAt: Date.now() };
  const payload = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function isToolSession(value: unknown): value is ToolSession {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ToolSession).tenantId === "string" &&
    ((value as ToolSession).channel === "whatsapp" || (value as ToolSession).channel === "voice") &&
    typeof (value as ToolSession).issuedAt === "number"
  );
}

/**
 * Verifies signature + expiry + shape. Returns null (never throws) on anything invalid —
 * malformed, wrong signature, expired — so a bad token fails closed as "not authenticated" for
 * the caller to handle, not a raw crash.
 */
export function verifyToolToken(token: string): ToolSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedBuf = Buffer.from(sign(payload));
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }

  if (!isToolSession(parsed)) return null;
  if (Date.now() - parsed.issuedAt > TOKEN_TTL_MS) return null;

  return parsed;
}
