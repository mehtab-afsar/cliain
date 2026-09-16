import "server-only";
import { getPatientByPhone } from "@/features/patients/services/patient-service";
import { bookAppointment } from "@/features/appointments/services/appointment-service";
import type { ToolDefinition } from "./types";

type BookAppointmentInput = {
  startAt: string;
  endAt: string;
  reason?: string;
  // Class-mode offerings only — the sessionId from a check_availability slot, and how many
  // people this booking covers (e.g. "book me and a friend" -> partySize 2).
  sessionId?: string;
  partySize?: number;
};

export const bookAppointmentTool: ToolDefinition<BookAppointmentInput> = {
  name: "book_appointment",
  description:
    "Book {a_booking} for the current {customer} at an exact slot returned by check_availability. Call create_patient first if they're new. If the slot came back with a sessionId (class-mode offerings), pass it here along with partySize (how many people, default 1).",
  // ^ {a_booking} interpolates to "an appointment" / "a class" — see interpolateToolText in ./index.ts.
  input_schema: {
    type: "object",
    properties: {
      startAt: { type: "string", description: "ISO 8601 UTC start time, from a check_availability slot." },
      endAt: { type: "string", description: "ISO 8601 UTC end time, from the same slot." },
      reason: { type: "string", description: "Brief reason for the visit, if the {customer} mentioned one." },
      sessionId: { type: "string", description: "Only for class-mode slots — the sessionId returned by check_availability." },
      partySize: { type: "integer", description: "Only for class-mode slots — how many people to book in, default 1." },
    },
    required: ["startAt", "endAt"],
  },
  async execute(input, context) {
    const patient = await getPatientByPhone(context.tenantId, context.patientPhone);
    if (!patient) {
      return { error: "No record found yet for this number — call create_patient first, then retry." };
    }
    try {
      const appointment = await bookAppointment(
        context.tenantId,
        {
          patientId: patient.id,
          startAt: input.startAt,
          endAt: input.endAt,
          reason: input.reason,
          sessionId: input.sessionId,
          partySize: input.partySize,
        },
        { actor: "ai", channel: context.channel },
      );
      return {
        appointment: {
          id: appointment.id,
          startAt: appointment.startAt.toISOString(),
          endAt: appointment.endAt.toISOString(),
          status: appointment.status,
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to complete the booking." };
    }
  },
};
