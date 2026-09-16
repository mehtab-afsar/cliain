"use client";

import { useRouter } from "next/navigation";
import { useOnboardingFlow } from "./hooks/use-onboarding-flow";
import { getDraftTemplateVersion } from "./step-registry";
import { OnboardingLayout } from "./components/onboarding-layout";
import { OnboardingPreview } from "./components/onboarding-preview";
import { TemplateSelectStep } from "./components/template-select-step";
import { ClinicBasicsStep } from "./components/clinic-basics-step";
import { DoctorProfileStep } from "./components/doctor-profile-step";
import { GymBasicsStep } from "./components/gym-basics-step";
import { TrainerProfileStep } from "./components/trainer-profile-step";
import { WorkingHoursStep } from "./components/working-hours-step";
import { ClassSetupStep } from "./components/class-setup-step";
import { ReviewStep } from "./components/review-step";

const EMPTY_CLINIC_BASICS = { clinicName: "", timezone: "" };
const EMPTY_DOCTOR_PROFILE = { doctorName: "", specialty: "", whatsappNumber: "" };
const EMPTY_GYM_BASICS = { gymName: "", timezone: "" };
const EMPTY_TRAINER_PROFILE = { trainerName: "", role: "", whatsappNumber: "" };
const EMPTY_CLASS_SETUP = { className: "", durationMinutes: 45, capacity: 12, dayOfWeek: 1, startTime: "18:00" };

export function OnboardingView() {
  const router = useRouter();
  const {
    draft,
    steps,
    stepIndex,
    totalSteps,
    error,
    isHydrated,
    isSubmitting,
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
  } = useOnboardingFlow();

  if (!isHydrated) return null;

  const isLastStep = stepIndex === totalSteps - 1;
  const step = steps[stepIndex];

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
      steps={steps}
      title={step.title}
      description={step.description}
      error={error}
      onBack={goBack}
      onNext={handleNext}
      isFirstStep={stepIndex === 0}
      isLastStep={isLastStep}
      isNextDisabled={isSubmitting}
      nextLabel={isLastStep && isSubmitting ? "Saving…" : undefined}
      preview={<OnboardingPreview draft={draft} step={step} />}
    >
      {step.key === "template-select" ? (
        <TemplateSelectStep value={getDraftTemplateVersion(draft)} onChange={updateTemplateVersion} />
      ) : null}
      {step.key === "clinic-basics" ? (
        <ClinicBasicsStep value={draft.clinicBasics ?? EMPTY_CLINIC_BASICS} onChange={updateClinicBasics} />
      ) : null}
      {step.key === "doctor-profile" ? (
        <DoctorProfileStep value={draft.doctorProfile ?? EMPTY_DOCTOR_PROFILE} onChange={updateDoctorProfile} />
      ) : null}
      {step.key === "gym-basics" ? (
        <GymBasicsStep value={draft.gymBasics ?? EMPTY_GYM_BASICS} onChange={updateGymBasics} />
      ) : null}
      {step.key === "trainer-profile" ? (
        <TrainerProfileStep value={draft.trainerProfile ?? EMPTY_TRAINER_PROFILE} onChange={updateTrainerProfile} />
      ) : null}
      {step.key === "working-hours" ? (
        <WorkingHoursStep value={draft.workingHours} onChangeDay={updateWorkingHoursDay} />
      ) : null}
      {step.key === "class-setup" ? (
        <ClassSetupStep value={draft.classSetup ?? EMPTY_CLASS_SETUP} onChange={updateClassSetup} />
      ) : null}
      {step.key === "review" ? <ReviewStep draft={draft} onEditStep={goToStep} /> : null}
    </OnboardingLayout>
  );
}
