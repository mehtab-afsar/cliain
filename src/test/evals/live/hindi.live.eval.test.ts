import { afterEach, describe, expect, it } from "vitest";
import { mintToolToken } from "@/features/ai-agent/services/tool-token";
import { runAgentTurn } from "@/features/ai-agent/services/agent-loop";
import { createEvalTenant, cleanupEvalTenant } from "../harness";

/**
 * Live-model eval proving (not assuming) that a tenant can serve customers in Hindi today with
 * zero new i18n framework — see system-prompt.ts's "Reply in whichever of these languages the
 * {customer} is using" instruction, sourced from `business.languages` (any tenant can already
 * set this in Settings). This only tests the AI *conversation* layer; the staff-facing
 * dashboard UI itself is English-only and has no i18n framework — that's a separate, much
 * larger, genuinely unbuilt piece of work.
 *
 * Same live/skipped convention as booking.live.eval.test.ts — real Anthropic call, not part of
 * the deterministic suite, run with `npm run eval:live`.
 */
const RUN_LIVE_EVALS = process.env.RUN_LIVE_EVALS === "true";
const HAS_ANTHROPIC_KEY = Boolean(process.env.ANTHROPIC_API_KEY);

// A rough but effective signal for "the reply is actually in Hindi": any Devanagari-script
// character. Doesn't require exact wording, which would make this eval flaky against normal
// model variance.
const DEVANAGARI_PATTERN = /[ऀ-ॿ]/;

describe.skipIf(!RUN_LIVE_EVALS || !HAS_ANTHROPIC_KEY)("live eval: Hindi conversation", () => {
  let tenantId: string | undefined;

  afterEach(async () => {
    if (tenantId) await cleanupEvalTenant(tenantId);
    tenantId = undefined;
  });

  it(
    "replies in Hindi when a tenant has it configured and the customer writes in Hindi",
    async () => {
      const { tenant } = await createEvalTenant({ languages: ["Hindi", "English"] });
      tenantId = tenant.id;
      const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
      const phone = `+1555${Date.now()}`;

      const reply = await runAgentTurn(token, phone, "नमस्ते, क्या कल सुबह अपॉइंटमेंट के लिए कोई समय खाली है?");

      expect(typeof reply).toBe("string");
      expect(reply!.length).toBeGreaterThan(0);
      expect(DEVANAGARI_PATTERN.test(reply!)).toBe(true);
    },
    30000,
  );
});
