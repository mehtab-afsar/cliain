import { afterEach, describe, expect, it, vi } from "vitest";
import { _resetCircuitBreakerMemoryStateForTests } from "./circuit-breaker";

const completeWithAnthropic = vi.fn();
const completeWithOpenAI = vi.fn();
const recordLlmUsage = vi.fn();

vi.mock("./providers/anthropic", () => ({ completeWithAnthropic: (...args: unknown[]) => completeWithAnthropic(...args) }));
vi.mock("./providers/openai", () => ({ completeWithOpenAI: (...args: unknown[]) => completeWithOpenAI(...args) }));
vi.mock("./usage-ledger", () => ({ recordLlmUsage: (...args: unknown[]) => recordLlmUsage(...args) }));

const { runAgentCompletion, AllProvidersFailedError } = await import("./index");

const BASE_REQUEST = {
  tenantId: "tenant_1",
  system: "You are a helpful assistant.",
  tools: [],
  messages: [{ role: "user" as const, content: [{ type: "text" as const, text: "hi" }] }],
  maxTokens: 1024,
};

const ANTHROPIC_RESULT = {
  content: [{ type: "text" as const, text: "hello from anthropic" }],
  stopReason: "end_turn" as const,
  usage: { inputTokens: 10, outputTokens: 5 },
  provider: "anthropic" as const,
  model: "claude-sonnet-5",
};

const OPENAI_RESULT = {
  content: [{ type: "text" as const, text: "hello from openai" }],
  stopReason: "end_turn" as const,
  usage: { inputTokens: 11, outputTokens: 6 },
  provider: "openai" as const,
  model: "gpt-4o",
};

describe("runAgentCompletion", () => {
  afterEach(() => {
    completeWithAnthropic.mockReset();
    completeWithOpenAI.mockReset();
    recordLlmUsage.mockReset();
    _resetCircuitBreakerMemoryStateForTests();
  });

  it("uses Anthropic when it succeeds, and never calls OpenAI", async () => {
    completeWithAnthropic.mockResolvedValue(ANTHROPIC_RESULT);

    const result = await runAgentCompletion(BASE_REQUEST);

    expect(result).toEqual(ANTHROPIC_RESULT);
    expect(completeWithOpenAI).not.toHaveBeenCalled();
    expect(recordLlmUsage).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant_1", provider: "anthropic", model: "claude-sonnet-5" }),
    );
  });

  it("fails over to OpenAI when Anthropic throws, and still completes the conversation", async () => {
    completeWithAnthropic.mockRejectedValue(new Error("Anthropic 500"));
    completeWithOpenAI.mockResolvedValue(OPENAI_RESULT);

    const result = await runAgentCompletion(BASE_REQUEST);

    expect(result).toEqual(OPENAI_RESULT);
    expect(completeWithAnthropic).toHaveBeenCalledOnce();
    expect(recordLlmUsage).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "openai", model: "gpt-4o" }),
    );
  });

  it("throws AllProvidersFailedError when both providers fail", async () => {
    completeWithAnthropic.mockRejectedValue(new Error("Anthropic down"));
    completeWithOpenAI.mockRejectedValue(new Error("OpenAI down"));

    await expect(runAgentCompletion(BASE_REQUEST)).rejects.toBeInstanceOf(AllProvidersFailedError);
    expect(recordLlmUsage).not.toHaveBeenCalled();
  });

  it("skips a provider whose circuit is open, going straight to the next one", async () => {
    completeWithAnthropic.mockRejectedValue(new Error("Anthropic down"));
    completeWithOpenAI.mockResolvedValue(OPENAI_RESULT);

    // Three consecutive failures trips the breaker (see circuit-breaker.ts).
    await runAgentCompletion(BASE_REQUEST);
    await runAgentCompletion(BASE_REQUEST);
    await runAgentCompletion(BASE_REQUEST);
    completeWithAnthropic.mockClear();
    await runAgentCompletion(BASE_REQUEST);

    expect(completeWithAnthropic).not.toHaveBeenCalled();
    expect(completeWithOpenAI).toHaveBeenCalled();
  });
});
