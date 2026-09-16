import { GymSettingsSchema, type GymSettingsData } from "./schema";
import type { TemplateDefinition } from "../types";
import { validateTemplateContent } from "../types";
import { CHANNEL_STYLE, TONE_STYLE, SAFETY_RULES } from "./prompt";
import { buildFallback, mergeOverrides, toCommonSettings } from "./settings-resolution";

export const gymV1Template: TemplateDefinition<GymSettingsData> = {
  ...validateTemplateContent({
    vertical: "gym",
    version: "gym-v1",
    terms: { customer: "member", resource: "trainer", booking: "class" },
    labels: {
      customerSingular: "Member",
      customerPlural: "Members",
      resourceSingular: "Trainer",
      resourcePlural: "Trainers",
      bookingSingular: "Class",
      bookingPlural: "Classes",
      businessNoun: "Gym",
    },
    channelStyle: CHANNEL_STYLE,
    toneStyle: TONE_STYLE,
    safetyRules: SAFETY_RULES,
    defaultGreeting: "Hey! This is {business} 💪 I can help you book a class.",
    safetyScriptField: "escalationScript",
    defaultOffering: {
      name: "Group Class",
      durationMinutes: 45,
      resourceType: "trainer",
      mode: "class",
      defaultCapacity: 12,
    },
    // NOT YET approved in Meta Business Manager — reminders will fail to send for gym-v1
    // tenants until these two templates are submitted and approved. See reminder-service.ts.
    whatsappReminderTemplates: { h24: "class_reminder_24h", h2: "class_reminder_2h" },
  }),
  overridesSchema: GymSettingsSchema,
  buildFallback,
  mergeOverrides,
  toCommonSettings,
};
