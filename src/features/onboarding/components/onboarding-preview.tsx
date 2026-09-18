"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ChatPreviewCard,
  type ChatMessage,
} from "@/features/landing/components/chat-preview-card";
import type { OnboardingDraft } from "../types";
import type { OnboardingStepConfig } from "../step-registry";
import { formatTime } from "../services/format-time";

type OnboardingPreviewProps = {
  draft: OnboardingDraft;
  step: OnboardingStepConfig;
};

function stripTitle(name: string): string {
  return name.replace(/^dr\.?\s*/i, "").trim();
}

function buildClinicConversation(draft: OnboardingDraft, stepKey: OnboardingStepConfig["key"]): ChatMessage[] {
  const clinicName = draft.clinicBasics?.clinicName.trim() || "Your Clinic";
  const doctorName = stripTitle(draft.doctorProfile?.doctorName ?? "") || "your doctor";
  const specialty = draft.doctorProfile?.specialty.trim();
  const openDays = draft.workingHours.filter((day) => day.isOpen);

  if (stepKey === "clinic-basics" || stepKey === "template-select") {
    return [
      { from: "patient", text: `Hi, is this ${clinicName}?` },
      { from: "cliain", text: `Yes — welcome to ${clinicName} 👋 How can I help?` },
    ];
  }
  if (stepKey === "doctor-profile") {
    return [
      { from: "patient", text: `Can I book with Dr. ${doctorName}?` },
      {
        from: "cliain",
        text: specialty
          ? `Of course — Dr. ${doctorName} handles ${specialty}. When works for you?`
          : `Of course — when works for you?`,
      },
    ];
  }
  if (stepKey === "working-hours") {
    const summary =
      openDays.length > 0
        ? `${openDays.map((day) => day.label.slice(0, 3)).join(", ")} · ${formatTime(openDays[0].startTime)}–${formatTime(openDays[0].endTime)}`
        : "we're not open yet — pick some days";
    return [
      { from: "patient", text: "When are you open?" },
      { from: "cliain", text: `We're open ${summary}.` },
    ];
  }
  return [
    { from: "patient", text: `Can I see Dr. ${doctorName} this week?` },
    {
      from: "cliain",
      text: `Booked with Dr. ${doctorName} at ${clinicName}. You'll get a reminder before your visit.`,
    },
  ];
}

function buildGymConversation(draft: OnboardingDraft, stepKey: OnboardingStepConfig["key"]): ChatMessage[] {
  const gymName = draft.gymBasics?.gymName.trim() || "Your Gym";
  const trainerName = draft.trainerProfile?.trainerName.trim() || "your trainer";
  const className = draft.classSetup?.className.trim() || "the class";
  const openDays = draft.workingHours.filter((day) => day.isOpen);

  if (stepKey === "gym-basics") {
    return [
      { from: "patient", text: `Hi, is this ${gymName}?` },
      { from: "cliain", text: `Yes — welcome to ${gymName} 💪 How can I help?` },
    ];
  }
  if (stepKey === "trainer-profile") {
    return [
      { from: "patient", text: `Who's leading classes this week?` },
      { from: "cliain", text: `${trainerName} is on the schedule — want me to check what's open?` },
    ];
  }
  if (stepKey === "working-hours") {
    const summary =
      openDays.length > 0
        ? `${openDays.map((day) => day.label.slice(0, 3)).join(", ")} · ${formatTime(openDays[0].startTime)}–${formatTime(openDays[0].endTime)}`
        : "we're not open yet — pick some days";
    return [
      { from: "patient", text: "When are you open?" },
      { from: "cliain", text: `We're open ${summary}.` },
    ];
  }
  if (stepKey === "class-setup") {
    const day = draft.classSetup ? draft.workingHours[draft.classSetup.dayOfWeek]?.label : undefined;
    const time = draft.classSetup ? formatTime(draft.classSetup.startTime) : undefined;
    return [
      { from: "patient", text: `Any spots left in ${className}?` },
      {
        from: "cliain",
        text: day && time ? `Yes! ${className} runs ${day}s at ${time} — want me to book you in?` : `Yes! Want me to book you in?`,
      },
    ];
  }
  return [
    { from: "patient", text: `Can I join ${className} this week?` },
    {
      from: "cliain",
      text: `Booked into ${className} at ${gymName} with ${trainerName}. See you there!`,
    },
  ];
}

/**
 * The one narrowly-scoped, documented place in the onboarding feature allowed to branch on
 * templateVersion (same role as step-registry.ts's getOnboardingSteps) — which conversation
 * script and business name to preview is inherently vertical-specific wording, not worth
 * pushing into the templates package just for this cosmetic preview.
 */
function isGymDraft(draft: OnboardingDraft): boolean {
  // eslint-disable-next-line no-restricted-syntax -- composition-root preview-copy lookup, see doc comment above
  return draft.templateVersion === "gym-v1";
}

function buildConversation(draft: OnboardingDraft, stepKey: OnboardingStepConfig["key"]): ChatMessage[] {
  return isGymDraft(draft) ? buildGymConversation(draft, stepKey) : buildClinicConversation(draft, stepKey);
}

export function OnboardingPreview({ draft, step }: OnboardingPreviewProps) {
  // The simulated chat script itself (buildConversation above) stays in English for this pass —
  // it's a preview of what an English-speaking customer sees, not dashboard chrome; only the
  // surrounding card chrome (subtitle, badge, caption) is locale-aware.
  const t = useTranslations("Onboarding.preview");
  const businessName =
    (isGymDraft(draft) ? draft.gymBasics?.gymName : draft.clinicBasics?.clinicName)?.trim() || "Your Business";
  const messages = buildConversation(draft, step.key);

  return (
    <div className="flex flex-col items-center gap-3">
      <ChatPreviewCard
        avatarLabel={businessName.trim().charAt(0).toUpperCase() || "C"}
        title={businessName}
        subtitle={t("viaWhatsapp")}
        badge={
          step.key === "review" ? (
            <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
              <Check className="h-3 w-3" />
              {t("confirmed")}
            </span>
          ) : undefined
        }
        messages={messages}
      />
      <p className="max-w-sm text-center text-xs text-muted-foreground">{t("caption")}</p>
    </div>
  );
}
