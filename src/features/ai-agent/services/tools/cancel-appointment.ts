import "server-only";
import { getPatientByPhone } from "@/features/patients/services/patient-service";
import { cancelAppointment } from "@/features/appointments/services/appointment-service";
import { db } from "@/lib/db";
import type { ToolDefinition } from "./types";

type CancelAppointmentInput = { appointmentId: string };

export const cancelAppointmentTool: ToolDefinition<CancelAppointmentInput> = {
  name: "cancel_appointment",
  description:
    "Cancel one of the current {customer}'s upcoming {booking}s. Use the id from get_patient's upcomingAppointments — ask which one if there's more than one.",
  input_schema: {
    type: "object",
    properties: {
      appointmentId: { type: "string", description: "The {booking} id to cancel." },
    },
    required: ["appointmentId"],
  },
  async execute(input, context) {
    const patient = await getPatientByPhone(context.tenantId, context.patientPhone);
    if (!patient) return { error: "No record found for this number." };

    const appointment = await db.booking.findUnique({ where: { id: input.appointmentId } });
    if (!appointment || appointment.customerId !== patient.id) {
      return { error: "That booking doesn't belong to this caller." };
    }

    const cancelled = await cancelAppointment(context.tenantId, input.appointmentId, {
      actor: "ai",
      channel: context.channel,
    });
    return { appointment: { id: cancelled.id, status: cancelled.status } };
  },
};
