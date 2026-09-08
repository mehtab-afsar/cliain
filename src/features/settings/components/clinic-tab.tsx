"use client";

import Link from "next/link";
import { useClinicSettings } from "../hooks/use-clinic-settings";
import { SettingsField } from "./settings-field";
import { LanguageChipsField } from "./language-chips-field";
import { SettingsAuditTrail } from "./settings-audit-trail";

export function ClinicTab() {
  const { settings, reload } = useClinicSettings();
  if (!settings) return null;

  const doctorName = settings.doctors[0]?.name?.trim().toLowerCase();
  const sameName = Boolean(doctorName) && settings.clinic.name.trim().toLowerCase() === doctorName;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {sameName ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          Your clinic and your doctor have the same name. Patients will see both; is that right?
        </div>
      ) : null}

      <SettingsField
        field="clinic.name"
        label="Clinic name"
        initialValue={settings.clinic.name}
        help="Shown to patients when Cliain messages them."
        onSaved={reload}
      />
      <SettingsField
        field="clinic.displayName"
        label="Display name (optional)"
        initialValue={settings.clinic.displayName ?? ""}
        defaultValue=""
        help="If patients should see a different name than the clinic name above."
        onSaved={reload}
      />
      <SettingsField
        field="clinic.address"
        label="Address"
        initialValue={settings.clinic.address ?? ""}
        defaultValue=""
        multiline
        help="The AI uses this to answer 'where are you?'"
        onSaved={reload}
      />
      <SettingsField
        field="clinic.phoneShownToPatients"
        label="Phone number shown to patients"
        initialValue={settings.clinic.phoneShownToPatients ?? ""}
        defaultValue=""
        onSaved={reload}
      />
      <LanguageChipsField
        field="clinic.languages"
        label="Languages patients use"
        initialValue={settings.clinic.languages}
        help="Drives the language the AI replies in."
      />

      <SettingsAuditTrail fieldPrefix="clinic." />

      {/* Doctor profile and working hours aren't independently editable here yet (multi-doctor
          support is a later phase) — the setup wizard is still the way to change them. */}
      <p className="text-sm text-muted-foreground">
        Need to change your doctor&apos;s profile or working hours?{" "}
        <Link href="/onboarding" className="text-primary hover:underline">
          Go through setup again
        </Link>
        .
      </p>
    </div>
  );
}
