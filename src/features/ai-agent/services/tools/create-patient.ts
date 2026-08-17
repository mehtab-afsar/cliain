import "server-only";
import { createPatient } from "@/features/patients/services/patient-service";
import type { ToolDefinition } from "./types";

type CreatePatientInput = { name: string };

export const createPatientTool: ToolDefinition<CreatePatientInput> = {
  name: "create_patient",
  description:
    "Create or update the current patient's record once they've told you their name. Their phone number is already known from WhatsApp.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "The patient's full name, as they gave it." },
    },
    required: ["name"],
  },
  async execute(input, context) {
    const patient = await createPatient({ phone: context.patientPhone, name: input.name });
    return { patient: { id: patient.id, name: patient.name, phone: patient.phone } };
  },
};
