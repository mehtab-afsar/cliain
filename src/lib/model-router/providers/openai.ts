import "server-only";
import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionMessage,
} from "openai/resources/chat/completions";
import { env } from "@/lib/env";
import type { AgentCompletionRequest, AgentCompletionResult, AgentContentBlock, AgentMessage, AgentStopReason } from "../types";

// Adjustable default — pick whichever current OpenAI model has full tool-calling support and
// the cost/latency profile you want for failover traffic; this isn't meant to track Anthropic's
// model tier 1:1, just to actually be able to finish a booking conversation.
export const OPENAI_MODEL = env.OPENAI_AGENT_MODEL ?? "gpt-4o";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set — required for the OpenAI failover path.");
  }
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Anthropic bundles tool results into one user-role turn with multiple content blocks; OpenAI
 * wants one `role: "tool"` message per result instead. So this is not a 1:1 map — one
 * AgentMessage can expand into several OpenAI messages.
 */
function toOpenAIMessages(system: string, messages: AgentMessage[]): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [{ role: "system", content: system }];

  for (const message of messages) {
    if (message.role === "assistant") {
      const text = message.content
        .filter((block): block is Extract<AgentContentBlock, { type: "text" }> => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      const toolUses = message.content.filter(
        (block): block is Extract<AgentContentBlock, { type: "tool_use" }> => block.type === "tool_use",
      );

      result.push({
        role: "assistant",
        content: text || null,
        ...(toolUses.length > 0
          ? {
              tool_calls: toolUses.map((toolUse) => ({
                id: toolUse.id,
                type: "function" as const,
                function: { name: toolUse.name, arguments: JSON.stringify(toolUse.input ?? {}) },
              })),
            }
          : {}),
      });
      continue;
    }

    // role === "user"
    const toolResults = message.content.filter(
      (block): block is Extract<AgentContentBlock, { type: "tool_result" }> => block.type === "tool_result",
    );
    for (const toolResult of toolResults) {
      result.push({ role: "tool", tool_call_id: toolResult.toolUseId, content: toolResult.content });
    }

    const text = message.content
      .filter((block): block is Extract<AgentContentBlock, { type: "text" }> => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    if (text) {
      result.push({ role: "user", content: text });
    }
  }

  return result;
}

function fromOpenAIMessage(message: ChatCompletionMessage): AgentContentBlock[] {
  const blocks: AgentContentBlock[] = [];
  if (message.content) blocks.push({ type: "text", text: message.content });

  for (const toolCall of message.tool_calls ?? []) {
    if (toolCall.type !== "function") continue; // custom (non-function) tools aren't used here
    let input: unknown = {};
    try {
      input = JSON.parse(toolCall.function.arguments);
    } catch {
      input = {};
    }
    blocks.push({ type: "tool_use", id: toolCall.id, name: toolCall.function.name, input });
  }

  return blocks;
}

function toStopReason(reason: ChatCompletion["choices"][number]["finish_reason"]): AgentStopReason {
  if (reason === "tool_calls" || reason === "function_call") return "tool_use";
  if (reason === "stop") return "end_turn";
  if (reason === "length") return "max_tokens";
  return "other";
}

export async function completeWithOpenAI(request: AgentCompletionRequest): Promise<AgentCompletionResult> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,
    max_completion_tokens: request.maxTokens,
    messages: toOpenAIMessages(request.system, request.messages),
    tools: request.tools.map((tool) => ({
      type: "function" as const,
      function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
    })),
  });

  const choice = response.choices[0];
  if (!choice) {
    throw new Error("OpenAI returned no choices.");
  }

  return {
    content: fromOpenAIMessage(choice.message),
    stopReason: toStopReason(choice.finish_reason),
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
    provider: "openai",
    model: OPENAI_MODEL,
  };
}
