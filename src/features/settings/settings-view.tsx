"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReviewStep } from "@/features/onboarding/components/review-step";
import { useClinicDraft } from "./hooks/use-clinic-draft";
import { IntegrationsSection } from "./components/integrations-section";
import { TeamSection } from "./components/team-section";

export function SettingsView() {
  const draft = useClinicDraft();

  if (!draft) return null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl text-foreground">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your clinic setup from onboarding.
            </p>
          </div>
          <Button
            variant="outline"
            render={<Link href="/onboarding" />}
            nativeButton={false}
          >
            Edit setup
          </Button>
        </div>

        <ReviewStep draft={draft} />
      </div>

      <IntegrationsSection />

      <TeamSection />
    </div>
  );
}
