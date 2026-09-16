import "server-only";
import { db } from "@/lib/db";

/**
 * Static, approximate USD-per-million-token prices — good enough for a relative cost signal
 * (per-tenant cost dashboards, anomaly alerts per PRD §17) today. A real billing integration
 * replaces this with live provider pricing; an unrecognized model just records token counts
 * with a null cost rather than guessing.
 */
const PRICE_PER_MILLION_TOKENS_USD: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 3, output: 15 },
  "gpt-4o": { input: 2.5, output: 10 },
};

function estimateCostUsdMicros(model: string, inputTokens: number, outputTokens: number): bigint | null {
  const price = PRICE_PER_MILLION_TOKENS_USD[model];
  if (!price) return null;
  const usd = (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
  return BigInt(Math.round(usd * 1_000_000));
}

export type RecordLlmUsageInput = {
  tenantId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  channel?: string;
};

export async function recordLlmUsage(input: RecordLlmUsageInput): Promise<void> {
  await db.usageEvent.create({
    data: {
      tenantId: input.tenantId,
      kind: "llm_call",
      provider: input.provider,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      costUsdMicros: estimateCostUsdMicros(input.model, input.inputTokens, input.outputTokens),
      channel: input.channel,
    },
  });
}
