import { DEFAULT_GREETING, type ClinicSettingsData } from "./schema";

/** Pure string rendering, no I/O — deliberately not "server-only" so the Messaging tab's live
 * preview (a client component) can render exactly what the AI would send, not an approximation. */

export const DEFAULT_EMERGENCY_SCRIPT =
  "If this is a medical emergency, please hang up and call your local emergency number right away, or go to the nearest emergency room — please don't wait for a callback.";

export function clinicDisplayName(settings: ClinicSettingsData): string {
  return settings.clinic.displayName?.trim() || settings.clinic.name;
}

export function primaryDoctorDisplay(settings: ClinicSettingsData): string {
  const doctor = settings.doctors[0];
  if (!doctor) return "";
  const title = doctor.title !== "none" ? `${doctor.title} ` : "";
  return `${title}${doctor.name}`;
}

export function resolveEmergencyGuidance(settings: ClinicSettingsData): string {
  return settings.safety.emergencyScript?.trim() || DEFAULT_EMERGENCY_SCRIPT;
}

/** First-turn message sent verbatim by agent-loop.ts — not left to the model to generate. */
export function renderGreeting(settings: ClinicSettingsData): string {
  const template = settings.messaging.greeting?.trim() || DEFAULT_GREETING;
  const rendered = template
    .replaceAll("{clinic}", clinicDisplayName(settings))
    .replaceAll("{doctor}", primaryDoctorDisplay(settings));
  return settings.messaging.disclosureEnabled
    ? `${rendered} I'm an automated assistant — reply STOP anytime to opt out.`
    : rendered;
}
