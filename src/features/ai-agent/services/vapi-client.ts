import "server-only";
import type { Doctor } from "@prisma/client";
import { getVapiConfig } from "@/lib/integration-credentials";
import { AGENT_MODEL } from "@/lib/anthropic";
import { AGENT_TOOLS } from "./tools";
import { buildSystemPrompt } from "./system-prompt";

const VAPI_API_BASE = "https://api.vapi.ai";

async function requireVapiConfig() {
  const config = await getVapiConfig();
  if (!config) {
    throw new Error(
      "Vapi is not configured — connect it from Settings, or set VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, and VAPI_TOOL_WEBHOOK_URL in .env.local.",
    );
  }
  return config;
}

// Vapi's own model (configured as our same Claude model below) drives the live conversation
// and speech; it calls back into our webhook only to execute a tool — the same tool
// implementations used by the WhatsApp channel, unmodified.
function buildAssistantConfig(
  doctor: Doctor,
  patientName: string | null,
  callPurpose: string,
  webhookUrl: string,
) {
  return {
    model: {
      provider: "anthropic",
      model: AGENT_MODEL,
      systemPrompt: buildSystemPrompt(doctor, patientName, "voice", callPurpose),
      tools: AGENT_TOOLS.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
        server: { url: webhookUrl },
      })),
    },
    firstMessage: `Hi${patientName ? ` ${patientName}` : ""}, this is ${doctor.clinicName ?? doctor.name} calling. ${callPurpose}`,
  };
}

export type PlaceCallInput = {
  doctor: Doctor;
  toPhone: string;
  patientName: string | null;
  /** Spoken as part of the opening line and given to the model as context, e.g. "to confirm your appointment tomorrow at 3:00 PM". */
  callPurpose: string;
};

export type PlaceCallResult = { ok: true; callId: string } | { ok: false; error: string };

/** Places an outbound call. Best-effort — never throws; callers decide how to handle failure. */
export async function placeOutboundCall(input: PlaceCallInput): Promise<PlaceCallResult> {
  try {
    const { apiKey, phoneNumberId, webhookUrl } = await requireVapiConfig();

    const response = await fetch(`${VAPI_API_BASE}/call`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumberId,
        customer: { number: input.toPhone },
        assistant: buildAssistantConfig(input.doctor, input.patientName, input.callPurpose, webhookUrl),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `Vapi call failed (${response.status}): ${body}` };
    }

    const data = (await response.json()) as { id: string };
    return { ok: true, callId: data.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown Vapi error." };
  }
}
