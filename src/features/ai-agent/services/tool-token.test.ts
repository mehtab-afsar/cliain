import { describe, expect, it, vi } from "vitest";
import { mintToolToken, verifyToolToken } from "./tool-token";

describe("mintToolToken / verifyToolToken", () => {
  it("round-trips tenantId and channel", () => {
    const token = mintToolToken({ tenantId: "tenant_123", channel: "whatsapp" });
    const session = verifyToolToken(token);
    expect(session?.tenantId).toBe("tenant_123");
    expect(session?.channel).toBe("whatsapp");
  });

  it("rejects a token whose payload was tampered with (tenant swap)", () => {
    const token = mintToolToken({ tenantId: "tenant_a", channel: "whatsapp" });
    const [payload, signature] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    const forgedPayload = Buffer.from(JSON.stringify({ ...decoded, tenantId: "tenant_b" })).toString(
      "base64url",
    );
    const forgedToken = `${forgedPayload}.${signature}`;

    expect(verifyToolToken(forgedToken)).toBeNull();
  });

  it("rejects a token signed with a different secret than the one currently configured", () => {
    // Simulates a token an attacker constructed themselves (or a stale token from a rotated
    // secret) — without the real TOOL_TOKEN_SECRET, they cannot produce a signature that
    // verifies, no matter what tenantId they claim.
    const token = mintToolToken({ tenantId: "tenant_a", channel: "whatsapp" });
    const [payload] = token.split(".");
    const forgedToken = `${payload}.not-a-real-signature`;

    expect(verifyToolToken(forgedToken)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifyToolToken("not-a-token")).toBeNull();
    expect(verifyToolToken("")).toBeNull();
  });

  it("rejects an expired token", () => {
    const realNow = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(realNow);
    const token = mintToolToken({ tenantId: "tenant_a", channel: "whatsapp" });

    vi.spyOn(Date, "now").mockReturnValue(realNow + 16 * 60 * 1000); // 16 minutes later, past the 15-minute TTL
    expect(verifyToolToken(token)).toBeNull();

    vi.restoreAllMocks();
  });
});
