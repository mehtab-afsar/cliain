"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTenantSettings } from "../hooks/use-tenant-settings";
import { SettingsField } from "./settings-field";
import { LanguageChipsField } from "./language-chips-field";
import { SettingsAuditTrail } from "./settings-audit-trail";
import type { GymSettingsData } from "@/features/templates/gym-v1/schema";

export function GymTab() {
  const { settings, reload } = useTenantSettings<GymSettingsData>();
  const t = useTranslations("Settings.gym");
  if (!settings) return null;

  const trainerName = settings.trainers[0]?.name?.trim().toLowerCase();
  const sameName = Boolean(trainerName) && settings.gym.name.trim().toLowerCase() === trainerName;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {sameName ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          {t("sameNameWarning")}
        </div>
      ) : null}

      <SettingsField
        field="gym.name"
        label={t("nameLabel")}
        initialValue={settings.gym.name}
        help={t("nameHelp")}
        onSaved={reload}
      />
      <SettingsField
        field="gym.displayName"
        label={t("displayNameLabel")}
        initialValue={settings.gym.displayName ?? ""}
        defaultValue=""
        help={t("displayNameHelp")}
        onSaved={reload}
      />
      <SettingsField
        field="gym.address"
        label={t("addressLabel")}
        initialValue={settings.gym.address ?? ""}
        defaultValue=""
        multiline
        help={t("addressHelp")}
        onSaved={reload}
      />
      <SettingsField
        field="gym.phoneShownToMembers"
        label={t("phoneLabel")}
        initialValue={settings.gym.phoneShownToMembers ?? ""}
        defaultValue=""
        onSaved={reload}
      />
      <LanguageChipsField
        field="gym.languages"
        label={t("languagesLabel")}
        initialValue={settings.gym.languages}
        help={t("languagesHelp")}
      />

      <SettingsAuditTrail fieldPrefix="gym." />

      {/* Trainer profile, class setup, and working hours aren't independently editable here yet
          (multi-trainer/multi-class support is a later phase) — the setup wizard is still the
          way to change them. */}
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
