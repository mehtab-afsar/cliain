import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppointmentListItem } from "../types";

const STATUS_STYLES: Record<AppointmentListItem["status"], string> = {
  booked: "bg-accent text-accent-foreground",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-warning/10 text-warning",
};

const STATUS_LABELS: Record<AppointmentListItem["status"], string> = {
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export function StatusBadge({ status }: { status: AppointmentListItem["status"] }) {
  return (
    <Badge className={cn("border-none font-medium", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
