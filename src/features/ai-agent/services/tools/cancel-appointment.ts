import "server-only";
import { getPatientByPhone } from "@/features/patients/services/patient-service";
import { cancelAppointment } from "@/features/appointments/services/appointment-service";
import { db } from "@/lib/db";
import type { ToolDefinition } from "./types";

type CancelAppointmentInput = { appointmentId: string };

export const cancelAppointmentTool: ToolDefinition<CancelAppointmentInput> = {
  name: "cancel_appointment",
  description:
    "Cancel one of the current patient's upcoming appointments. Use the id from get_patient's upcomingAppointments — ask which one if there's more than one.",
  input_schema: {
    type: "object",
    properties: {
      appointmentId: { type: "string", description: "The appointment id to cancel." },
    },
    required: ["appointmentId"],
  },
  async execute(input, context) {
    const patient = await getPatientByPhone(context.patientPhone);
    if (!patient) return { error: "No patient record found for this number." };

    const appointment = await db.appointment.findUnique({ where: { id: input.appointmentId } });
    if (!appointment || appointment.patientId !== patient.id) {
      return { error: "That appointment doesn't belong to this patient." };
    }

    const cancelled = await cancelAppointment(input.appointmentId);
    return { appointment: { id: cancelled.id, status: cancelled.status } };
  },
};
