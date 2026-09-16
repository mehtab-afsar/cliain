import "server-only";
import { db } from "@/lib/db";
import { getPrimaryResourceForTenant } from "@/features/appointments/services/doctor-repository";
import { resolveTemplate } from "../registry";
import type { TemplateDefinition } from "../types";
import type { CommonSettingsData } from "../common-settings";

export type ResolvedTenantConfig = {
  tenant: Awaited<ReturnType<typeof db.tenant.findUniqueOrThrow>>;
  resource: Awaited<ReturnType<typeof getPrimaryResourceForTenant>>;
  template: TemplateDefinition;
  settings: unknown;
  commonSettings: CommonSettingsData;
};

/**
 * The config resolution chain from PRD §8.4, as far as this phase needs it:
 * platform defaults (each template's own hardcoded content) → template(vertical, templateVersion)
 * → tenant.overrides (the ClinicSettings document today). Region/market packs and plan
 * entitlements aren't modeled yet — they're a later phase, and this function is the seam
 * they'll slot into without callers changing.
 */
export async function resolveTenantConfig(tenantId: string): Promise<ResolvedTenantConfig> {
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: { settings: true },
  });
  const resource = await getPrimaryResourceForTenant(tenantId);
  const template = resolveTemplate(tenant.vertical, tenant.templateVersion);

  const fallback = template.buildFallback({ tenant, resource });
  const stored = tenant.settings?.data as Partial<unknown> | undefined;
  const merged = template.mergeOverrides(fallback, stored);
  const settings = template.overridesSchema.parse(merged);
  const commonSettings = template.toCommonSettings(settings);

  return { tenant, resource, template, settings, commonSettings };
}
