import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, AGENT_MODEL } from "@/lib/anthropic";
import { getPatientByPhone, createPatient } from "@/features/patients/services/patient-service";
import { getDoctorById } from "@/features/appointments/services/doctor-repository";
import { getToolSchemas, findTool } from "./tools";
import { appendMessage, loadConversationHistory } from "./conversation-store";
import { buildSystemPrompt } from "./system-prompt";

const MAX_TOOL_ITERATIONS = 6;
const FALLBACK_REPLY =
  "Sorry, I'm having trouble with that right now — could you try again in a moment?";

function toMessageParamContent(
  blocks: Anthropic.ContentBlock[],
): Anthropic.ContentBlockParam[] {
  return blocks.flatMap((block): Anthropic.ContentBlockParam[] => {
    if (block.type === "text") {
      return [{ type: "text", text: block.text }];
    }
    if (block.type === "tool_use") {
      return [{ type: "tool_use", id: block.id, name: block.name, input: block.input }];
    }
    return [];
  });
}

/** Runs one full turn — inbound message in, final reply text out. Persists both to the conversation. */
export async function runAgentTurn(
  doctorId: string,
  patientPhone: string,
  inboundMessage: string,
  wamid?: string,
): Promise<string> {
  const doctor = await getDoctorById(doctorId);

  let patient = await getPatientByPhone(doctor.id, patientPhone);
  if (!patient) {
    patient = await createPatient(doctor.id, { phone: patientPhone });
  }

  const history = await loadConversationHistory(patient.id);
  await appendMessage(patient.id, { role: "user", content: inboundMessage }, wamid);

  const anthropic = getAnthropicClient();
  const system = buildSystemPrompt(doctor, patient.name, "text");
  const tools = getToolSchemas() as unknown as Anthropic.Tool[];

  const messages: Anthropic.MessageParam[] = [
    ...history.map((message): Anthropic.MessageParam => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user", content: inboundMessage },
  ];

  let finalText = "";

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    const response = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: 1024,
      system,
      tools,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) {
      finalText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      break;
    }

    messages.push({ role: "assistant", content: toMessageParamContent(response.content) });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const tool = findTool(toolUse.name);
      const result = tool
        ? await tool.execute(toolUse.input, { patientPhone, doctorId: doctor.id })
        : { error: `Unknown tool: ${toolUse.name}` };
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  const reply = finalText || FALLBACK_REPLY;
  await appendMessage(patient.id, { role: "assistant", content: reply });
  return reply;
}
