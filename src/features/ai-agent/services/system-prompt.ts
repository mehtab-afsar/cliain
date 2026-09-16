import "server-only";
import { DateTime } from "luxon";
import { resolveTimezone } from "@/lib/timezone";
import type { CommonSettingsData } from "@/features/templates/common-settings";
import { businessDisplayName, primaryResourceDisplay, resolveEmergencyGuidance } from "@/features/templates/prompt-render";
import type { PromptChannel, TemplateContent } from "@/features/templates/types";

export { renderGreeting as buildGreeting } from "@/features/templates/prompt-render";
export type { PromptChannel };

export function buildEmergencyGuidance(settings: CommonSettingsData): string {
  return resolveEmergencyGuidance(settings);
}

function withIndefiniteArticle(noun: string): string {
  return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`;
}

/** Shared across every channel (WhatsApp text, voice) — same brain, same rules. All vertical
 *  content (safety rules, channel style, tone options, terminology) comes from the resolved
 *  template (src/features/templates), not hardcoded here — this function is the same for
 *  every vertical. */
export function buildSystemPrompt(
  template: TemplateContent,
  settings: CommonSettingsData,
  timezone: string,
  patientName: string | null,
  channel: PromptChannel,
  callPurpose?: string,
): string {
  const now = DateTime.now().setZone(resolveTimezone(timezone));
  const businessName = businessDisplayName(settings);
  const resourceDisplay = primaryResourceDisplay(settings);
  const subtitle = settings.primaryResource.subtitle;
  const { customer, booking } = template.terms;
  const medium = channel === "voice" ? "on a phone call" : `texting with a ${customer} on WhatsApp`;
  const toneStyle = template.toneStyle[settings.messaging.tone] ?? Object.values(template.toneStyle)[0];

  return [
    `You are Cliain, the AI scheduling assistant for ${businessName}, ${medium} about ${booking}s with ${resourceDisplay}${subtitle ? ` (${subtitle})` : ""}.`,
    `Current date/time (${timezone}): ${now.toFormat("cccc, LLLL d, yyyy 'at' h:mm a")}.`,
    settings.business.address ? `Address: ${settings.business.address}.` : "",
    patientName
      ? `This ${customer} is ${patientName}.`
      : `This ${customer} is not in our records yet — ask for their name before booking, and call create_patient once they give it.`,
    callPurpose ? `You placed this call to: ${callPurpose}.` : "",
    "",
    "Rules:",
    "- Always call check_availability before offering times — never invent availability.",
    `- Offer at most 3 slot options at a time, in the ${customer}'s local time.`,
    "- Only call book_appointment with an exact startAt/endAt returned by check_availability.",
    `- To cancel or reschedule, first check the ${customer}'s upcomingAppointments (from get_patient) — if there's more than one, ask which ${booking} before calling a tool.`,
    `- ${template.channelStyle[channel]}`,
    `- Tone: ${toneStyle}`,
    settings.business.languages.length > 0
      ? `- Reply in whichever of these languages the ${customer} is using: ${settings.business.languages.join(", ")}. Default to ${settings.business.languages[0]} if unclear.`
      : "",
    `- Never claim ${withIndefiniteArticle(booking)} is booked, cancelled, or rescheduled unless the corresponding tool call succeeded.`,
    template.safetyRules.join("\n"),
    "",
    `The exact emergency guidance, to be quoted word for word per the rule above — nothing more, nothing less: "${buildEmergencyGuidance(settings)}"`,
  ]
    .filter(Boolean)
    .join("\n");
}
