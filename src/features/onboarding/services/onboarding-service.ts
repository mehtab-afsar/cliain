import { WEEKDAY_LABELS, type OnboardingDraft, type WorkingHoursDay } from "../types";

const STORAGE_KEY = "cliain:onboarding-draft";

function defaultWorkingHours(): WorkingHoursDay[] {
  return WEEKDAY_LABELS.map((label, dayOfWeek) => ({
    dayOfWeek,
    label,
    isOpen: dayOfWeek >= 1 && dayOfWeek <= 5,
    startTime: "09:00",
    endTime: "17:00",
  }));
}

function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function createEmptyDraft(): OnboardingDraft {
  return {
    clinicBasics: { clinicName: "", timezone: defaultTimezone() },
    doctorProfile: { doctorName: "", specialty: "", whatsappNumber: "" },
    workingHours: defaultWorkingHours(),
    completedAt: null,
  };
}

/** In-progress wizard state — client-only, so a refresh mid-flow doesn't lose progress. */
export function getDraft(): OnboardingDraft {
  if (typeof window === "undefined") return createEmptyDraft();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createEmptyDraft();
  try {
    const parsed = JSON.parse(raw) as OnboardingDraft;
    return { ...createEmptyDraft(), ...parsed };
  } catch {
    return createEmptyDraft();
  }
}

export function saveDraft(draft: OnboardingDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

/** Persists the finished draft to the backend — this is the real Doctor/WorkingHours record. */
export async function submitOnboarding(draft: OnboardingDraft): Promise<OnboardingDraft> {
  const response = await fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!response.ok) {
    throw new Error("Failed to save onboarding details. Please try again.");
  }
  const { draft: saved } = (await response.json()) as { draft: OnboardingDraft };
  saveDraft(saved);
  return saved;
}
