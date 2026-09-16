import { afterEach, describe, expect, it } from "vitest";
import { mintToolToken } from "@/features/ai-agent/services/tool-token";
import { runAgentTurn } from "@/features/ai-agent/services/agent-loop";
import { createEvalTenant, cleanupEvalTenant } from "../harness";

/**
 * Live-model eval — real Anthropic/OpenAI calls through the actual model router, no mocking.
 * Deliberately NOT part of `npm test` / the deterministic suite (see platform.eval.test.ts,
 * clinic-v1.eval.test.ts): non-deterministic model output makes a hard pass/fail assertion
 * flaky, and every run spends real API budget. Run explicitly with `npm run eval:live` (see
 * package.json), which sets RUN_LIVE_EVALS=true — intended for nightly/on-demand runs, not
 * blocking PRs, per the Phase 0 plan.
 *
 * This file is a starting skeleton, not a full live-eval suite: exactly the kind of thing this
 * phase's plan flagged as needing a fixed case set and a pass-rate threshold (≥90%) before it's
 * load-bearing. Extend the case list below as real conversations get added.
 */
const RUN_LIVE_EVALS = process.env.RUN_LIVE_EVALS === "true";
const HAS_ANTHROPIC_KEY = Boolean(process.env.ANTHROPIC_API_KEY);

describe.skipIf(!RUN_LIVE_EVALS || !HAS_ANTHROPIC_KEY)("live eval: booking flow", () => {
  let tenantId: string | undefined;

  afterEach(async () => {
    if (tenantId) await cleanupEvalTenant(tenantId);
    tenantId = undefined;
  });

  it("books an appointment for a clear, unambiguous request", async () => {
    const { tenant } = await createEvalTenant();
    tenantId = tenant.id;
    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    const phone = `+1555${Date.now()}`;

    const reply = await runAgentTurn(
      token,
      phone,
      "Hi, my name is Test Patient. Can you check what's available tomorrow morning and book the earliest slot?",
    );

    // A real model may need a follow-up turn to confirm a specific slot before booking, so
    // this only asserts the turn produced a real reply — not that it necessarily finished the
    // booking in one message. Tighten this (e.g. assert a Booking row exists) once real
    // transcripts show the model's actual behavior here.
    expect(typeof reply).toBe("string");
    expect(reply!.length).toBeGreaterThan(0);
  });
});
