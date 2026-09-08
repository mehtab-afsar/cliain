"use client";

import { useClinicSettings } from "../hooks/use-clinic-settings";
import { SettingsField } from "./settings-field";
import { SettingsAuditTrail } from "./settings-audit-trail";
import { DEFAULT_EMERGENCY_SCRIPT } from "../prompt-render";

export function SafetyTab() {
  const { settings, reload } = useClinicSettings();
  if (!settings) return null;

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
        field="safety.emergencyScript"
        label="Emergency guidance"
        multiline
        initialValue={settings.safety.emergencyScript ?? ""}
        defaultValue=""
        placeholder={DEFAULT_EMERGENCY_SCRIPT}
        help="Sent word-for-word on a possible emergency — not paraphrased by the AI."
        onSaved={reload}
      />

      <SettingsAuditTrail fieldPrefix="safety." />
    </div>
  );
}
