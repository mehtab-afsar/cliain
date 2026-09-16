import "server-only";
import type { Tenant } from "@prisma/client";
import { getVapiConfig, getVapiWebhookSecret } from "@/lib/integration-credentials";
import { AGENT_MODEL } from "@/lib/anthropic";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";
import type { CommonSettingsData } from "@/features/templates/common-settings";
import type { TemplateContent } from "@/features/templates/types";
import { renderGreeting } from "@/features/templates/prompt-render";
import { getToolSchemas } from "./tools";
import { buildSystemPrompt } from "./system-prompt";

const VAPI_API_BASE = "https://api.vapi.ai";

async function requireVapiConfig(doctorId: string) {
  const config = await getVapiConfig(doctorId);
  if (!config) {
    throw new Error("Phone calls are not enabled for this clinic — turn it on from Settings.");
  }
  return config;
}

// Vapi's own model (configured as our same Claude model below) drives the live conversation
// and speech; it calls back into our webhook only to execute a tool — the same tool
// implementations used by the WhatsApp channel, unmodified. Shared by both call directions:
// placeOutboundCall builds one of these inline per reminder call, and the webhook route's
// "assistant-request" handler builds one per inbound call — same brain either way.
export function buildAssistantConfig(
  template: TemplateContent,
  doctor: Tenant,
  settings: CommonSettingsData,
  patientName: string | null,
  firstMessage: string,
  webhookUrl: string,
  webhookSecret: string | null,
  callPurpose?: string,
) {
  return {
    model: {
      provider: "anthropic",
      model: AGENT_MODEL,
      systemPrompt: buildSystemPrompt(template, settings, doctor.timezone, patientName, "voice", callPurpose),
      tools: getToolSchemas(template.terms).map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
        server: webhookSecret ? { url: webhookUrl, secret: webhookSecret } : { url: webhookUrl },
      })),
    },
    firstMessage,
  };
}

/** For an inbound call, there's no customer identity or call purpose yet — the assistant opens
 *  with the same greeting a WhatsApp conversation would ("same brain, same rules" per
 *  system-prompt.ts) and asks who it's speaking with like a real receptionist would. */
export function buildInboundAssistantConfig(
  template: TemplateContent,
  doctor: Tenant,
  settings: CommonSettingsData,
  webhookUrl: string,
  webhookSecret: string | null,
) {
  return buildAssistantConfig(
    template,
    doctor,
    settings,
    null,
    renderGreeting(settings, template.defaultGreeting),
    webhookUrl,
    webhookSecret,
  );
}

export type PlaceCallInput = {
  doctor: Tenant;
  toPhone: string;
  patientName: string | null;
  /** Spoken as part of the opening line and given to the model as context, e.g. "to confirm your appointment tomorrow at 3:00 PM". */
  callPurpose: string;
};

export type PlaceCallResult = { ok: true; callId: string } | { ok: false; error: string };

/** Places an outbound call. Best-effort — never throws; callers decide how to handle failure. */
export async function placeOutboundCall(input: PlaceCallInput): Promise<PlaceCallResult> {
  try {
    const { apiKey, phoneNumberId, webhookUrl } = await requireVapiConfig(input.doctor.id);
    const webhookSecret = await getVapiWebhookSecret(input.doctor.id);
    const { template, commonSettings: settings } = await resolveTenantConfig(input.doctor.id);
    const businessName = settings.business.displayName?.trim() || settings.business.name;
    const firstMessage = `Hi${input.patientName ? ` ${input.patientName}` : ""}, this is ${businessName} calling. ${input.callPurpose}`;

    const response = await fetch(`${VAPI_API_BASE}/call`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumberId,
        customer: { number: input.toPhone },
        assistant: buildAssistantConfig(
          template,
          input.doctor,
          settings,
          input.patientName,
          firstMessage,
          webhookUrl,
          webhookSecret,
          input.callPurpose,
        ),
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
