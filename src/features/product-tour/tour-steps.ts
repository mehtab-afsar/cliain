import type { TemplateContent } from "@/features/templates/types";

export type TourStep = {
  /** Matches a `data-tour-id` in the dashboard shell. `null` = centered, no spotlight. */
  targetId: string | null;
  placement: "center" | "right" | "bottom";
  title: string;
  description: string;
};

/** Was a static array — several steps describe vertical-specific wording ("patients" for
 *  clinic-v1, "members" for gym-v1), so this is now built from the resolved template's labels
 *  instead, the same way nav-items.ts's buildNavItems(labels) works. */
export function buildTourSteps(labels: TemplateContent["labels"]): TourStep[] {
  return [
    {
      targetId: null,
      placement: "center",
      title: "Welcome to Cliain",
      description: `Here's a quick look at how ${labels.customerPlural.toLowerCase()} book, and where everything shows up in your dashboard.`,
    },
    {
      targetId: "tour-appointments",
      placement: "right",
      title: labels.bookingPlural,
      description: `Every booking your AI assistant makes over WhatsApp or a phone call lands here — and mirrors to Google Calendar automatically.`,
    },
    {
      targetId: "tour-patients",
      placement: "right",
      title: labels.customerPlural,
      description: `Anyone who's messaged or called in shows up here, even before they've booked anything.`,
    },
    {
      targetId: "tour-calendar",
      placement: "right",
      title: "Calendar",
      description: "The same bookings, laid out day by day.",
    },
    {
      targetId: "tour-settings",
      placement: "right",
      title: "Settings",
      description: `Your ${labels.businessNoun.toLowerCase()} name, ${labels.resourceSingular.toLowerCase()} profile, and working hours — edit anytime.`,
    },
    {
      targetId: "tour-account",
      placement: "bottom",
      title: "Reminders run themselves",
      description:
        "A text goes out 24 hours before each visit, and a voice call 2 hours before — no action needed from you.",
    },
  ];
}
