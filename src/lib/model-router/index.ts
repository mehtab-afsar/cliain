import "server-only";
import { completeWithAnthropic } from "./providers/anthropic";
import { completeWithOpenAI } from "./providers/openai";
import { getCircuitState, recordSuccess, recordFailure } from "./circuit-breaker";
import { recordLlmUsage } from "./usage-ledger";
import type { AgentCompletionRequest, AgentCompletionResult, AgentProviderName } from "./types";

export type {
  AgentCompletionRequest,
  AgentCompletionResult,
  AgentContentBlock,
  AgentMessage,
  AgentRole,
  AgentStopReason,
  AgentToolDefinition,
} from "./types";

type ProviderEntry = { name: AgentProviderName; complete: (request: AgentCompletionRequest) => Promise<AgentCompletionResult> };

// Anthropic primary, OpenAI failover — tried in this order. A future per-tenant/per-task
// selection rule (PRD §12.1) slots in here without changing runAgentCompletion's callers.
const PROVIDERS: ProviderEntry[] = [
  { name: "anthropic", complete: completeWithAnthropic },
  { name: "openai", complete: completeWithOpenAI },
];

export type RunAgentCompletionParams = AgentCompletionRequest & {
  tenantId: string;
  /** Tags the usage ledger row — 'whatsapp' | 'voice' today. */
  channel?: string;
};

/** Thrown only when every provider either failed or has its circuit open — callers fall back
 *  to their own graceful-degradation path (see agent-loop.ts) rather than crash the turn. */
export class AllProvidersFailedError extends Error {
  constructor(public readonly causes: unknown[]) {
    super(`All model providers failed or are circuit-open: ${causes.map(String).join("; ")}`);
    this.name = "AllProvidersFailedError";
  }
}

/**
 * Anthropic primary, OpenAI automatic failover on full tool-calling parity — both providers
 * can actually drive a live booking conversation, not just serve a canned apology (see the
 * provider-agnostic message/tool schema in types.ts). Providers are tried in order, skipping
 * any whose circuit is currently open (see circuit-breaker.ts) so a provider having a bad
 * minute doesn't cost every subsequent request a full timeout before falling through. Every
 * attempt updates that provider's circuit state; a completion is metered to the usage ledger
 * exactly once, by whichever provider actually served it.
 */
export async function runAgentCompletion(params: RunAgentCompletionParams): Promise<AgentCompletionResult> {
  const { tenantId, channel, ...request } = params;
  const causes: unknown[] = [];

  for (const provider of PROVIDERS) {
    if ((await getCircuitState(provider.name)) === "open") {
      causes.push(new Error(`${provider.name}: circuit open, skipped`));
      continue;
    }

    try {
      const result = await provider.complete(request);
      await recordSuccess(provider.name);
      await recordLlmUsage({
        tenantId,
        provider: result.provider,
        model: result.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        channel,
      });
      return result;
    } catch (error) {
      causes.push(error);
      await recordFailure(provider.name);
    }
  }

  throw new AllProvidersFailedError(causes);
}
