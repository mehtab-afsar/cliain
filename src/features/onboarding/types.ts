export type ClinicBasics = {
  clinicName: string;
  timezone: string;
};

export type DoctorProfile = {
  doctorName: string;
  specialty: string;
  whatsappNumber: string;
};

export type GymBasics = {
  gymName: string;
  timezone: string;
};

export type TrainerProfile = {
  trainerName: string;
  role: string;
  whatsappNumber: string;
};

export type ClassSetup = {
  className: string;
  durationMinutes: number;
  capacity: number;
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  startTime: string; // "18:00"
};

export type WorkingHoursDay = {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  label: string;
  isOpen: boolean;
  startTime: string; // "09:00"
  endTime: string; // "17:00"
};

/**
 * Discriminated-optional, not a fully generic `Record<string, unknown>` — pragmatic at 2
 * templates (rule of three): a fully generic redesign would force a much larger rewrite of
 * validation/preview/review for marginal benefit right now. `templateVersion` picks which of
 * `clinicBasics`/`doctorProfile` vs. `gymBasics`/`trainerProfile`/`classSetup` is populated
 * (see step-registry.ts) — `workingHours` is shared by every template, since a resource's
 * weekly hours aren't vertical-specific.
 */
export type OnboardingDraft = {
  templateVersion: string;
  clinicBasics?: ClinicBasics;
  doctorProfile?: DoctorProfile;
  gymBasics?: GymBasics;
  trainerProfile?: TrainerProfile;
  classSetup?: ClassSetup;
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
