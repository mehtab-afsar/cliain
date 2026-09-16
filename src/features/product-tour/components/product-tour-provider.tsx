"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ProductTourContext } from "../context";
import { buildTourSteps } from "../tour-steps";
import { TourOverlay } from "./tour-overlay";
import type { TemplateContent } from "@/features/templates/types";

const SEEN_KEY = "cliain:tour-seen";

type ProductTourProviderProps = {
  children: ReactNode;
  labels: TemplateContent["labels"];
};

export function ProductTourProvider({ children, labels }: ProductTourProviderProps) {
  const TOUR_STEPS = useMemo(() => buildTourSteps(labels), [labels]);
  const [stepIndex, setStepIndex] = useState(-1);

  // Auto-start once, client-only — not derived state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!window.localStorage.getItem(SEEN_KEY)) setStepIndex(0);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const start = useCallback(() => setStepIndex(0), []);

  const markSeen = useCallback(() => {
    window.localStorage.setItem(SEEN_KEY, "true");
    setStepIndex(-1);
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      window.localStorage.setItem(SEEN_KEY, "true");
      setStepIndex(-1);
    } else {
      setStepIndex(stepIndex + 1);
    }
  }, [stepIndex, TOUR_STEPS.length]);

  const back = useCallback(() => {
    setStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  return (
    <ProductTourContext.Provider value={{ start }}>
      {children}
      {stepIndex >= 0 ? (
        <TourOverlay
          step={TOUR_STEPS[stepIndex]}
          stepIndex={stepIndex}
          totalSteps={TOUR_STEPS.length}
          onNext={next}
          onBack={back}
          onSkip={markSeen}
        />
      ) : null}
    </ProductTourContext.Provider>
  );
}
