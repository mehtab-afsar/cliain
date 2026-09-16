"use client";

import { useTenantSettings } from "../hooks/use-tenant-settings";
import { SettingsField } from "./settings-field";
import { SettingsAuditTrail } from "./settings-audit-trail";
import { DEFAULT_EMERGENCY_SCRIPT } from "@/features/templates/prompt-render";
import { resolveTemplateByVersion } from "@/features/templates/registry";

/** `safety.escalationWhatsappNumber` is identical across every template's overridesSchema —
 *  only the verbatim script's own key name differs (clinic-v1: "emergencyScript", gym-v1:
 *  "escalationScript"), named by `template.safetyScriptField` and read/written dynamically below. */
type SharedSafetySettings = {
  safety: Record<string, unknown> & { escalationWhatsappNumber?: string };
};

export function SafetyTab({ templateVersion }: { templateVersion: string }) {
  const template = resolveTemplateByVersion(templateVersion);
  const { settings, reload } = useTenantSettings<SharedSafetySettings>();
  if (!settings) return null;

  const scriptField = template.safetyScriptField;
  const scriptValue = (settings.safety[scriptField] as string | undefined) ?? "";

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Who the AI hands a conversation off to, and what it says on a possible emergency.
      </p>

      <SettingsField
        field="safety.escalationWhatsappNumber"
        label="Escalation WhatsApp number"
        initialValue={settings.safety.escalationWhatsappNumber ?? ""}
        defaultValue=""
        placeholder="Staff number to alert on a handoff"
        help="They'll get a message for emergencies and anything the AI can't handle."
        onSaved={reload}
      />
      <SettingsField
        field={`safety.${scriptField}`}
        label="Emergency guidance"
        multiline
        initialValue={scriptValue}
        defaultValue=""
        placeholder={DEFAULT_EMERGENCY_SCRIPT}
        help="Sent word-for-word on a possible emergency — not paraphrased by the AI."
        onSaved={reload}
      />

      <SettingsAuditTrail fieldPrefix="safety." />
    </div>
  );
}
