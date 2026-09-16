import { ClinicSettingsSchema, type ClinicSettingsData } from "@/features/settings/schema";
import type { TemplateDefinition } from "../types";
import { validateTemplateContent } from "../types";
import { CHANNEL_STYLE, TONE_STYLE, SAFETY_RULES } from "./prompt";
import { buildFallback, mergeOverrides } from "./settings-resolution";

export const clinicV1Template: TemplateDefinition<ClinicSettingsData> = {
  ...validateTemplateContent({
    vertical: "clinic",
    version: "clinic-v1",
    terms: { customer: "patient", resource: "doctor", booking: "appointment" },
    channelStyle: CHANNEL_STYLE,
    toneStyle: TONE_STYLE,
    safetyRules: SAFETY_RULES,
    defaultOffering: { name: "Consultation", durationMinutes: 30, resourceType: "practitioner" },
  }),
  overridesSchema: ClinicSettingsSchema,
  buildFallback,
  mergeOverrides,
};
