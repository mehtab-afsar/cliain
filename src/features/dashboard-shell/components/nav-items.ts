import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CalendarClock, CalendarRange, MessageCircle, Settings, Users } from "lucide-react";
import type { TemplateContent } from "@/features/templates/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tourId: string;
};

/** Was a static array — "Patients" is the one nav label that's actually vertical wording
 *  ("Members" for gym-v1), so this is now built from the resolved template's labels instead. */
export function buildNavItems(labels: TemplateContent["labels"]): NavItem[] {
  return [
    {
      href: "/dashboard/try-it",
      label: "Try it out",
      icon: MessageCircle,
      tourId: "tour-try-it",
    },
    {
      href: "/dashboard/appointments",
      label: labels.bookingPlural,
      icon: CalendarClock,
      tourId: "tour-appointments",
    },
    {
      href: "/dashboard/needs-attention",
      label: "Needs attention",
      icon: AlertTriangle,
      tourId: "tour-needs-attention",
    },
    { href: "/dashboard/patients", label: labels.customerPlural, icon: Users, tourId: "tour-patients" },
    {
      href: "/dashboard/calendar",
      label: "Calendar",
      icon: CalendarRange,
      tourId: "tour-calendar",
    },
    { href: "/dashboard/settings", label: "Settings", icon: Settings, tourId: "tour-settings" },
  ];
}
