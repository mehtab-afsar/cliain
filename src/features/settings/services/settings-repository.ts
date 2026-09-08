import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ClinicSettingsSchema, type ClinicSettingsData } from "../schema";

function buildFallback(doctor: {
  clinicName: string | null;
  name: string;
  title: string | null;
  specialty: string | null;
  whatsappPhone: string | null;
  emergencyScript: string | null;
  escalationWhatsappNumber: string | null;
}): ClinicSettingsData {
  return {
    clinic: {
      name: doctor.clinicName ?? doctor.name,
      displayName: undefined,
      address: undefined,
      languages: ["English"],
      phoneShownToPatients: doctor.whatsappPhone ?? undefined,
    },
    doctors: [
      {
        title: doctor.title === "Dr." || doctor.title === "Mr." || doctor.title === "Ms." || doctor.title === "none"
          ? doctor.title
          : "Dr.",
        name: doctor.name,
        specialty: doctor.specialty ?? undefined,
      },
    ],
    safety: {
      emergencyScript: doctor.emergencyScript ?? undefined,
      escalationWhatsappNumber: doctor.escalationWhatsappNumber ?? undefined,
    },
    messaging: {
      greeting: undefined,
      tone: "friendly",
      disclosureEnabled: true,
    },
  };
}

/** Shallow per-section merge — stored values win, missing sections/fields fall back. Doctors
 * only falls back wholesale (not merged) since array-of-object merging by index is fragile
 * and this phase only ever has one entry anyway. */
function mergeSettings(
  fallback: ClinicSettingsData,
  stored: Partial<ClinicSettingsData> | undefined,
): ClinicSettingsData {
  if (!stored) return fallback;
  return {
    clinic: { ...fallback.clinic, ...stored.clinic },
    doctors: stored.doctors && stored.doctors.length > 0 ? stored.doctors : fallback.doctors,
    safety: { ...fallback.safety, ...stored.safety },
    messaging: { ...fallback.messaging, ...stored.messaging },
  };
}

/** The one function every settings-reading call site uses — never a raw Prisma row. */
export async function resolveSettings(doctorId: string): Promise<ClinicSettingsData> {
  const doctor = await db.doctor.findUniqueOrThrow({
    where: { id: doctorId },
    include: { settings: true },
  });

  const fallback = buildFallback(doctor);
  const stored = doctor.settings?.data as Partial<ClinicSettingsData> | undefined;
  const merged = mergeSettings(fallback, stored);
  return ClinicSettingsSchema.parse(merged);
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
  doctorId: string,
  field: string,
  value: unknown,
  actor: string,
): Promise<ClinicSettingsData> {
  const current = await resolveSettings(doctorId);
  const oldValue = getPath(current, field);
  const normalizedValue = isNameField(field) && typeof value === "string" ? titleCase(value) : value;

  const updated = setPath(current, field, normalizedValue);
  const parsed = ClinicSettingsSchema.parse(updated);

  await db.$transaction(async (tx) => {
    await tx.clinicSettings.upsert({
      where: { doctorId },
      create: { doctorId, data: parsed as unknown as Prisma.InputJsonValue, schemaVersion: 1 },
      update: { data: parsed as unknown as Prisma.InputJsonValue },
    });
    await tx.settingsAudit.create({
      data: {
        doctorId,
        field,
        oldValue: (oldValue ?? null) as Prisma.InputJsonValue,
        newValue: (normalizedValue ?? null) as Prisma.InputJsonValue,
        actor,
      },
    });
  });

  return parsed;
}

export async function listRecentAudit(doctorId: string, fieldPrefix: string, limit = 20) {
  return db.settingsAudit.findMany({
    where: { doctorId, field: { startsWith: fieldPrefix } },
    orderBy: { at: "desc" },
    take: limit,
  });
}
