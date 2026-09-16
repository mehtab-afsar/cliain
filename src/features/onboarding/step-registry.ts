import type { LucideIcon } from "lucide-react";
import { Building2, ClipboardCheck, Clock, Dumbbell, Layers, UserRound } from "lucide-react";
import type { OnboardingDraft } from "./types";

export type OnboardingStepKey =
  | "template-select"
  | "clinic-basics"
  | "doctor-profile"
  | "gym-basics"
  | "trainer-profile"
  | "working-hours"
  | "class-setup"
  | "review";

export type OnboardingStepConfig = {
  key: OnboardingStepKey;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

const TEMPLATE_SELECT_STEP: OnboardingStepConfig = {
  key: "template-select",
  label: "Business",
  icon: Layers,
  title: "What kind of business is this?",
  description: "This picks how Cliain talks, what it books, and what you'll set up next.",
};

const CLINIC_V1_STEPS: OnboardingStepConfig[] = [
  {
    key: "clinic-basics",
    label: "Clinic",
    icon: Building2,
    title: "Tell us about your clinic",
    description: "This is what patients will see when Cliain messages them.",
  },
  {
    key: "doctor-profile",
    label: "Doctor",
    icon: UserRound,
    title: "Who's this scheduler for?",
    description: "Add the doctor patients will be booking with.",
  },
  {
    key: "working-hours",
    label: "Hours",
    icon: Clock,
    title: "Set your working hours",
    description: "Cliain only offers slots inside these hours.",
  },
];

const GYM_V1_STEPS: OnboardingStepConfig[] = [
  {
    key: "gym-basics",
    label: "Gym",
    icon: Building2,
    title: "Tell us about your gym",
    description: "This is what members will see when Cliain messages them.",
  },
  {
    key: "trainer-profile",
    label: "Trainer",
    icon: UserRound,
    title: "Who's leading this class?",
    description: "Add the trainer members will be booking with.",
  },
  {
    key: "working-hours",
    label: "Hours",
    icon: Clock,
    title: "Set your general hours",
    description: "When your gym is generally open — the class itself gets its own time next.",
  },
  {
    key: "class-setup",
    label: "Class",
    icon: Dumbbell,
    title: "Set up your first class",
    description: "Cliain books members into this recurring class until it's full.",
  },
];

const REVIEW_STEP: OnboardingStepConfig = {
  key: "review",
  label: "Review",
  icon: ClipboardCheck,
  title: "Review and finish",
  description: "Double-check everything, then Cliain is ready to start answering for you.",
};

/**
 * The one place onboarding decides which steps a template gets — a composition-root lookup,
 * the same role templates/registry.ts's resolveTemplate() plays for prompt/booking config, just
 * for UI step wiring instead (which belongs here, not in the templates package, to avoid that
 * package depending on onboarding's React components). Takes a plain string (not a `.templateVersion`
 * member access), so the no-branching rule doesn't fire here — callers get that string from
 * getDraftTemplateVersion() below.
 */
export function getOnboardingSteps(templateVersion: string): OnboardingStepConfig[] {
  const perTemplateSteps = templateVersion === "gym-v1" ? GYM_V1_STEPS : CLINIC_V1_STEPS;
  return [TEMPLATE_SELECT_STEP, ...perTemplateSteps, REVIEW_STEP];
}

/**
 * Composition-root read of the draft's chosen template — same sanctioned role as the
 * isGymDraft() helpers in onboarding-preview.tsx/review-step.tsx, but returning the raw
 * string (for getOnboardingSteps() and the template-select step's controlled value) instead
 * of a boolean. The one place onboarding code is allowed to read this field directly — see
 * eslint.config.mjs's no-branching rule.
 */
export function getDraftTemplateVersion(draft: OnboardingDraft): string {
  // eslint-disable-next-line no-restricted-syntax -- composition-root draft-template lookup, see doc comment above
  return draft.templateVersion;
}
