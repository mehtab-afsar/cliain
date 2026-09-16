import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";
import type { CommonSettingsData } from "@/features/templates/common-settings";

/**
 * The common-projection facade every vertical-agnostic settings-reading call site uses (the
 * "not-connected" banner, escalate.ts, the Vapi integrations route) — never a raw Prisma row,
 * and now a real, honestly-typed subset rather than a clinic-only cast: works for any template.
 * A call site that needs the tenant's *exact* per-template shape (the Settings business-details
 * tab, updateSetting below) calls resolveTenantConfig() directly instead.
 */
export async function resolveSettings(tenantId: string): Promise<CommonSettingsData> {
  const { commonSettings } = await resolveTenantConfig(tenantId);
  return commonSettings;
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const clone: Record<string, unknown> = structuredClone(obj);
  let cursor = clone;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    const next = cursor[key];
    cursor[key] = next && typeof next === "object" ? structuredClone(next) : {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return clone;
}

function isNameField(field: string): boolean {
  return /\.(name|displayName)$/.test(field);
}

/** "mehtab" -> "Mehtab" — applied on save to every name-like field per the "capitalise proper nouns" rule. */
function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * The one write path for every setting — updates the document and appends a SettingsAudit row
 * in the same transaction, so there's never a setting change without an audit trail. Validates
 * against the tenant's own template's overridesSchema (not a hardcoded ClinicSettingsSchema
 * import), so this works for any template, not just clinic-v1.
 */
export async function updateSetting(
  tenantId: string,
  field: string,
  value: unknown,
  actor: string,
): Promise<unknown> {
  const { template, settings: current } = await resolveTenantConfig(tenantId);
  const oldValue = getPath(current, field);
  const normalizedValue = isNameField(field) && typeof value === "string" ? titleCase(value) : value;

  const updated = setPath(current as Record<string, unknown>, field, normalizedValue);
  const parsed = template.overridesSchema.parse(updated);

  await db.$transaction(async (tx) => {
    await tx.clinicSettings.upsert({
      where: { tenantId },
      create: { tenantId, data: parsed as unknown as Prisma.InputJsonValue, schemaVersion: 1 },
      update: { data: parsed as unknown as Prisma.InputJsonValue },
    });
    await tx.settingsAudit.create({
      data: {
        tenantId,
        field,
        oldValue: (oldValue ?? null) as Prisma.InputJsonValue,
        newValue: (normalizedValue ?? null) as Prisma.InputJsonValue,
        actor,
      },
    });
  });

  return parsed;
}

export async function listRecentAudit(tenantId: string, fieldPrefix: string, limit = 20) {
  return db.settingsAudit.findMany({
    where: { tenantId, field: { startsWith: fieldPrefix } },
    orderBy: { at: "desc" },
    take: limit,
  });
}
