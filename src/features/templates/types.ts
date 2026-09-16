import { z } from "zod";
import type { ZodType } from "zod";
import type { CommonSettingsData } from "./common-settings";

/**
 * Everything that makes a vertical's AI behavior what it is: terminology, per-channel style,
 * the tone options a tenant can pick from, and the safety rules the agent must follow. This is
 * the "engine reads config, never a vertical string" boundary from the PRD's no-branching rule
 * (see eslint.config.mjs) — application code asks resolveTemplate() for these, it never
 * hardcodes clinic-specific phrasing itself. Validated with Zod so a malformed template object
 * fails at startup, not the first time a real conversation hits the missing field.
 */
export const PromptChannelSchema = z.enum(["text", "voice"]);
export type PromptChannel = z.infer<typeof PromptChannelSchema>;

const TemplateContentSchema = z.object({
  /** e.g. "clinic" — the value stored in Tenant.vertical. */
  vertical: z.string().min(1),
  /** e.g. "clinic-v1" — the value stored in Tenant.templateVersion. */
  version: z.string().min(1),
  terms: z.object({
    customer: z.string().min(1), // "patient"
    resource: z.string().min(1), // "doctor"
    booking: z.string().min(1), // "appointment"
  }),
  /**
   * Capitalized, UI-ready labels — kept separate from `terms` above (which is lowercase prose
   * for the system prompt) because pluralization isn't algorithmic ("class" -> "classes" isn't
   * a simple `+s` rule in general, and forcing every UI call site to capitalize/pluralize
   * `terms.customer` itself would be worse than just naming both forms here once).
   */
  labels: z.object({
    customerSingular: z.string().min(1), // "Patient" / "Member"
    customerPlural: z.string().min(1), // "Patients" / "Members"
    resourceSingular: z.string().min(1), // "Doctor" / "Trainer"
    resourcePlural: z.string().min(1), // "Doctors" / "Trainers"
    bookingSingular: z.string().min(1), // "Appointment" / "Class"
    bookingPlural: z.string().min(1), // "Appointments" / "Classes"
    businessNoun: z.string().min(1), // "Clinic" / "Gym"
  }),
  /** Per-channel writing-style rules, appended to every system prompt. */
  channelStyle: z.record(PromptChannelSchema, z.string().min(1)),
  /** Keyed by the tone value in this template's overridesSchema (e.g. "friendly"/"neutral"/"formal"). */
  toneStyle: z.record(z.string(), z.string().min(1)),
  /** Non-negotiable behavior rules (emergency handling, scope limits) — one entry per rule. */
  safetyRules: z.array(z.string().min(1)).min(1),
  /**
   * First-turn message template, used when a tenant hasn't customized `messaging.greeting`.
   * `{business}`/`{resource}` are interpolated by renderGreeting() (prompt-render.ts) from
   * CommonSettingsData — vertical-specific so a gym's default doesn't say "book an appointment".
   */
  defaultGreeting: z.string().min(1),
  /**
   * Which key this template's own `overridesSchema` uses for the verbatim safety/escalation
   * script (clinic-v1: "emergencyScript", gym-v1: "escalationScript") — the one field name that
   * genuinely differs between otherwise-identically-shaped `safety.*` documents, so the shared
   * SafetyTab component (not template-specific like clinic-tab.tsx/gym-tab.tsx) knows which raw
   * document key to read from and write to.
   */
  safetyScriptField: z.string().min(1),
  /** Seeded onto a new tenant's single default offering at onboarding time. */
  defaultOffering: z.object({
    name: z.string().min(1),
    durationMinutes: z.number().int().positive(),
    resourceType: z.string().min(1),
    mode: z.enum(["appointment", "class", "reservation", "request"]).default("appointment"),
    defaultCapacity: z.number().int().positive().optional(),
  }),
  /**
   * The names of this template's own Meta-approved WhatsApp message templates for automated
   * reminders (see reminder-service.ts) — WhatsApp template bodies are fixed text approved by
   * Meta ahead of time (our code only fills in `{{1}}..{{4}}` placeholders: customer name,
   * resource name, date, time), so a template whose approved wording says "appointment" cannot
   * be reused verbatim for a vertical that books "classes". Each template here must exist and be
   * approved in Meta Business Manager before reminders will actually send for that vertical —
   * see reminder-service.ts's doc comment.
   */
  whatsappReminderTemplates: z.object({
    h24: z.string().min(1),
    h2: z.string().min(1),
  }),
});

export type TemplateContent = z.infer<typeof TemplateContentSchema>;

/** The columns config-resolver.ts has on hand to build a fallback from — a subset of Tenant + the tenant's primary Resource. */
export type TemplateFallbackSource = {
  tenant: { clinicName: string | null; whatsappPhone: string | null; emergencyScript: string | null; escalationWhatsappNumber: string | null };
  resource: { name: string; title: string | null; attributes: unknown };
};

export type TemplateDefinition<Overrides = unknown> = TemplateContent & {
  /**
   * Validates (and fills defaults into) a tenant's resolved config for this template —
   * platform/template defaults merged with their `overrides` JSON. clinic-v1 uses the existing
   * `ClinicSettingsSchema` here; a future template defines its own.
   */
  overridesSchema: ZodType<Overrides>;
  /** Derives sensible defaults from raw Tenant/Resource columns, for a tenant with no (or a partial) overrides document yet. */
  buildFallback: (source: TemplateFallbackSource) => Overrides;
  /** Layers a tenant's stored overrides document over this template's fallback. Shallow per-section by default is fine; a template can merge however its shape needs. */
  mergeOverrides: (fallback: Overrides, stored: Partial<Overrides> | undefined) => Overrides;
  /** Projects this template's exact overrides shape down to the common subset every generic
   *  call site (prompt building, escalation, the Vapi integrations route) can rely on. */
  toCommonSettings: (overrides: Overrides) => CommonSettingsData;
};

/** Throws with a template-identifying message on a malformed definition, rather than a bare Zod error. */
export function validateTemplateContent(content: TemplateContent): TemplateContent {
  const result = TemplateContentSchema.safeParse(content);
  if (!result.success) {
    throw new Error(
      `Invalid template definition "${content.vertical}/${content.version}": ${result.error.message}`,
    );
  }
  return result.data;
}
