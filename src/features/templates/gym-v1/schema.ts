import { z } from "zod";

/**
 * gym-v1's own overrides document — deliberately not reusing ClinicSettingsSchema even though
 * the two shapes rhyme (business info, a primary-person array, safety, messaging): a gym has
 * trainers, not doctors, and no "specialty" concept, and keeping each template's document
 * shape independent means clinic-v1 can evolve its fields without gym-v1 (or a future
 * template) inheriting the change unintentionally. Both templates converge back to a common
 * shape only through toCommonSettings() (see settings-resolution.ts), not by sharing a schema.
 */
export const GymSettingsSchema = z.object({
  gym: z.object({
    name: z.string().min(1),
    /** Member-facing display name, if different from `name`. Defaults to `name`. */
    displayName: z.string().optional(),
    address: z.string().optional(),
    languages: z.array(z.string()).default(["English"]),
    phoneShownToMembers: z.string().optional(),
  }),
  trainers: z
    .array(
      z.object({
        name: z.string().min(1),
        role: z.string().optional(), // "Head Coach", "Yoga Instructor"
      }),
    )
    .default([]),
  safety: z.object({
    // Read verbatim on an injury/urgent handoff — same role as clinic-v1's emergencyScript,
    // named for this template's own domain.
    escalationScript: z.string().optional(),
    escalationWhatsappNumber: z.string().optional(),
  }),
  messaging: z.object({
    greeting: z.string().optional(),
    tone: z.enum(["upbeat", "neutral", "formal"]).default("upbeat"),
    disclosureEnabled: z.boolean().default(true),
  }),
});

export type GymSettingsData = z.infer<typeof GymSettingsSchema>;
