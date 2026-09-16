import { ClinicSettingsSchema, type ClinicSettingsData } from "@/features/settings/schema";
import type { TemplateDefinition } from "../types";
import { validateTemplateContent } from "../types";
import { CHANNEL_STYLE, TONE_STYLE, SAFETY_RULES } from "./prompt";
import { buildFallback, mergeOverrides, toCommonSettings } from "./settings-resolution";

export const clinicV1Template: TemplateDefinition<ClinicSettingsData> = {
  ...validateTemplateContent({
    vertical: "clinic",
    version: "clinic-v1",
    terms: { customer: "patient", resource: "doctor", booking: "appointment" },
    labels: {
      customerSingular: "Patient",
      customerPlural: "Patients",
      resourceSingular: "Doctor",
      resourcePlural: "Doctors",
      bookingSingular: "Appointment",
      bookingPlural: "Appointments",
      businessNoun: "Clinic",
    },
    channelStyle: CHANNEL_STYLE,
    toneStyle: TONE_STYLE,
    safetyRules: SAFETY_RULES,
    defaultGreeting: "Hi! This is {business}. I can help you book an appointment.",
    safetyScriptField: "emergencyScript",
    defaultOffering: { name: "Consultation", durationMinutes: 30, resourceType: "practitioner", mode: "appointment" },
    // Already live/approved in Meta Business Manager — unchanged from before gym-v1 existed.
    whatsappReminderTemplates: { h24: "appointment_reminder_24h", h2: "appointment_reminder_2h" },
  }),
  overridesSchema: ClinicSettingsSchema,
  buildFallback,
  mergeOverrides,
  toCommonSettings,
};
