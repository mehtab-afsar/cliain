import "server-only";
import { getPatientByPhone } from "@/features/patients/services/patient-service";
import { bookAppointment } from "@/features/appointments/services/appointment-service";
import type { ToolDefinition } from "./types";

type BookAppointmentInput = {
  startAt: string;
  endAt: string;
  reason?: string;
};

export const bookAppointmentTool: ToolDefinition<BookAppointmentInput> = {
  name: "book_appointment",
  description:
    "Book an appointment for the current patient at an exact slot returned by check_availability. Call create_patient first if they're new.",
  input_schema: {
    type: "object",
    properties: {
      startAt: { type: "string", description: "ISO 8601 UTC start time, from a check_availability slot." },
      endAt: { type: "string", description: "ISO 8601 UTC end time, from the same slot." },
      reason: { type: "string", description: "Brief reason for the visit, if the patient mentioned one." },
    },
    required: ["startAt", "endAt"],
  },
  async execute(input, context) {
    const patient = await getPatientByPhone(context.doctorId, context.patientPhone);
    if (!patient) {
      return { error: "No patient record yet — call create_patient first, then retry." };
    }
    try {
      const appointment = await bookAppointment(context.doctorId, {
        patientId: patient.id,
        startAt: input.startAt,
        endAt: input.endAt,
        reason: input.reason,
      });
      return {
        appointment: {
          id: appointment.id,
          startAt: appointment.startAt.toISOString(),
          endAt: appointment.endAt.toISOString(),
          status: appointment.status,
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to book the appointment." };
    }
  },
};
