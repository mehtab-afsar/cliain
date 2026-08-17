import type { OnboardingDraft } from "../types";

/** Reads the persisted clinic/doctor record — for readers outside the wizard (dashboard, settings). */
export async function getSavedClinic(): Promise<OnboardingDraft | null> {
  const response = await fetch("/api/onboarding");
  if (!response.ok) return null;
  const { draft } = (await response.json()) as { draft: OnboardingDraft | null };
  return draft;
}
