import type { CommonSettingsData } from "./common-settings";

/** Pure string rendering, no I/O — deliberately not "server-only" so the Messaging tab's live
 * preview (a client component) can render exactly what the AI would send, not an approximation.
 * Generic across every template (CommonSettingsData only) — moved here from
 * src/features/settings, which was the wrong dependency direction once a second template
 * existed (features/templates depending on a clinic-flavored directory name). */

export const DEFAULT_EMERGENCY_SCRIPT =
  "If this is an emergency, please hang up and call your local emergency number right away, or go to the nearest emergency room — please don't wait for a callback.";

export function businessDisplayName(settings: CommonSettingsData): string {
  return settings.business.displayName?.trim() || settings.business.name;
}

export function primaryResourceDisplay(settings: CommonSettingsData): string {
  const { primaryResource } = settings;
  if (!primaryResource) return "";
  const title = primaryResource.title ? `${primaryResource.title} ` : "";
  return `${title}${primaryResource.name}`;
}

export function resolveEmergencyGuidance(settings: CommonSettingsData): string {
  return settings.safety.escalationScript?.trim() || DEFAULT_EMERGENCY_SCRIPT;
}

/** First-turn message sent verbatim by agent-loop.ts — not left to the model to generate.
 *  `defaultGreeting` is the tenant's template's own fallback text (see
 *  TemplateContent.defaultGreeting), used only when the tenant hasn't customized
 *  messaging.greeting themselves. */
export function renderGreeting(settings: CommonSettingsData, defaultGreeting: string): string {
  const template = settings.messaging.greeting?.trim() || defaultGreeting;
  const rendered = template
    .replaceAll("{business}", businessDisplayName(settings))
    .replaceAll("{resource}", primaryResourceDisplay(settings));
  return settings.messaging.disclosureEnabled
    ? `${rendered} I'm an automated assistant — reply STOP anytime to opt out.`
    : rendered;
}
