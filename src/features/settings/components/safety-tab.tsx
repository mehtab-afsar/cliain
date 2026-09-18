"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("Settings.safety");
  if (!settings) return null;

  const scriptField = template.safetyScriptField;
  const scriptValue = (settings.safety[scriptField] as string | undefined) ?? "";

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">{t("intro")}</p>

      <SettingsField
        field="safety.escalationWhatsappNumber"
        label={t("escalationLabel")}
        initialValue={settings.safety.escalationWhatsappNumber ?? ""}
        defaultValue=""
        placeholder={t("escalationPlaceholder")}
        help={t("escalationHelp")}
        onSaved={reload}
      />
      <SettingsField
        field={`safety.${scriptField}`}
        label={t("scriptLabel")}
        multiline
        initialValue={scriptValue}
        defaultValue=""
        placeholder={DEFAULT_EMERGENCY_SCRIPT}
        help={t("scriptHelp")}
        onSaved={reload}
      />

      <SettingsAuditTrail fieldPrefix="safety." />
    </div>
  );
}
