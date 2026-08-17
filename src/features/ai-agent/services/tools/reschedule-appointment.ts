import "server-only";
import { getPatientByPhone } from "@/features/patients/services/patient-service";
import { rescheduleAppointment } from "@/features/appointments/services/appointment-service";
import { db } from "@/lib/db";
import type { ToolDefinition } from "./types";

type RescheduleAppointmentInput = {
  appointmentId: string;
  startAt: string;
  endAt: string;
};

export const rescheduleAppointmentTool: ToolDefinition<RescheduleAppointmentInput> = {
  name: "reschedule_appointment",
  description:
    "Move one of the current patient's upcoming appointments to a new slot returned by check_availability.",
  input_schema: {
    type: "object",
    properties: {
      appointmentId: { type: "string", description: "The appointment id to reschedule." },
      startAt: { type: "string", description: "New ISO 8601 UTC start time, from a check_availability slot." },
      endAt: { type: "string", description: "New ISO 8601 UTC end time, from the same slot." },
    },
    required: ["appointmentId", "startAt", "endAt"],
  },
  async execute(input, context) {
    const patient = await getPatientByPhone(context.patientPhone);
    if (!patient) return { error: "No patient record found for this number." };

    const appointment = await db.appointment.findUnique({ where: { id: input.appointmentId } });
    if (!appointment || appointment.patientId !== patient.id) {
      return { error: "That appointment doesn't belong to this patient." };
    }

    try {
      const updated = await rescheduleAppointment({
        appointmentId: input.appointmentId,
        startAt: input.startAt,
        endAt: input.endAt,
      });
      return {
        appointment: {
          id: updated.id,
          startAt: updated.startAt.toISOString(),
          endAt: updated.endAt.toISOString(),
          status: updated.status,
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to reschedule the appointment." };
    }
  },
};
