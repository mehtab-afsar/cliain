import type { TemplateDefinition } from "./types";
import { clinicV1Template } from "./clinic-v1";

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
