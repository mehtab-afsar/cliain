import "server-only";
import { checkAvailabilityTool } from "./check-availability";
import { bookAppointmentTool } from "./book-appointment";
import { cancelAppointmentTool } from "./cancel-appointment";
import { rescheduleAppointmentTool } from "./reschedule-appointment";
import { getPatientTool } from "./get-patient";
import { createPatientTool } from "./create-patient";
import type { ToolDefinition } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tools have distinct input shapes; the dispatch layer only needs to call execute generically
export const AGENT_TOOLS: ToolDefinition<any>[] = [
  checkAvailabilityTool,
  bookAppointmentTool,
  cancelAppointmentTool,
  rescheduleAppointmentTool,
  getPatientTool,
  createPatientTool,
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
