"use client";

import { useCallback, useEffect, useState } from "react";
import { getSavedClinic } from "../services/clinic-service";
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

const SECURITY_STEP_INDEX = ONBOARDING_STEPS.indexOf("security");

function validateStep(
  stepIndex: number,
  draft: OnboardingDraft,
  security: { password: string; confirmPassword: string },
  isExistingClinic: boolean,
): string | null {
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
  if (stepIndex === SECURITY_STEP_INDEX) {
    if (!security.password && !security.confirmPassword) {
      return isExistingClinic ? null : "Set a password to protect your dashboard.";
    }
    if (security.password.length < 8) return "Password must be at least 8 characters.";
    if (security.password !== security.confirmPassword) return "Passwords don't match.";
    return null;
  }
  return null;
}

export function useOnboardingFlow() {
  const [draft, setDraft] = useState<OnboardingDraft>(createEmptyDraft);
  const [isExistingClinic, setIsExistingClinic] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loading the persisted clinic (if any) or falling back to the in-progress local draft —
  // client-only, so a refresh mid-flow doesn't lose progress.
  useEffect(() => {
    let cancelled = false;
    getSavedClinic().then((saved) => {
      if (cancelled) return;
      if (saved) {
        setDraft(saved);
        setIsExistingClinic(true);
      } else {
        setDraft(getDraft());
      }
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const updateSecurity = useCallback(
    (patch: { password?: string; confirmPassword?: string }) => {
      if (patch.password !== undefined) setPassword(patch.password);
      if (patch.confirmPassword !== undefined) setConfirmPassword(patch.confirmPassword);
    },
    [],
  );

  const goNext = useCallback(() => {
    const validationError = validateStep(
      stepIndex,
      draft,
      { password, confirmPassword },
      isExistingClinic,
    );
    if (validationError) {
      setError(validationError);
      return false;
    }
    setError(null);
    setStepIndex((index) => Math.min(index + 1, ONBOARDING_STEPS.length - 1));
    return true;
  }, [stepIndex, draft, password, confirmPassword, isExistingClinic]);

  const goBack = useCallback(() => {
    setError(null);
    setStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  const finish = useCallback(async () => {
    const validationError = validateStep(
      stepIndex,
      draft,
      { password, confirmPassword },
      isExistingClinic,
    );
    if (validationError) {
      setError(validationError);
      return null;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const completed = await submitOnboarding(draft, password || undefined);
      setDraft(completed);
      return completed;
    } catch {
      setError("Couldn't save your setup — check your connection and try again.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [draft, password, confirmPassword, stepIndex, isExistingClinic]);

  return {
    draft,
    stepIndex,
    step: ONBOARDING_STEPS[stepIndex],
    totalSteps: ONBOARDING_STEPS.length,
    error,
    isHydrated,
    isSubmitting,
    isExistingClinic,
    password,
    confirmPassword,
    updateClinicBasics,
    updateDoctorProfile,
    updateWorkingHoursDay,
    updateSecurity,
    goNext,
    goBack,
    finish,
  };
}
