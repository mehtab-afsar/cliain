import type { TemplateFallbackSource } from "../types";
import type { CommonSettingsData } from "../common-settings";
import type { ClinicSettingsData } from "@/features/settings/schema";

export function buildFallback(source: TemplateFallbackSource): ClinicSettingsData {
  const { tenant, resource } = source;
  const attributes = (resource.attributes ?? {}) as { specialty?: string };
  return {
    clinic: {
      name: tenant.clinicName ?? resource.name,
      displayName: undefined,
      address: undefined,
      languages: ["English"],
      phoneShownToPatients: tenant.whatsappPhone ?? undefined,
    },
    doctors: [
      {
        title: resource.title === "Dr." || resource.title === "Mr." || resource.title === "Ms." || resource.title === "none"
          ? resource.title
          : "Dr.",
        name: resource.name,
        specialty: attributes.specialty ?? undefined,
      },
    ],
    safety: {
      emergencyScript: tenant.emergencyScript ?? undefined,
      escalationWhatsappNumber: tenant.escalationWhatsappNumber ?? undefined,
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
export function mergeOverrides(
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

export function toCommonSettings(data: ClinicSettingsData): CommonSettingsData {
  const doctor = data.doctors[0];
  return {
    business: {
      name: data.clinic.name,
      displayName: data.clinic.displayName,
      address: data.clinic.address,
      languages: data.clinic.languages,
      phoneShownToCustomers: data.clinic.phoneShownToPatients,
    },
    primaryResource: {
      title: doctor && doctor.title !== "none" ? doctor.title : undefined,
      name: doctor?.name ?? data.clinic.name,
      subtitle: doctor?.specialty,
    },
    safety: {
      escalationScript: data.safety.emergencyScript,
      escalationWhatsappNumber: data.safety.escalationWhatsappNumber,
    },
    messaging: {
      greeting: data.messaging.greeting,
      tone: data.messaging.tone,
      disclosureEnabled: data.messaging.disclosureEnabled,
    },
  };
}
