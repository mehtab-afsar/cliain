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

export function getToolSchemas() {
  return AGENT_TOOLS.map(({ name, description, input_schema }) => ({
    name,
    description,
    input_schema,
  }));
}

export function findTool(name: string) {
  return AGENT_TOOLS.find((tool) => tool.name === name);
}

const HANDED_OFF_RESULT = {
  error:
    "This conversation has already been handed off to clinic staff. Do not continue automated booking — let the caller know staff will follow up, and end the interaction.",
};

const INVALID_SESSION_RESULT = { error: "Invalid or expired session." };

/**
 * Single dispatch chokepoint shared by both channels (the WhatsApp agent loop and the Vapi
 * webhook) — short-circuits every tool once a patient has been escalated. This is what
 * actually stops a voice call from continuing normal booking after a handoff: Vapi's own
 * model keeps driving the call regardless, and only learns about the handoff from what a
 * tool call returns.
 *
 * Tenant binding: `tenantId`/`channel` come only from `token` (see tool-token.ts) — a caller
 * can never make a tool operate on a different tenant by passing one in, because there's
 * nowhere left to pass one. `token` must have been minted by the calling webhook route only
 * after its own signature check proved the request belongs to that tenant.
 */
export async function runTool(
  name: string,
  input: unknown,
  token: string,
  patientPhone: string,
): Promise<unknown> {
  const session = verifyToolToken(token);
  if (!session) return INVALID_SESSION_RESULT;

  const context: ToolContext = { tenantId: session.tenantId, channel: session.channel, patientPhone };

  const patient = await getPatientByPhone(context.tenantId, context.patientPhone);
  if (patient?.needsHumanReview && name !== "escalate") {
    return HANDED_OFF_RESULT;
  }

  const tool = findTool(name);
  if (!tool) return { error: `Unknown tool: ${name}` };
  return tool.execute(input, context);
}
