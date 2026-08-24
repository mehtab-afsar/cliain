import "server-only";
import { checkAvailability } from "@/features/appointments/services/availability-service";
import type { ToolDefinition } from "./types";

type CheckAvailabilityInput = {
  date: string;
  earliestTime?: string;
  latestTime?: string;
};

export const checkAvailabilityTool: ToolDefinition<CheckAvailabilityInput> = {
  name: "check_availability",
  description:
    "Check the doctor's open appointment slots on a given date, optionally narrowed to a time-of-day range. Always call this before offering times to a patient.",
  input_schema: {
    type: "object",
    properties: {
      date: {
        type: "string",
        description: "ISO date (YYYY-MM-DD), local to the clinic's timezone.",
      },
      earliestTime: {
        type: "string",
        description: "Optional 24h HH:MM lower bound, e.g. '13:00' for 'afternoon'.",
      },
      latestTime: {
        type: "string",
        description: "Optional 24h HH:MM upper bound, e.g. '12:00' for 'morning'.",
      },
    },
    required: ["date"],
  },
  async execute(input, context) {
    const slots = await checkAvailability(context.doctorId, input);
    return { slots };
  },
};
