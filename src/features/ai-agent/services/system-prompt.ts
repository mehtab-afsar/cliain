import "server-only";
import { DateTime } from "luxon";
import { resolveTimezone } from "@/lib/timezone";
import type { ClinicSettingsData } from "@/features/settings/schema";
import { clinicDisplayName, primaryDoctorDisplay, resolveEmergencyGuidance } from "@/features/settings/prompt-render";
import type { PromptChannel, TemplateContent } from "@/features/templates/types";

export { renderGreeting as buildGreeting } from "@/features/settings/prompt-render";
export type { PromptChannel };

export function buildEmergencyGuidance(settings: ClinicSettingsData): string {
  return resolveEmergencyGuidance(settings);
}

/** Shared across every channel (WhatsApp text, voice) — same brain, same rules. All vertical
 *  content (safety rules, channel style, tone options) comes from the resolved template
 *  (src/features/templates), not hardcoded here — this function is the same for every vertical. */
export function buildSystemPrompt(
  template: TemplateContent,
  settings: ClinicSettingsData,
  timezone: string,
  patientName: string | null,
  channel: PromptChannel,
  callPurpose?: string,
): string {
  const now = DateTime.now().setZone(resolveTimezone(timezone));
  const clinicName = clinicDisplayName(settings);
  const doctorDisplay = primaryDoctorDisplay(settings);
  const specialty = settings.doctors[0]?.specialty;
  const medium = channel === "voice" ? "on a phone call" : `texting with a ${template.terms.customer} on WhatsApp`;
  const toneStyle = template.toneStyle[settings.messaging.tone] ?? Object.values(template.toneStyle)[0];

  return [
    `You are Cliain, the AI scheduling assistant for ${clinicName}, ${medium} about ${template.terms.booking}s with ${doctorDisplay}${specialty ? ` (${specialty})` : ""}.`,
    `Current date/time in the clinic's timezone (${timezone}): ${now.toFormat("cccc, LLLL d, yyyy 'at' h:mm a")}.`,
    settings.clinic.address ? `Clinic address: ${settings.clinic.address}.` : "",
    patientName
      ? `This patient is ${patientName}.`
      : "This patient is not in our records yet — ask for their name before booking, and call create_patient once they give it.",
    callPurpose ? `You placed this call to: ${callPurpose}.` : "",
    "",
    "Rules:",
    "- Always call check_availability before offering times — never invent availability.",
    "- Offer at most 3 slot options at a time, in the patient's local time.",
    "- Only call book_appointment with an exact startAt/endAt returned by check_availability.",
    "- To cancel or reschedule, first check the patient's upcomingAppointments (from get_patient) — if there's more than one, ask which appointment before calling a tool.",
    `- ${template.channelStyle[channel]}`,
    `- Tone: ${toneStyle}`,
    settings.clinic.languages.length > 0
      ? `- Reply in whichever of these languages the patient is using: ${settings.clinic.languages.join(", ")}. Default to ${settings.clinic.languages[0]} if unclear.`
      : "",
    "- Never claim an appointment is booked, cancelled, or rescheduled unless the corresponding tool call succeeded.",
    template.safetyRules.join("\n"),
    "",
    `This clinic's exact emergency guidance, to be quoted word for word per the rule above — nothing more, nothing less: "${buildEmergencyGuidance(settings)}"`,
  ]
    .filter(Boolean)
    .join("\n");
}
