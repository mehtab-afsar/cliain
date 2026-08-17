import { CalendarRange } from "lucide-react";
import { EmptyState } from "@/features/dashboard-shell/components/empty-state";

export function CalendarView() {
  return (
    <EmptyState
      icon={CalendarRange}
      title="Your calendar will appear here"
      description="Once appointments start coming in, they'll sync here and to your connected Google Calendar."
    />
  );
}
