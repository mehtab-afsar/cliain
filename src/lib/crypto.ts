import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { env } from "./env";

// A fixed, non-secret salt is fine here — INTEGRATION_ENCRYPTION_KEY is the actual secret;
// this just derives a well-formed AES key from it.
const KEY_DERIVATION_SALT = "cliain-integration-secrets";

function getKey(): Buffer {
  if (!env.INTEGRATION_ENCRYPTION_KEY) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY is not set — required to save or read integration credentials. " +
        "Generate one with `openssl rand -base64 32` and add it to .env.local.",
    );
  }
  return scryptSync(env.INTEGRATION_ENCRYPTION_KEY, KEY_DERIVATION_SALT, 32);
}

/** AES-256-GCM encrypt. Output packs iv + authTag + ciphertext as base64, dot-separated. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((buf) => buf.toString("base64")).join(".");
}

export function decryptSecret(ciphertext: string): string {
  const [ivB64, authTagB64, dataB64] = ciphertext.split(".");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf-8");
}
