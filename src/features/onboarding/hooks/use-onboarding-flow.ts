"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { getSavedClinic } from "../services/clinic-service";
import {
  createEmptyDraft,
  getDraft,
  saveDraft,
  submitOnboarding,
} from "../services/onboarding-service";
import { getDraftTemplateVersion, getOnboardingSteps } from "../step-registry";
import type {
  ClassSetup,
  ClinicBasics,
  DoctorProfile,
  GymBasics,
  OnboardingDraft,
  TrainerProfile,
  WorkingHoursDay,
} from "../types";

type ValidationT = ReturnType<typeof useTranslations<"Onboarding.validation">>;

function validateStep(stepKey: string, draft: OnboardingDraft, t: ValidationT): string | null {
  if (stepKey === "clinic-basics") {
    if (!draft.clinicBasics?.clinicName.trim()) return t("clinicName");
    if (!draft.clinicBasics?.timezone.trim()) return t("timezone");
    return null;
  }
  if (stepKey === "doctor-profile") {
    if (!draft.doctorProfile?.doctorName.trim()) return t("doctorName");
    return null;
  }
  if (stepKey === "gym-basics") {
    if (!draft.gymBasics?.gymName.trim()) return t("gymName");
    if (!draft.gymBasics?.timezone.trim()) return t("timezone");
    return null;
  }
  if (stepKey === "trainer-profile") {
    if (!draft.trainerProfile?.trainerName.trim()) return t("trainerName");
    return null;
  }
  if (stepKey === "class-setup") {
    if (!draft.classSetup?.className.trim()) return t("className");
    if (!draft.classSetup || draft.classSetup.durationMinutes <= 0) return t("classDuration");
    if (!draft.classSetup || draft.classSetup.capacity <= 0) return t("classCapacity");
    return null;
  }
  if (stepKey === "working-hours") {
    const openDays = draft.workingHours.filter((day) => day.isOpen);
    if (openDays.length === 0) return t("openDay");
    const invalidDay = openDays.find((day) => day.startTime >= day.endTime);
    if (invalidDay) return t("closingTimeAfterOpening", { day: invalidDay.label });
    return null;
  }
  return null;
}

export function useOnboardingFlow() {
  const [draft, setDraft] = useState<OnboardingDraft>(createEmptyDraft);
  const [isExistingClinic, setIsExistingClinic] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("Onboarding.validation");

  const templateVersion = getDraftTemplateVersion(draft);
  const steps = useMemo(() => getOnboardingSteps(templateVersion), [templateVersion]);

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

  const updateTemplateVersion = useCallback((templateVersion: string) => {
    setDraft((prev) => ({ ...prev, templateVersion }));
  }, []);

  const updateClinicBasics = useCallback((patch: Partial<ClinicBasics>) => {
    setDraft((prev) => ({
      ...prev,
      clinicBasics: { ...(prev.clinicBasics ?? { clinicName: "", timezone: "" }), ...patch },
    }));
  }, []);

  const updateDoctorProfile = useCallback((patch: Partial<DoctorProfile>) => {
    setDraft((prev) => ({
      ...prev,
      doctorProfile: { ...(prev.doctorProfile ?? { doctorName: "", specialty: "", whatsappNumber: "" }), ...patch },
    }));
  }, []);

  const updateGymBasics = useCallback((patch: Partial<GymBasics>) => {
    setDraft((prev) => ({
      ...prev,
      gymBasics: { ...(prev.gymBasics ?? { gymName: "", timezone: "" }), ...patch },
    }));
  }, []);

  const updateTrainerProfile = useCallback((patch: Partial<TrainerProfile>) => {
    setDraft((prev) => ({
      ...prev,
      trainerProfile: { ...(prev.trainerProfile ?? { trainerName: "", role: "", whatsappNumber: "" }), ...patch },
    }));
  }, []);

  const updateClassSetup = useCallback((patch: Partial<ClassSetup>) => {
    setDraft((prev) => ({
      ...prev,
      classSetup: {
        ...(prev.classSetup ?? { className: "", durationMinutes: 45, capacity: 12, dayOfWeek: 1, startTime: "18:00" }),
        ...patch,
      },
    }));
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
    const validationError = validateStep(steps[stepIndex].key, draft, t);
    if (validationError) {
      setError(validationError);
      return false;
    }
    setError(null);
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
    return true;
  }, [stepIndex, draft, steps, t]);

  const goBack = useCallback(() => {
    setError(null);
    setStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  /** Jumps directly to a step — e.g. an "Edit" link on the review step, skipping validation. */
  const goToStep = useCallback(
    (index: number) => {
      setError(null);
      setStepIndex(Math.min(Math.max(index, 0), steps.length - 1));
    },
    [steps.length],
  );

  const finish = useCallback(async () => {
    const validationError = validateStep(steps[stepIndex].key, draft, t);
    if (validationError) {
      setError(validationError);
      return null;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const completed = await submitOnboarding(draft);
      setDraft(completed);
      return completed;
    } catch {
      setError(t("saveFailed"));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [draft, stepIndex, steps, t]);

  return {
    draft,
    steps,
    stepIndex,
    step: steps[stepIndex],
    totalSteps: steps.length,
    error,
    isHydrated,
    isSubmitting,
    isExistingClinic,
    updateTemplateVersion,
    updateClinicBasics,
    updateDoctorProfile,
    updateGymBasics,
    updateTrainerProfile,
    updateClassSetup,
    updateWorkingHoursDay,
    goNext,
    goBack,
    goToStep,
    finish,
  };
}
