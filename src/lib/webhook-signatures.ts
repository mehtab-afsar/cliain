import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies Meta's `X-Hub-Signature-256` header — an HMAC-SHA256 of the raw request body,
 * keyed by the Meta App's secret, formatted as `sha256=<hex>`. Must run against the raw
 * body text (not the parsed/re-serialized JSON), since re-serializing can change byte-for-byte
 * formatting and break the signature.
 */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(header);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Verifies Vapi's webhook secret header. Vapi echoes back whatever `server.secret` was set
 * on the assistant/tool config, as an `x-vapi-secret` header on every request to that URL —
 * this wasn't confirmed against a live account at build time (same caveat as the payload
 * shape in the vapi webhook route); adjust the header name here if a real payload disagrees.
 */
export function verifyVapiSecret(header: string | null, expectedSecret: string): boolean {
  if (!header) return false;
  const expectedBuf = Buffer.from(expectedSecret);
  const actualBuf = Buffer.from(header);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
