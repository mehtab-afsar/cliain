import { Check } from "lucide-react";
import { ChatPreviewCard, type ChatMessage } from "./chat-preview-card";

const CONVERSATION: ChatMessage[] = [
  {
    from: "patient",
    text: "Hi, can I see Dr. Rivera tomorrow afternoon for a checkup?",
  },
  {
    from: "cliain",
    text: "Dr. Rivera has openings tomorrow at 2:30, 3:00, or 4:15 PM. Which works best?",
  },
  { from: "patient", text: "3:00 works" },
  {
    from: "cliain",
    text: "Booked — Tue, Aug 19 at 3:00 PM with Dr. Rivera. You'll get a reminder the day before.",
  },
];

export function BookingPreviewCard() {
  return (
    <ChatPreviewCard
      avatarLabel="R"
      title="Dr. Rivera — Family Practice"
      subtitle="via WhatsApp"
      badge={
        <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
          <Check className="h-3 w-3" />
          Confirmed
        </span>
      }
      messages={CONVERSATION}
    />
  );
}
