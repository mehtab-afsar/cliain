/**
 * Provider-agnostic message/tool-call representation — both agent-loop.ts and each provider
 * adapter (providers/anthropic.ts, providers/openai.ts) translate to/from this shape, instead
 * of agent-loop.ts being typed against one provider's SDK. This is what makes a real failover
 * possible: Anthropic and OpenAI's own content-block shapes differ enough (Anthropic bundles
 * tool results into one user-role message with multiple blocks; OpenAI wants one `role: "tool"`
 * message per result) that agent-loop.ts building either one directly would make it impossible
 * to swap providers mid-conversation without a rewrite.
 */

export type AgentRole = "user" | "assistant";

export type AgentContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; toolUseId: string; content: string };

export type AgentMessage = {
  role: AgentRole;
  content: AgentContentBlock[];
};

export type AgentToolDefinition = {
  name: string;
  description: string;
  /** JSON Schema, same shape both SDKs already expect for a function/tool's parameters. */
  inputSchema: Record<string, unknown>;
};

export type AgentCompletionRequest = {
  system: string;
  tools: AgentToolDefinition[];
  messages: AgentMessage[];
  maxTokens: number;
};

export type AgentStopReason = "tool_use" | "end_turn" | "max_tokens" | "other";

export type AgentCompletionResult = {
  content: AgentContentBlock[];
  stopReason: AgentStopReason;
  usage: { inputTokens: number; outputTokens: number };
  provider: "anthropic" | "openai";
  model: string;
};

export type AgentProviderName = "anthropic" | "openai";

export type AgentProvider = {
  name: AgentProviderName;
  complete(request: AgentCompletionRequest): Promise<AgentCompletionResult>;
};
