import type { TemplateFallbackSource } from "../types";
import type { CommonSettingsData } from "../common-settings";
import type { GymSettingsData } from "./schema";

export function buildFallback(source: TemplateFallbackSource): GymSettingsData {
  const { tenant, resource } = source;
  const attributes = (resource.attributes ?? {}) as { role?: string };
  return {
    gym: {
      name: tenant.clinicName ?? resource.name,
      displayName: undefined,
      address: undefined,
      languages: ["English"],
      phoneShownToMembers: tenant.whatsappPhone ?? undefined,
    },
    trainers: [
      {
        name: resource.name,
        role: resource.title ?? attributes.role ?? undefined,
      },
    ],
    safety: {
      escalationScript: tenant.emergencyScript ?? undefined,
      escalationWhatsappNumber: tenant.escalationWhatsappNumber ?? undefined,
    },
    messaging: {
      greeting: undefined,
      tone: "upbeat",
      disclosureEnabled: true,
    },
  };
}

/** Shallow per-section merge — stored values win, missing sections/fields fall back. Trainers
 * only falls back wholesale (not merged) for the same reason clinic-v1's doctors does:
 * array-of-object merging by index is fragile and this phase only ever has one entry anyway. */
export function mergeOverrides(
  fallback: GymSettingsData,
  stored: Partial<GymSettingsData> | undefined,
): GymSettingsData {
  if (!stored) return fallback;
  return {
    gym: { ...fallback.gym, ...stored.gym },
    trainers: stored.trainers && stored.trainers.length > 0 ? stored.trainers : fallback.trainers,
    safety: { ...fallback.safety, ...stored.safety },
    messaging: { ...fallback.messaging, ...stored.messaging },
  };
}

export function toCommonSettings(data: GymSettingsData): CommonSettingsData {
  const trainer = data.trainers[0];
  return {
    business: {
      name: data.gym.name,
      displayName: data.gym.displayName,
      address: data.gym.address,
      languages: data.gym.languages,
      phoneShownToCustomers: data.gym.phoneShownToMembers,
    },
    primaryResource: {
      title: undefined,
      name: trainer?.name ?? data.gym.name,
      subtitle: trainer?.role,
    },
    safety: {
      escalationScript: data.safety.escalationScript,
      escalationWhatsappNumber: data.safety.escalationWhatsappNumber,
    },
    messaging: {
      greeting: data.messaging.greeting,
      tone: data.messaging.tone,
      disclosureEnabled: data.messaging.disclosureEnabled,
    },
  };
}
