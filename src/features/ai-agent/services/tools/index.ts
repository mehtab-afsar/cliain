import "server-only";
import { checkAvailabilityTool } from "./check-availability";
import { bookAppointmentTool } from "./book-appointment";
import { cancelAppointmentTool } from "./cancel-appointment";
import { rescheduleAppointmentTool } from "./reschedule-appointment";
import { getPatientTool } from "./get-patient";
import { createPatientTool } from "./create-patient";
import { escalateTool } from "./escalate";
import { getPatientByPhone } from "@/features/patients/services/patient-service";
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

/**
 * Single dispatch chokepoint shared by both channels (the WhatsApp agent loop and the Vapi
 * webhook) — short-circuits every tool once a patient has been escalated. This is what
 * actually stops a voice call from continuing normal booking after a handoff: Vapi's own
 * model keeps driving the call regardless, and only learns about the handoff from what a
 * tool call returns.
 */
export async function runTool(
  name: string,
  input: unknown,
  context: ToolContext,
): Promise<unknown> {
  const patient = await getPatientByPhone(context.doctorId, context.patientPhone);
  if (patient?.needsHumanReview && name !== "escalate") {
    return HANDED_OFF_RESULT;
  }

  const tool = findTool(name);
  if (!tool) return { error: `Unknown tool: ${name}` };
  return tool.execute(input, context);
}
