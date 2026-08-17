"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createEmptyDraft,
  getDraft,
  saveDraft,
  submitOnboarding,
} from "../services/onboarding-service";
import {
  ONBOARDING_STEPS,
  type ClinicBasics,
  type DoctorProfile,
  type OnboardingDraft,
  type WorkingHoursDay,
} from "../types";

function validateStep(stepIndex: number, draft: OnboardingDraft): string | null {
  if (stepIndex === 0) {
    if (!draft.clinicBasics.clinicName.trim()) return "Enter your clinic's name.";
    if (!draft.clinicBasics.timezone.trim()) return "Select a timezone.";
    return null;
  }
  if (stepIndex === 1) {
    if (!draft.doctorProfile.doctorName.trim()) return "Enter the doctor's name.";
    return null;
  }
  if (stepIndex === 2) {
    const openDays = draft.workingHours.filter((day) => day.isOpen);
    if (openDays.length === 0) return "Open at least one day of the week.";
    const invalidDay = openDays.find((day) => day.startTime >= day.endTime);
    if (invalidDay) return `${invalidDay.label}'s closing time must be after opening time.`;
    return null;
  }
  return null;
}

export function useOnboardingFlow() {
  const [draft, setDraft] = useState<OnboardingDraft>(createEmptyDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hydrating from localStorage (client-only) after mount, not derived state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setDraft(getDraft());
    setIsHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (isHydrated) saveDraft(draft);
  }, [draft, isHydrated]);

  const updateClinicBasics = useCallback((patch: Partial<ClinicBasics>) => {
    setDraft((prev) => ({ ...prev, clinicBasics: { ...prev.clinicBasics, ...patch } }));
  }, []);

  const updateDoctorProfile = useCallback((patch: Partial<DoctorProfile>) => {
    setDraft((prev) => ({ ...prev, doctorProfile: { ...prev.doctorProfile, ...patch } }));
  }, []);

  const updateWorkingHoursDay = useCallback(
    (dayOfWeek: number, patch: Partial<WorkingHoursDay>) => {
      setDraft((prev) => ({
        ...prev,
        workingHours: prev.workingHours.map((day) =>
          day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day,
        ),
      }));
    },
    [],
  );

  const goNext = useCallback(() => {
    const validationError = validateStep(stepIndex, draft);
    if (validationError) {
      setError(validationError);
      return false;
    }
    setError(null);
    setStepIndex((index) => Math.min(index + 1, ONBOARDING_STEPS.length - 1));
    return true;
  }, [stepIndex, draft]);

  const goBack = useCallback(() => {
    setError(null);
    setStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  const finish = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const completed = await submitOnboarding(draft);
      setDraft(completed);
      return completed;
    } catch {
      setError("Couldn't save your setup — check your connection and try again.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [draft]);

  return {
    draft,
    stepIndex,
    step: ONBOARDING_STEPS[stepIndex],
    totalSteps: ONBOARDING_STEPS.length,
    error,
    isHydrated,
    isSubmitting,
    updateClinicBasics,
    updateDoctorProfile,
    updateWorkingHoursDay,
    goNext,
    goBack,
    finish,
  };
}
