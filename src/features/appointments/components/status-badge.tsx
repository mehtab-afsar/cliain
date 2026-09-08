import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "../types";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  booked: "bg-accent text-accent-foreground",
  arrived: "bg-accent text-accent-foreground",
  in_progress: "bg-accent text-accent-foreground",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-warning/10 text-warning",
  rescheduled: "bg-secondary text-secondary-foreground",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: "Booked",
  arrived: "Arrived",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  rescheduled: "Rescheduled",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge className={cn("border-none font-medium", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
