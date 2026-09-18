"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTenantSettings } from "../hooks/use-tenant-settings";
import { SettingsField } from "./settings-field";
import { LanguageChipsField } from "./language-chips-field";
import { SettingsAuditTrail } from "./settings-audit-trail";
import type { ClinicSettingsData } from "../schema";

export function ClinicTab() {
  const { settings, reload } = useTenantSettings<ClinicSettingsData>();
  const t = useTranslations("Settings.clinic");
  if (!settings) return null;

  const doctorName = settings.doctors[0]?.name?.trim().toLowerCase();
  const sameName = Boolean(doctorName) && settings.clinic.name.trim().toLowerCase() === doctorName;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {sameName ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          {t("sameNameWarning")}
        </div>
      ) : null}

      <SettingsField
        field="clinic.name"
        label={t("nameLabel")}
        initialValue={settings.clinic.name}
        help={t("nameHelp")}
        onSaved={reload}
      />
      <SettingsField
        field="clinic.displayName"
        label={t("displayNameLabel")}
        initialValue={settings.clinic.displayName ?? ""}
        defaultValue=""
        help={t("displayNameHelp")}
        onSaved={reload}
      />
      <SettingsField
        field="clinic.address"
        label={t("addressLabel")}
        initialValue={settings.clinic.address ?? ""}
        defaultValue=""
        multiline
        help={t("addressHelp")}
        onSaved={reload}
      />
      <SettingsField
        field="clinic.phoneShownToPatients"
        label={t("phoneLabel")}
        initialValue={settings.clinic.phoneShownToPatients ?? ""}
        defaultValue=""
        onSaved={reload}
      />
      <LanguageChipsField
        field="clinic.languages"
        label={t("languagesLabel")}
        initialValue={settings.clinic.languages}
        help={t("languagesHelp")}
      />

      <SettingsAuditTrail fieldPrefix="clinic." />

      {/* Doctor profile and working hours aren't independently editable here yet (multi-doctor
          support is a later phase) — the setup wizard is still the way to change them. */}
      <p className="text-sm text-muted-foreground">
        {t("editProfilePrefix")}{" "}
        <Link href="/onboarding" className="text-primary hover:underline">
          {t("editProfileCta")}
        </Link>
        .
      </p>
    </div>
  );
}
