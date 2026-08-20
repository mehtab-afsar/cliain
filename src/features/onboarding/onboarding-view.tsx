"use client";

import { Building2, ClipboardCheck, Clock, Lock, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOnboardingFlow } from "./hooks/use-onboarding-flow";
import { OnboardingLayout } from "./components/onboarding-layout";
import { OnboardingPreview } from "./components/onboarding-preview";
import { ClinicBasicsStep } from "./components/clinic-basics-step";
import { DoctorProfileStep } from "./components/doctor-profile-step";
import { WorkingHoursStep } from "./components/working-hours-step";
import { ReviewStep } from "./components/review-step";
import { SecurityStep } from "./components/security-step";

const STEP_META = [
  {
    label: "Clinic",
    icon: Building2,
    title: "Tell us about your clinic",
    description: "This is what patients will see when Cliain messages them.",
  },
  {
    label: "Doctor",
    icon: UserRound,
    title: "Who's this scheduler for?",
    description: "Add the doctor patients will be booking with.",
  },
  {
    label: "Hours",
    icon: Clock,
    title: "Set your working hours",
    description: "Cliain only offers slots inside these hours.",
  },
  {
    label: "Review",
    icon: ClipboardCheck,
    title: "Review and finish",
    description: "Double-check everything before you go live.",
  },
  {
    label: "Secure",
    icon: Lock,
    title: "Protect your dashboard",
    description: "Set a password — you'll use it to sign back in.",
  },
];

export function OnboardingView() {
  const router = useRouter();
  const {
    draft,
    stepIndex,
    totalSteps,
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
  } = useOnboardingFlow();

  if (!isHydrated) return null;

  const isLastStep = stepIndex === totalSteps - 1;
  const copy = STEP_META[stepIndex];

  async function handleNext() {
    if (isLastStep) {
      const completed = await finish();
      if (completed) router.push("/dashboard");
      return;
    }
    goNext();
  }

  return (
    <OnboardingLayout
      stepIndex={stepIndex}
      steps={STEP_META}
      title={copy.title}
      description={copy.description}
      error={error}
      onBack={goBack}
      onNext={handleNext}
      isFirstStep={stepIndex === 0}
      isLastStep={isLastStep}
      isNextDisabled={isSubmitting}
      nextLabel={isLastStep && isSubmitting ? "Saving…" : undefined}
      preview={<OnboardingPreview draft={draft} stepIndex={stepIndex} />}
    >
      {stepIndex === 0 ? (
        <ClinicBasicsStep value={draft.clinicBasics} onChange={updateClinicBasics} />
      ) : null}
      {stepIndex === 1 ? (
        <DoctorProfileStep value={draft.doctorProfile} onChange={updateDoctorProfile} />
      ) : null}
      {stepIndex === 2 ? (
        <WorkingHoursStep
          value={draft.workingHours}
          onChangeDay={updateWorkingHoursDay}
        />
      ) : null}
      {stepIndex === 3 ? <ReviewStep draft={draft} /> : null}
      {stepIndex === 4 ? (
        <SecurityStep
          password={password}
          confirmPassword={confirmPassword}
          isExistingClinic={isExistingClinic}
          onChange={updateSecurity}
        />
      ) : null}
    </OnboardingLayout>
  );
}
