import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/features/landing/components/logo-mark";
import { OnboardingStepper, type OnboardingStepMeta } from "./onboarding-stepper";

type OnboardingLayoutProps = {
  stepIndex: number;
  steps: OnboardingStepMeta[];
  title: string;
  description: string;
  error: string | null;
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isNextDisabled?: boolean;
  nextLabel?: string;
  children: ReactNode;
  preview: ReactNode;
};

export function OnboardingLayout({
  stepIndex,
  steps,
  title,
  description,
  error,
  onBack,
  onNext,
  isFirstStep,
  isLastStep,
  isNextDisabled,
  nextLabel,
  children,
  preview,
}: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          <LogoMark />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-x-12 px-6 py-12 lg:grid-cols-[1fr_20rem]">
        <div className="flex w-full max-w-2xl flex-col">
          <OnboardingStepper steps={steps} currentIndex={stepIndex} />

          <div className="mt-10">
            <h1 className="font-heading text-2xl text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-muted-foreground">{description}</p>
          </div>

          <div className="mt-8 flex-1">{children}</div>

          {error ? (
            <p className="mt-6 text-sm text-destructive">{error}</p>
          ) : null}

          <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
            <Button
              variant="ghost"
              onClick={onBack}
              className={isFirstStep ? "invisible" : undefined}
            >
              Back
            </Button>
            <Button onClick={onNext} disabled={isNextDisabled}>
              {nextLabel ?? (isLastStep ? "Finish setup" : "Continue")}
            </Button>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24 flex justify-center pt-24">{preview}</div>
        </div>
      </div>
    </div>
  );
}
