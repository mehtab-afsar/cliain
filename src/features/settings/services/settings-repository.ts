import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";
import { ClinicSettingsSchema, type ClinicSettingsData } from "../schema";

/**
 * The one function every settings-reading call site uses — never a raw Prisma row. A thin,
 * stable-signature facade over the template-aware resolver (config-resolver.ts) so the many
 * existing callers here don't need to change: every tenant is on clinic-v1 today, so this cast
 * is exact, not a guess. A call site that also needs the resolved template (to build a system
 * prompt, e.g.) calls resolveTenantConfig() directly instead.
 */
export async function resolveSettings(tenantId: string): Promise<ClinicSettingsData> {
  const { settings } = await resolveTenantConfig(tenantId);
  return settings as ClinicSettingsData;
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
  return field === "clinic.name" || field === "clinic.displayName" || /\.name$/.test(field);
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
 * in the same transaction, so there's never a setting change without an audit trail.
 */
export async function updateSetting(
  tenantId: string,
  field: string,
  value: unknown,
  actor: string,
): Promise<ClinicSettingsData> {
  const current = await resolveSettings(tenantId);
  const oldValue = getPath(current, field);
  const normalizedValue = isNameField(field) && typeof value === "string" ? titleCase(value) : value;

  const updated = setPath(current, field, normalizedValue);
  const parsed = ClinicSettingsSchema.parse(updated);

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
