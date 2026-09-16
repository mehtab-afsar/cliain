import "server-only";
import { checkAvailabilityTool } from "./check-availability";
import { bookAppointmentTool } from "./book-appointment";
import { cancelAppointmentTool } from "./cancel-appointment";
import { rescheduleAppointmentTool } from "./reschedule-appointment";
import { getPatientTool } from "./get-patient";
import { createPatientTool } from "./create-patient";
import { escalateTool } from "./escalate";
import { getPatientByPhone } from "@/features/patients/services/patient-service";
import { verifyToolToken } from "../tool-token";
import type { ToolContext, ToolDefinition } from "./types";
import type { TemplateContent } from "@/features/templates/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tools have distinct input shapes; the dispatch layer only needs to call execute generically
export const AGENT_TOOLS: ToolDefinition<any>[] = [
  checkAvailabilityTool,
  bookAppointmentTool,
  cancelAppointmentTool,
  rescheduleAppointmentTool,
  getPatientTool,
  createPatientTool,
  escalateTool,
];

function withIndefiniteArticle(noun: string): string {
  return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`;
}

/** Every tool description and input_schema property description is written with
 *  {customer}/{resource}/{booking}/{a_booking} placeholders (see each tool file) so the LLM
 *  never sees clinic-specific wording for a non-clinic tenant. {a_booking} is the
 *  article-prefixed form ("an appointment" / "a class") — "a"/"an" isn't a simple find-replace
 *  since it depends on the resolved noun. */
export function interpolateToolText(text: string, terms: TemplateContent["terms"]): string {
  return text
    .replaceAll("{customer}", terms.customer)
    .replaceAll("{resource}", terms.resource)
    .replaceAll("{a_booking}", withIndefiniteArticle(terms.booking))
    .replaceAll("{booking}", terms.booking);
}

/** Deep version of interpolateToolText for a whole JSON-schema object (input_schema's nested
 *  property descriptions carry placeholders too, not just the tool's own top-level description)
 *  — round-tripping through JSON is simpler and less error-prone than walking an arbitrary,
 *  not-strictly-typed JSON-schema shape by hand. */
function interpolateToolSchema<T>(value: T, terms: TemplateContent["terms"]): T {
  return JSON.parse(interpolateToolText(JSON.stringify(value), terms));
}

export function getToolSchemas(terms: TemplateContent["terms"]) {
  return AGENT_TOOLS.map(({ name, description, input_schema }) => ({
    name,
    description: interpolateToolText(description, terms),
    input_schema: interpolateToolSchema(input_schema, terms),
  }));
}

export function findTool(name: string) {
  return AGENT_TOOLS.find((tool) => tool.name === name);
}

const INVALID_SESSION_RESULT = { error: "Invalid or expired session." };

/**
 * Single dispatch chokepoint shared by both channels (the WhatsApp agent loop and the Vapi
 * webhook) — short-circuits every tool once a customer has been escalated. This is what
 * actually stops a voice call from continuing normal booking after a handoff: Vapi's own
 * model keeps driving the call regardless, and only learns about the handoff from what a
 * tool call returns.
 *
 * Tenant binding: `tenantId`/`channel` come only from `token` (see tool-token.ts) — a caller
 * can never make a tool operate on a different tenant by passing one in, because there's
 * nowhere left to pass one. `token` must have been minted by the calling webhook route only
 * after its own signature check proved the request belongs to that tenant.
 *
 * `terms` is the caller's already-resolved template.terms (cheap — no extra DB call), used
 * only to word the "already handed off" message generically.
 */
export async function runTool(
  name: string,
  input: unknown,
  token: string,
  patientPhone: string,
  terms: TemplateContent["terms"],
): Promise<unknown> {
  const session = verifyToolToken(token);
  if (!session) return INVALID_SESSION_RESULT;

  const context: ToolContext = { tenantId: session.tenantId, channel: session.channel, patientPhone };

  const patient = await getPatientByPhone(context.tenantId, context.patientPhone);
  if (patient?.needsHumanReview && name !== "escalate") {
    return {
      error: interpolateToolText(
        "This conversation has already been handed off to staff. Do not continue automated booking — let the {customer} know staff will follow up, and end the interaction.",
        terms,
      ),
    };
  }

  const tool = findTool(name);
  if (!tool) return { error: `Unknown tool: ${name}` };
  return tool.execute(input, context);
}
