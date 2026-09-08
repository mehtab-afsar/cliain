import { ChatPreviewCard } from "@/features/landing/components/chat-preview-card";
import { clinicDisplayName, renderGreeting } from "../prompt-render";
import type { ClinicSettingsData } from "../schema";

/** Renders from the current (last-saved) settings document — the same underlying card used in
 * onboarding, reused here per spec, always with the sample patient "Anita". */
export function MessagingPreview({ settings }: { settings: ClinicSettingsData }) {
  const clinicName = clinicDisplayName(settings);

  return (
    <div className="flex flex-col items-center gap-3">
      <ChatPreviewCard
        avatarLabel={clinicName.trim().charAt(0).toUpperCase() || "C"}
        title={clinicName}
        subtitle="via WhatsApp"
        messages={[
          { from: "patient", text: `Hi, is this ${clinicName}?` },
          { from: "cliain", text: renderGreeting(settings) },
        ]}
      />
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        A live preview of what Anita, a sample patient, would see first.
      </p>
    </div>
  );
}
