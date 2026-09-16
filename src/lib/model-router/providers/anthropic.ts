import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, AGENT_MODEL } from "@/lib/anthropic";
import type { AgentCompletionRequest, AgentCompletionResult, AgentContentBlock, AgentMessage, AgentStopReason } from "../types";

function toAnthropicMessages(messages: AgentMessage[]): Anthropic.MessageParam[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content.map((block): Anthropic.ContentBlockParam => {
      if (block.type === "text") return { type: "text", text: block.text };
      if (block.type === "tool_use") return { type: "tool_use", id: block.id, name: block.name, input: block.input };
      return { type: "tool_result", tool_use_id: block.toolUseId, content: block.content };
    }),
  }));
}

function fromAnthropicContent(blocks: Anthropic.ContentBlock[]): AgentContentBlock[] {
  return blocks.flatMap((block): AgentContentBlock[] => {
    if (block.type === "text") return [{ type: "text", text: block.text }];
    if (block.type === "tool_use") return [{ type: "tool_use", id: block.id, name: block.name, input: block.input }];
    return [];
  });
}

function toStopReason(reason: Anthropic.Message["stop_reason"]): AgentStopReason {
  if (reason === "tool_use") return "tool_use";
  if (reason === "end_turn" || reason === "stop_sequence") return "end_turn";
  if (reason === "max_tokens") return "max_tokens";
  return "other";
}

export async function completeWithAnthropic(request: AgentCompletionRequest): Promise<AgentCompletionResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: AGENT_MODEL,
    max_tokens: request.maxTokens,
    system: request.system,
    tools: request.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool["input_schema"],
    })),
    messages: toAnthropicMessages(request.messages),
  });

  return {
    content: fromAnthropicContent(response.content),
    stopReason: toStopReason(response.stop_reason),
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    provider: "anthropic",
    model: AGENT_MODEL,
  };
}
