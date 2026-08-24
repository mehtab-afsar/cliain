import "server-only";
import { getPatientByPhone } from "@/features/patients/services/patient-service";
import { listUpcomingAppointmentsForPatient } from "@/features/appointments/services/appointment-service";
import type { ToolDefinition } from "./types";

export const getPatientTool: ToolDefinition<Record<string, never>> = {
  name: "get_patient",
  description:
    "Look up the current patient's record and their upcoming booked appointments, by their WhatsApp phone number.",
  input_schema: { type: "object", properties: {} },
  async execute(_input, context) {
    const patient = await getPatientByPhone(context.doctorId, context.patientPhone);
    if (!patient) return { patient: null, upcomingAppointments: [] };

    const upcoming = await listUpcomingAppointmentsForPatient(patient.id);
    return {
      patient: { id: patient.id, name: patient.name, phone: patient.phone },
      upcomingAppointments: upcoming.map((appt) => ({
        id: appt.id,
        startAt: appt.startAt.toISOString(),
        endAt: appt.endAt.toISOString(),
      })),
    };
  },
};
