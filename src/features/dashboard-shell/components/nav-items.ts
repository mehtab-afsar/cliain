import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CalendarClock, CalendarRange, MessageCircle, Settings, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tourId: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard/try-it",
    label: "Try it out",
    icon: MessageCircle,
    tourId: "tour-try-it",
  },
  {
    href: "/dashboard/appointments",
    label: "Appointments",
    icon: CalendarClock,
    tourId: "tour-appointments",
  },
  {
    href: "/dashboard/needs-attention",
    label: "Needs attention",
    icon: AlertTriangle,
    tourId: "tour-needs-attention",
  },
  { href: "/dashboard/patients", label: "Patients", icon: Users, tourId: "tour-patients" },
  {
    href: "/dashboard/calendar",
    label: "Calendar",
    icon: CalendarRange,
    tourId: "tour-calendar",
  },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, tourId: "tour-settings" },
];
