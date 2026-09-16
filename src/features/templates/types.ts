import { z } from "zod";
import type { ZodType } from "zod";

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
  /** Per-channel writing-style rules, appended to every system prompt. */
  channelStyle: z.record(PromptChannelSchema, z.string().min(1)),
  /** Keyed by the tone value in this template's overridesSchema (e.g. "friendly"/"neutral"/"formal"). */
  toneStyle: z.record(z.string(), z.string().min(1)),
  /** Non-negotiable behavior rules (emergency handling, scope limits) — one entry per rule. */
  safetyRules: z.array(z.string().min(1)).min(1),
  /** Seeded onto a new tenant's single default offering at onboarding time. */
  defaultOffering: z.object({
    name: z.string().min(1),
    durationMinutes: z.number().int().positive(),
    resourceType: z.string().min(1),
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
