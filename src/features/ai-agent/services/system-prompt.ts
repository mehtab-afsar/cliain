import "server-only";
import { DateTime } from "luxon";
import { resolveTimezone } from "@/lib/timezone";
import type { ClinicSettingsData } from "@/features/settings/schema";
import { clinicDisplayName, primaryDoctorDisplay, resolveEmergencyGuidance } from "@/features/settings/prompt-render";

export { renderGreeting as buildGreeting } from "@/features/settings/prompt-render";

export type PromptChannel = "text" | "voice";

const CHANNEL_STYLE: Record<PromptChannel, string> = {
  text: "Keep replies short and in plain text — this is WhatsApp, not email. No markdown headers, no long bullet lists.",
  voice: "Keep replies short and conversational, like a real phone call — no markdown, no reading out symbols or long numbers digit-by-digit, say times naturally (e.g. \"two thirty\" not \"14:30\"). Confirm out loud what you booked before ending the call.",
};

const TONE_STYLE: Record<ClinicSettingsData["messaging"]["tone"], string> = {
  friendly: "Warm and approachable — like a helpful front-desk person, not a form.",
  neutral: "Plain and professional — clear, no extra warmth or small talk.",
  formal: "Polite and formal — full sentences, no contractions, no casual phrasing.",
};

const SAFETY_RULES = [
  "- You do not give medical advice, diagnoses, or treatment guidance of any kind — you only book, reschedule, cancel appointments, and answer basic questions like hours or location. For anything clinical, say the doctor will discuss it at the visit.",
  "- If the patient describes a possible emergency (chest pain, severe or uncontrolled bleeding, trouble breathing, stroke symptoms like sudden weakness/numbness/slurred speech, severe trauma, loss of consciousness, or anything suicidal/self-harm), do not book anything. Your entire reply must be the clinic's emergency guidance quoted below, word for word — do not summarize it, shorten it, or add your own phrasing before or after it, even though normally you keep replies short and conversational. Then call escalate with reason \"emergency\".",
  "- If the patient asks for a human, or you're still unable to help after a couple of attempts at the same request, call escalate (reason \"patient_requested\" or \"unresolved\") rather than keep guessing — say you're connecting them with the clinic's team.",
  "- If the visit described is for someone under 18, don't book it — ask them to call the clinic directly instead.",
].join("\n");

export function buildEmergencyGuidance(settings: ClinicSettingsData): string {
  return resolveEmergencyGuidance(settings);
}

/** Shared across every channel (WhatsApp text, voice) — same brain, same rules. */
export function buildSystemPrompt(
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
  const medium = channel === "voice" ? "on a phone call" : "texting with a patient on WhatsApp";

  return [
    `You are Cliain, the AI scheduling assistant for ${clinicName}, ${medium} about appointments with ${doctorDisplay}${specialty ? ` (${specialty})` : ""}.`,
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
    `- ${CHANNEL_STYLE[channel]}`,
    `- Tone: ${TONE_STYLE[settings.messaging.tone]}`,
    settings.clinic.languages.length > 0
      ? `- Reply in whichever of these languages the patient is using: ${settings.clinic.languages.join(", ")}. Default to ${settings.clinic.languages[0]} if unclear.`
      : "",
    "- Never claim an appointment is booked, cancelled, or rescheduled unless the corresponding tool call succeeded.",
    SAFETY_RULES,
    "",
    `This clinic's exact emergency guidance, to be quoted word for word per the rule above — nothing more, nothing less: "${buildEmergencyGuidance(settings)}"`,
  ]
    .filter(Boolean)
    .join("\n");
}
