import { Check } from "lucide-react";
import {
  ChatPreviewCard,
  type ChatMessage,
} from "@/features/landing/components/chat-preview-card";
import type { OnboardingDraft } from "../types";
import { formatTime } from "../services/format-time";

type OnboardingPreviewProps = {
  draft: OnboardingDraft;
  stepIndex: number;
};

function stripTitle(doctorName: string): string {
  return doctorName.replace(/^dr\.?\s*/i, "").trim();
}

function buildConversation(draft: OnboardingDraft, stepIndex: number): ChatMessage[] {
  const clinicName = draft.clinicBasics.clinicName.trim() || "Your Clinic";
  const doctorName = stripTitle(draft.doctorProfile.doctorName) || "your doctor";
  const specialty = draft.doctorProfile.specialty.trim();
  const openDays = draft.workingHours.filter((day) => day.isOpen);

  if (stepIndex === 0) {
    return [
      { from: "patient", text: `Hi, is this ${clinicName}?` },
      { from: "cliain", text: `Yes — welcome to ${clinicName} 👋 How can I help?` },
    ];
  }

  if (stepIndex === 1) {
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

  if (stepIndex === 2) {
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

export function OnboardingPreview({ draft, stepIndex }: OnboardingPreviewProps) {
  const clinicName = draft.clinicBasics.clinicName.trim() || "Your Clinic";
  const messages = buildConversation(draft, stepIndex);

  return (
    <div className="flex flex-col items-center gap-3">
      <ChatPreviewCard
        avatarLabel={clinicName.trim().charAt(0).toUpperCase() || "C"}
        title={clinicName}
        subtitle="via WhatsApp"
        badge={
          stepIndex >= 3 ? (
            <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
              <Check className="h-3 w-3" />
              Confirmed
            </span>
          ) : undefined
        }
        messages={messages}
      />
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        A live preview of what your patients will see
      </p>
    </div>
  );
}
