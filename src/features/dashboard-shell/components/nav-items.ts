import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Users,
} from "lucide-react";
import type { TemplateContent } from "@/features/templates/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tourId: string;
};

/** The static nav copy ("Overview", "Try it out", ...) is looked up via `navT` — a
 *  `useTranslations("DashboardShell.nav")` translator passed in by the caller — while
 *  `labels.bookingPlural`/`labels.customerPlural` (the one nav label that's actually vertical
 *  wording, "Patients" vs "Members") stay exactly as resolveTenantConfig() produced them. Locale
 *  (this file) and template.labels (vertical terminology) are separate axes on purpose — see
 *  src/i18n/request.ts's doc comment. */
export function buildNavItems(labels: TemplateContent["labels"], navT: (key: string) => string): NavItem[] {
  return [
    {
      href: "/dashboard",
      label: navT("overview"),
      icon: LayoutDashboard,
      tourId: "tour-overview",
    },
    {
      href: "/dashboard/try-it",
      label: navT("tryItOut"),
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
      label: navT("needsAttention"),
      icon: AlertTriangle,
      tourId: "tour-needs-attention",
    },
    { href: "/dashboard/patients", label: labels.customerPlural, icon: Users, tourId: "tour-patients" },
    {
      href: "/dashboard/calendar",
      label: navT("calendar"),
      icon: CalendarRange,
      tourId: "tour-calendar",
    },
    { href: "/dashboard/settings", label: navT("settings"), icon: Settings, tourId: "tour-settings" },
  ];
}
