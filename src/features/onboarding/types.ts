export type ClinicBasics = {
  clinicName: string;
  timezone: string;
};

export type DoctorProfile = {
  doctorName: string;
  specialty: string;
  whatsappNumber: string;
};

export type WorkingHoursDay = {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  label: string;
  isOpen: boolean;
  startTime: string; // "09:00"
  endTime: string; // "17:00"
};

export type OnboardingDraft = {
  clinicBasics: ClinicBasics;
  doctorProfile: DoctorProfile;
  workingHours: WorkingHoursDay[];
  completedAt: string | null;
};

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const ONBOARDING_STEPS = [
  "clinic-basics",
  "doctor-profile",
  "working-hours",
  "review",
  "security",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
