"use client";

import Link from "next/link";
import { useTenantSettings } from "../hooks/use-tenant-settings";
import { SettingsField } from "./settings-field";
import { LanguageChipsField } from "./language-chips-field";
import { SettingsAuditTrail } from "./settings-audit-trail";
import type { GymSettingsData } from "@/features/templates/gym-v1/schema";

export function GymTab() {
  const { settings, reload } = useTenantSettings<GymSettingsData>();
  if (!settings) return null;

  const trainerName = settings.trainers[0]?.name?.trim().toLowerCase();
  const sameName = Boolean(trainerName) && settings.gym.name.trim().toLowerCase() === trainerName;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {sameName ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          Your gym and your trainer have the same name. Members will see both; is that right?
        </div>
      ) : null}

      <SettingsField
        field="gym.name"
        label="Gym name"
        initialValue={settings.gym.name}
        help="Shown to members when Cliain messages them."
        onSaved={reload}
      />
      <SettingsField
        field="gym.displayName"
        label="Display name (optional)"
        initialValue={settings.gym.displayName ?? ""}
        defaultValue=""
        help="If members should see a different name than the gym name above."
        onSaved={reload}
      />
      <SettingsField
        field="gym.address"
        label="Address"
        initialValue={settings.gym.address ?? ""}
        defaultValue=""
        multiline
        help="The AI uses this to answer 'where are you?'"
        onSaved={reload}
      />
      <SettingsField
        field="gym.phoneShownToMembers"
        label="Phone number shown to members"
        initialValue={settings.gym.phoneShownToMembers ?? ""}
        defaultValue=""
        onSaved={reload}
      />
      <LanguageChipsField
        field="gym.languages"
        label="Languages members use"
        initialValue={settings.gym.languages}
        help="Drives the language the AI replies in."
      />

      <SettingsAuditTrail fieldPrefix="gym." />

      {/* Trainer profile, class setup, and working hours aren't independently editable here yet
          (multi-trainer/multi-class support is a later phase) — the setup wizard is still the
          way to change them. */}
      <p className="text-sm text-muted-foreground">
        Need to change your trainer&apos;s profile, class, or working hours?{" "}
        <Link href="/onboarding" className="text-primary hover:underline">
          Go through setup again
        </Link>
        .
      </p>
    </div>
  );
}
