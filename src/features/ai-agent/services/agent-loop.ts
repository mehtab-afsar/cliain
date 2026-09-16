import "server-only";
import { runAgentCompletion, AllProvidersFailedError } from "@/lib/model-router";
import type { AgentContentBlock, AgentMessage } from "@/lib/model-router";
import { getPatientByPhone, createPatient } from "@/features/patients/services/patient-service";
import { db } from "@/lib/db";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";
import type { ClinicSettingsData } from "@/features/settings/schema";
import { getToolSchemas, runTool } from "./tools";
import { verifyToolToken } from "./tool-token";
import { appendMessage, loadConversationHistory } from "./conversation-store";
import { buildEmergencyGuidance, buildGreeting, buildSystemPrompt } from "./system-prompt";

export const MAX_TOOL_ITERATIONS = 6;
const FALLBACK_REPLY =
  "Sorry, I'm having trouble with that right now — could you try again in a moment?";
export const ESCALATION_HANDOFF_REPLY =
  "I'm not able to help with that right now — I've let our team know and they'll follow up with you shortly.";

function isBlockType<T extends AgentContentBlock["type"]>(type: T) {
  return (block: AgentContentBlock): block is Extract<AgentContentBlock, { type: T }> => block.type === type;
}

/**
 * Runs one full turn — inbound message in, final reply text out (or null to send nothing,
 * once a conversation has been escalated to staff — see the "escalate" tool and runTool() in
 * ./tools). Persists both the inbound message and the reply to the conversation.
 *
 * `token` must have been minted by the calling webhook route (see tool-token.ts) only after
 * its own signature check proved the request belongs to a real tenant — this function derives
 * `tenantId` from the verified token, never from a caller-supplied id, and passes the same
 * token on to every tool call this turn makes.
 */
export async function runAgentTurn(
  token: string,
  patientPhone: string,
  inboundMessage: string,
  wamid?: string,
): Promise<string | null> {
  const session = verifyToolToken(token);
  if (!session) throw new Error("runAgentTurn called with an invalid or expired tool token.");

  const { tenant, template, settings: rawSettings } = await resolveTenantConfig(session.tenantId);
  const settings = rawSettings as ClinicSettingsData;

  let patient = await getPatientByPhone(tenant.id, patientPhone);
  if (!patient) {
    patient = await createPatient(tenant.id, { phone: patientPhone });
  }

  const history = await loadConversationHistory(patient.id);
  await appendMessage(patient.id, { role: "user", content: inboundMessage }, wamid);

  if (patient.needsHumanReview) {
    // Already handed off to staff — stay silent until they clear it from Needs Attention.
    return null;
  }

  const isFirstTurn = history.length === 0;

  const system = buildSystemPrompt(template, settings, tenant.timezone, patient.name, "text");
  const tools = getToolSchemas().map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.input_schema as Record<string, unknown>,
  }));

  const messages: AgentMessage[] = [
    ...history.map((message): AgentMessage => ({
      role: message.role,
      content: [{ type: "text", text: message.content }],
    })),
    { role: "user", content: [{ type: "text", text: inboundMessage }] },
  ];

  let finalText = "";
  let escalatedThisTurn = false;
  let emergencyThisTurn = false;
  let providerOutage = false;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    let completion;
    try {
      completion = await runAgentCompletion({
        tenantId: tenant.id,
        channel: "whatsapp",
        system,
        tools,
        messages,
        maxTokens: 1024,
      });
    } catch (error) {
      if (error instanceof AllProvidersFailedError) {
        console.error("[agent-loop] All model providers unavailable:", error);
        providerOutage = true;
        break;
      }
      throw error;
    }

    const toolUseBlocks = completion.content.filter(isBlockType("tool_use"));

    if (toolUseBlocks.length === 0) {
      finalText = completion.content
        .filter(isBlockType("text"))
        .map((block) => block.text)
        .join("\n")
        .trim();
      break;
    }

    messages.push({ role: "assistant", content: completion.content });

    const toolResultBlocks: AgentContentBlock[] = [];
    for (const toolUse of toolUseBlocks) {
      if (toolUse.name === "escalate") {
        escalatedThisTurn = true;
        const input = toolUse.input as { reason?: string } | undefined;
        if (input?.reason === "emergency") emergencyThisTurn = true;
      }
      const result = await runTool(toolUse.name, toolUse.input, token, patientPhone);
      toolResultBlocks.push({ type: "tool_result", toolUseId: toolUse.id, content: JSON.stringify(result) });
    }
    messages.push({ role: "user", content: toolResultBlocks });
  }

  let reply = finalText;
  if (providerOutage) {
    // Both providers failed or are circuit-open — don't leave the patient hanging or let the
    // AI pretend to help; hand off to staff exactly like the tool-budget backstop below.
    await runTool(
      "escalate",
      { reason: "unresolved", note: "AI providers unavailable." },
      token,
      patientPhone,
    );
    reply = ESCALATION_HANDOFF_REPLY;
  } else if (!reply && !escalatedThisTurn) {
    // Backstop: the model exhausted its tool-call budget without ever deciding to hand off —
    // force the handoff rather than silently give up on the patient.
    await runTool(
      "escalate",
      { reason: "unresolved", note: "Ran out of tool-call attempts." },
      token,
      patientPhone,
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
    await db.customer.update({
      where: { id: patient.id },
      data: { consents: { whatsappDisclosure: { grantedAt: new Date().toISOString() } } },
    });
  }

  await appendMessage(patient.id, { role: "assistant", content: reply });
  return reply;
}
