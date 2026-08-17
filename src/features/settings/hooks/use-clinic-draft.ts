"use client";

import { useEffect, useState } from "react";
import { getSavedClinic } from "@/features/onboarding/services/clinic-service";
import type { OnboardingDraft } from "@/features/onboarding/types";

export function useClinicDraft() {
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSavedClinic().then((saved) => {
      if (!cancelled) setDraft(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return draft;
}
