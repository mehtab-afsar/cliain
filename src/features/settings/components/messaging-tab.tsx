"use client";

import { useTenantSettings } from "../hooks/use-tenant-settings";
import { SettingsField } from "./settings-field";
import { SettingsSelectField } from "./settings-select-field";
import { SettingsToggleField } from "./settings-toggle-field";
import { SettingsAuditTrail } from "./settings-audit-trail";
import { MessagingPreview } from "./messaging-preview";
import { resolveTemplateByVersion } from "@/features/templates/registry";

/** `messaging.*` itself is identical in shape across every template's overridesSchema — only
 *  the valid `tone` values (from `template.toneStyle`'s keys) and the greeting default differ,
 *  both read off `template` below. */
type SharedMessagingSettings = {
  messaging: { greeting?: string; tone: string; disclosureEnabled: boolean };
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function MessagingTab({ templateVersion }: { templateVersion: string }) {
  const template = resolveTemplateByVersion(templateVersion);
  const { settings, reload } = useTenantSettings<SharedMessagingSettings>();
  if (!settings) return null;

  const toneOptions = Object.keys(template.toneStyle).map((value) => ({ value, label: capitalize(value) }));
  const { customerSingular } = template.labels;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="flex max-w-xl flex-col gap-6">
        <SettingsField
          field="messaging.greeting"
          label="Greeting"
          multiline
          initialValue={settings.messaging.greeting ?? ""}
          defaultValue=""
          placeholder={template.defaultGreeting}
          help="Variables: {business}, {resource}."
          onSaved={reload}
        />
        <SettingsSelectField
          field="messaging.tone"
          label="Tone"
          initialValue={settings.messaging.tone}
          options={toneOptions}
          onSaved={reload}
        />
        <SettingsToggleField
          field="messaging.disclosureEnabled"
          label={`Tell ${customerSingular.toLowerCase()}s they're talking to an automated assistant`}
          initialValue={settings.messaging.disclosureEnabled}
          help="Recommended to keep this on."
          onSaved={reload}
        />
        <SettingsAuditTrail fieldPrefix="messaging." />
      </div>

      <MessagingPreview template={template} settings={settings} />
    </div>
  );
}
