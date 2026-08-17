export type TourStep = {
  /** Matches a `data-tour-id` in the dashboard shell. `null` = centered, no spotlight. */
  targetId: string | null;
  placement: "center" | "right" | "bottom";
  title: string;
  description: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    targetId: null,
    placement: "center",
    title: "Welcome to Cliain",
    description:
      "Here's a quick look at how patients book, and where everything shows up in your dashboard.",
  },
  {
    targetId: "tour-appointments",
    placement: "right",
    title: "Appointments",
    description:
      "Every booking your AI assistant makes over WhatsApp or a phone call lands here — and mirrors to Google Calendar automatically.",
  },
  {
    targetId: "tour-patients",
    placement: "right",
    title: "Patients",
    description:
      "Anyone who's messaged or called in shows up here, even before they've booked anything.",
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
    description: "Your clinic name, doctor profile, and working hours — edit anytime.",
  },
  {
    targetId: "tour-account",
    placement: "bottom",
    title: "Reminders run themselves",
    description:
      "A text goes out 24 hours before each visit, and a voice call 2 hours before — no action needed from you.",
  },
];
