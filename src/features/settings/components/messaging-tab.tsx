"use client";

import { useClinicSettings } from "../hooks/use-clinic-settings";
import { SettingsField } from "./settings-field";
import { SettingsSelectField } from "./settings-select-field";
import { SettingsToggleField } from "./settings-toggle-field";
import { SettingsAuditTrail } from "./settings-audit-trail";
import { MessagingPreview } from "./messaging-preview";
import { DEFAULT_GREETING } from "../schema";

const TONE_OPTIONS = [
  { value: "friendly", label: "Friendly" },
  { value: "neutral", label: "Neutral" },
  { value: "formal", label: "Formal" },
];

export function MessagingTab() {
  const { settings, reload } = useClinicSettings();
  if (!settings) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="flex max-w-xl flex-col gap-6">
        <SettingsField
          field="messaging.greeting"
          label="Greeting"
          multiline
          initialValue={settings.messaging.greeting ?? ""}
          defaultValue=""
          placeholder={DEFAULT_GREETING}
          help="Variables: {clinic}, {doctor}."
          onSaved={reload}
        />
        <SettingsSelectField
          field="messaging.tone"
          label="Tone"
          initialValue={settings.messaging.tone}
          options={TONE_OPTIONS}
          onSaved={reload}
        />
        <SettingsToggleField
          field="messaging.disclosureEnabled"
          label="Tell patients they're talking to an automated assistant"
          initialValue={settings.messaging.disclosureEnabled}
          help="Recommended to keep this on."
          onSaved={reload}
        />
        <SettingsAuditTrail fieldPrefix="messaging." />
      </div>

      <MessagingPreview settings={settings} />
    </div>
  );
}
