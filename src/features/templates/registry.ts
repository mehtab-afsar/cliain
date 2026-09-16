import type { Tenant } from "@prisma/client";
import type { TemplateDefinition } from "./types";
import { clinicV1Template } from "./clinic-v1";
import { gymV1Template } from "./gym-v1";

/**
 * Keyed by templateVersion (Tenant.templateVersion), not vertical — a vertical can have more
 * than one version live at once while tenants are migrated across (see PRD §8.4).
 *
 * `TemplateDefinition<any>` here (not `<unknown>`) is deliberate: each template's own
 * `Overrides` type is only known to itself, so this map — and resolveTemplate()'s return type
 * below — are the one place that type gets erased to a common shape, the same way a
 * heterogeneous plugin registry would. Every other file in the app sees a concrete
 * `TemplateDefinition` (Overrides defaults to `unknown`), never `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry erasure boundary, see comment above
const TEMPLATES: Record<string, TemplateDefinition<any>> = {
  "clinic-v1": clinicV1Template,
  "gym-v1": gymV1Template,
};

/** Throws rather than falling back to a default — an unknown template means a tenant is
 *  misconfigured, and silently guessing its behavior is worse than failing loudly. */
export function resolveTemplate(vertical: string, templateVersion: string): TemplateDefinition {
  const template = TEMPLATES[templateVersion];
  if (!template || template.vertical !== vertical) {
    throw new Error(`No template registered for vertical "${vertical}" version "${templateVersion}".`);
  }
  return template;
}

/**
 * Looks up a template by templateVersion alone — for callers (like onboarding, choosing a
 * template for a tenant that doesn't exist yet) that don't have a Tenant row to read `vertical`
 * off. Prefer resolveTemplate() above whenever a vertical is already on hand, since it
 * double-checks the two agree.
 */
export function resolveTemplateByVersion(templateVersion: string): TemplateDefinition {
  const template = TEMPLATES[templateVersion];
  if (!template) {
    throw new Error(`No template registered for version "${templateVersion}".`);
  }
  return template;
}

/**
 * Reads a resolved template's own `vertical` — for callers outside `src/features/templates/**`
 * (like onboarding, writing `Tenant.vertical` for a brand-new tenant) that need the value but
 * aren't exempt from the no-branching rule themselves. This file is exempt, so no disable
 * comment is needed here.
 */
export function getTemplateVertical(template: TemplateDefinition): string {
  return template.vertical;
}

/**
 * Resolves a tenant's template from an already-fetched Tenant row — for callers outside
 * `src/features/templates/**` that already have `tenant` on hand (e.g. mid-booking, mid-reminder)
 * and don't want config-resolver's full settings-resolution/extra DB round trip just to get the
 * template definition. This file is exempt from the no-branching rule, so no disable comment is
 * needed here even though it reads `tenant.vertical`/`tenant.templateVersion` directly.
 */
export function resolveTemplateForTenant(tenant: Pick<Tenant, "vertical" | "templateVersion">): TemplateDefinition {
  return resolveTemplate(tenant.vertical, tenant.templateVersion);
}
