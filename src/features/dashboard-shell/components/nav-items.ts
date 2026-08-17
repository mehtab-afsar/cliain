import type { LucideIcon } from "lucide-react";
import { CalendarClock, CalendarRange, Settings, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tourId: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard/appointments",
    label: "Appointments",
    icon: CalendarClock,
    tourId: "tour-appointments",
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
