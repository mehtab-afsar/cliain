import type { Prisma } from "@prisma/client";
import type { OnboardingDraft } from "../types";

/**
 * Extracts the vertical-specific fields onboarding needs to write (createTenant/updateTenant in
 * onboarding-repository.ts) from a draft whose shape differs per template (`gymBasics`/
 * `trainerProfile`/`classSetup` vs `clinicBasics`/`doctorProfile` — see types.ts's doc comment
 * on `OnboardingDraft`). This registry is what keeps those two functions from re-deciding
 * "which draft fields am I reading" at every call site with a scattered `isGym ? ... : ...` —
 * adding a third template means registering an adapter here, not hand-editing
 * onboarding-repository.ts's write paths.
 */
export type OnboardingWriteAdapter = {
  businessName(draft: OnboardingDraft): string;
  businessTimezone(draft: OnboardingDraft): string;
  ownerWhatsappNumber(draft: OnboardingDraft): string | null;
  resourceName(draft: OnboardingDraft): string;
  resourceAttributes(draft: OnboardingDraft): Prisma.InputJsonValue;
  offeringName(draft: OnboardingDraft, fallback: string): string;
  offeringDurationMinutes(draft: OnboardingDraft, fallback: number): number;
  offeringCapacity(draft: OnboardingDraft, fallback: number | undefined): number | undefined;
};

const ONBOARDING_WRITE_ADAPTERS: Record<string, OnboardingWriteAdapter> = {
  "clinic-v1": {
    businessName: (draft) => draft.clinicBasics?.clinicName ?? "",
    businessTimezone: (draft) => draft.clinicBasics?.timezone ?? "UTC",
    ownerWhatsappNumber: (draft) => draft.doctorProfile?.whatsappNumber || null,
    resourceName: (draft) => draft.doctorProfile?.doctorName || "",
    resourceAttributes: (draft) => (draft.doctorProfile?.specialty ? { specialty: draft.doctorProfile.specialty } : {}),
    offeringName: (_draft, fallback) => fallback,
    offeringDurationMinutes: (_draft, fallback) => fallback,
    offeringCapacity: (_draft, fallback) => fallback,
  },
  "gym-v1": {
    businessName: (draft) => draft.gymBasics?.gymName ?? "",
    businessTimezone: (draft) => draft.gymBasics?.timezone ?? "UTC",
    ownerWhatsappNumber: (draft) => draft.trainerProfile?.whatsappNumber || null,
    resourceName: (draft) => draft.trainerProfile?.trainerName || "",
    resourceAttributes: (draft) => (draft.trainerProfile?.role ? { role: draft.trainerProfile.role } : {}),
    offeringName: (draft, fallback) => draft.classSetup?.className || fallback,
    offeringDurationMinutes: (draft, fallback) => draft.classSetup?.durationMinutes ?? fallback,
    offeringCapacity: (draft, fallback) => draft.classSetup?.capacity ?? fallback,
  },
};

/** Throws on an unregistered template — same "fail loudly, don't guess" stance as
 *  registry.ts's resolveTemplate(). */
export function getOnboardingWriteAdapter(version: string): OnboardingWriteAdapter {
  const adapter = ONBOARDING_WRITE_ADAPTERS[version];
  if (!adapter) {
    throw new Error(`No onboarding write-adapter registered for template version "${version}".`);
  }
  return adapter;
}
