import { z } from "zod";

/**
 * The versioned settings document (see prisma's ClinicSettings model). Every settings-reading
 * call site — the AI prompt builder, the not-connected banner, every future Settings tab —
 * goes through resolveSettings() in settings-repository.ts, never a raw Prisma row, so a field
 * that's missing (new clinic, or a document written before this field existed) always resolves
 * to a sensible default instead of `undefined`.
 *
 * `doctors` is array-shaped even though onboarding only fills in one for now — deliberate,
 * so multi-doctor support (a later phase) doesn't need a breaking document migration.
 */
export const DoctorTitleSchema = z.enum(["Dr.", "Mr.", "Ms.", "none"]);

export const ClinicSettingsSchema = z.object({
  clinic: z.object({
    name: z.string().min(1),
    /** Patient-facing display name, if different from `name` — e.g. a DBA. Defaults to `name`. */
    displayName: z.string().optional(),
    address: z.string().optional(),
    languages: z.array(z.string()).default(["English"]),
    phoneShownToPatients: z.string().optional(),
  }),
  doctors: z
    .array(
      z.object({
        title: DoctorTitleSchema.default("Dr."),
        name: z.string().min(1),
        specialty: z.string().optional(),
      }),
    )
    .default([]),
  safety: z.object({
    emergencyScript: z.string().optional(),
    escalationWhatsappNumber: z.string().optional(),
  }),
  messaging: z.object({
    /** Template; `{clinic}` is interpolated. Falls back to a computed default when empty. */
    greeting: z.string().optional(),
    tone: z.enum(["friendly", "neutral", "formal"]).default("friendly"),
    disclosureEnabled: z.boolean().default(true),
  }),
});

export type ClinicSettingsData = z.infer<typeof ClinicSettingsSchema>;
export type DoctorTitle = z.infer<typeof DoctorTitleSchema>;

export const DEFAULT_GREETING = "Hi! This is {clinic}. I can help you book an appointment.";
