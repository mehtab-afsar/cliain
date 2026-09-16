import { z } from "zod";

/**
 * The minimal shape every template's overrides must be able to produce (via
 * `TemplateDefinition.toCommonSettings`) — what the generic prompt-building path
 * (system-prompt.ts, prompt-render.ts) and a handful of vertical-agnostic call sites
 * (escalate.ts, the Vapi integrations route) actually need, regardless of which template a
 * tenant is on. Anything vertical-specific (a gym's trainers array, a clinic's doctors array)
 * stays in that template's own overrides shape (`ClinicSettingsData`, `GymSettingsData`, ...)
 * and is read only by code that already knows which template it's dealing with (the Settings
 * business-details tab, template-authoring code).
 */
export const CommonSettingsSchema = z.object({
  business: z.object({
    name: z.string().min(1),
    displayName: z.string().optional(),
    address: z.string().optional(),
    languages: z.array(z.string()).default(["English"]),
    phoneShownToCustomers: z.string().optional(),
  }),
  primaryResource: z.object({
    title: z.string().optional(), // "Dr." / "Coach" / undefined
    name: z.string().min(1),
    subtitle: z.string().optional(), // specialty / role
  }),
  safety: z.object({
    // The line read verbatim on an escalation (a medical emergency for clinic-v1, an
    // injury/urgent handoff for gym-v1) — same field name for every template; each template's
    // own overridesSchema can call the underlying field whatever fits its domain
    // (clinic-v1 keeps `emergencyScript`), toCommonSettings() does the rename.
    escalationScript: z.string().optional(),
    escalationWhatsappNumber: z.string().optional(),
  }),
  messaging: z.object({
    greeting: z.string().optional(),
    tone: z.string().min(1),
    disclosureEnabled: z.boolean().default(true),
  }),
});

export type CommonSettingsData = z.infer<typeof CommonSettingsSchema>;
