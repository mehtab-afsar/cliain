import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, AGENT_MODEL } from "@/lib/anthropic";
import { getPatientByPhone, createPatient } from "@/features/patients/services/patient-service";
import { getDoctorById } from "@/features/appointments/services/doctor-repository";
import { db } from "@/lib/db";
import { resolveSettings } from "@/features/settings/services/settings-repository";
import { getToolSchemas, runTool } from "./tools";
import { appendMessage, loadConversationHistory } from "./conversation-store";
import { buildEmergencyGuidance, buildGreeting, buildSystemPrompt } from "./system-prompt";

const MAX_TOOL_ITERATIONS = 6;
const FALLBACK_REPLY =
  "Sorry, I'm having trouble with that right now — could you try again in a moment?";
const ESCALATION_HANDOFF_REPLY =
  "I'm not able to help with that right now — I've let our team know and they'll follow up with you shortly.";

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

/**
 * Runs one full turn — inbound message in, final reply text out (or null to send nothing,
 * once a conversation has been escalated to staff — see the "escalate" tool and runTool() in
 * ./tools). Persists both the inbound message and the reply to the conversation.
 */
export async function runAgentTurn(
  doctorId: string,
  patientPhone: string,
  inboundMessage: string,
  wamid?: string,
): Promise<string | null> {
  const doctor = await getDoctorById(doctorId);
  const settings = await resolveSettings(doctorId);

  let patient = await getPatientByPhone(doctor.id, patientPhone);
  if (!patient) {
    patient = await createPatient(doctor.id, { phone: patientPhone });
  }

  const history = await loadConversationHistory(patient.id);
  await appendMessage(patient.id, { role: "user", content: inboundMessage }, wamid);

  if (patient.needsHumanReview) {
    // Already handed off to staff — stay silent until they clear it from Needs Attention.
    return null;
  }

  const isFirstTurn = history.length === 0;

  const anthropic = getAnthropicClient();
  const system = buildSystemPrompt(settings, doctor.timezone, patient.name, "text");
  const tools = getToolSchemas() as unknown as Anthropic.Tool[];

  const messages: Anthropic.MessageParam[] = [
    ...history.map((message): Anthropic.MessageParam => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user", content: inboundMessage },
  ];

  let finalText = "";
  let escalatedThisTurn = false;
  let emergencyThisTurn = false;

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
      if (toolUse.name === "escalate") {
        escalatedThisTurn = true;
        const input = toolUse.input as { reason?: string } | undefined;
        if (input?.reason === "emergency") emergencyThisTurn = true;
      }
      const result = await runTool(toolUse.name, toolUse.input, {
        patientPhone,
        doctorId: doctor.id,
        channel: "whatsapp",
      });
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  let reply = finalText;
  if (!reply && !escalatedThisTurn) {
    // Backstop: the model exhausted its tool-call budget without ever deciding to hand off —
    // force the handoff rather than silently give up on the patient.
    await runTool(
      "escalate",
      { reason: "unresolved", note: "Ran out of tool-call attempts." },
      { patientPhone, doctorId: doctor.id, channel: "whatsapp" },
    );
    reply = ESCALATION_HANDOFF_REPLY;
  } else if (!reply) {
    reply = FALLBACK_REPLY;
  }

  if (emergencyThisTurn) {
    // The model reliably *decides* when this applies (that's what the escalate tool call
    // proves), but isn't reliable at reproducing this text verbatim even when instructed to —
    // so the exact wording sent to the patient is enforced here instead of trusted to the
    // model's own generated reply.
    reply = buildEmergencyGuidance(settings);
  }

  if (isFirstTurn) {
    reply = `${buildGreeting(settings)}\n\n${reply}`;
    await db.patient.update({ where: { id: patient.id }, data: { consentGivenAt: new Date() } });
  }

  await appendMessage(patient.id, { role: "assistant", content: reply });
  return reply;
}
