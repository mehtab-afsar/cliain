"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import type { OnboardingDraft } from "../types";
import { formatTime } from "../services/format-time";
import { WEEKDAY_LABELS } from "../types";
import { getDraftTemplateVersion, getOnboardingSteps } from "../step-registry";

type ReviewStepProps = {
  draft: OnboardingDraft;
  /** Jumps back to the given step index for a correction. Omit to render read-only (e.g. Settings). */
  onEditStep?: (stepIndex: number) => void;
};

type SectionProps = {
  title: string;
  stepIndex: number;
  onEditStep?: (stepIndex: number) => void;
  children: ReactNode;
};

function Section({ title, stepIndex, onEditStep, children }: SectionProps) {
  const tCommon = useTranslations("Common");
  return (
    <section className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {children}
      </div>
      {onEditStep ? (
        <button
          type="button"
          onClick={() => onEditStep(stepIndex)}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
          {tCommon("edit")}
        </button>
      ) : null}
    </section>
  );
}

/** The one narrowly-scoped, documented place in the onboarding feature allowed to branch on
 *  templateVersion (same role as step-registry.ts's getOnboardingSteps) — which fields this
 *  review screen shows is inherently vertical-specific. */
function isGymDraft(draft: OnboardingDraft): boolean {
  // eslint-disable-next-line no-restricted-syntax -- composition-root review-section lookup, see doc comment above
  return draft.templateVersion === "gym-v1";
}

export function ReviewStep({ draft, onEditStep }: ReviewStepProps) {
  const openDays = draft.workingHours.filter((day) => day.isOpen);
  const steps = getOnboardingSteps(getDraftTemplateVersion(draft));
  const stepIndexOf = (key: string) => steps.findIndex((step) => step.key === key);
  const gym = isGymDraft(draft);
  const t = useTranslations("Onboarding.review");

  return (
    <div className="divide-y divide-border">
      {gym ? (
        <Section title={t("gym")} stepIndex={stepIndexOf("gym-basics")} onEditStep={onEditStep}>
          <p className="mt-1 font-heading text-lg text-foreground">
            {draft.gymBasics?.gymName || "—"}
          </p>
          <p className="text-sm text-muted-foreground">{draft.gymBasics?.timezone}</p>
        </Section>
      ) : (
        <Section title={t("clinic")} stepIndex={stepIndexOf("clinic-basics")} onEditStep={onEditStep}>
          <p className="mt-1 font-heading text-lg text-foreground">
            {draft.clinicBasics?.clinicName || "—"}
          </p>
          <p className="text-sm text-muted-foreground">{draft.clinicBasics?.timezone}</p>
        </Section>
      )}

      {gym ? (
        <Section title={t("trainer")} stepIndex={stepIndexOf("trainer-profile")} onEditStep={onEditStep}>
          <p className="mt-1 font-heading text-lg text-foreground">
            {draft.trainerProfile?.trainerName || "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {draft.trainerProfile?.role || t("noRoleSet")}
            {draft.trainerProfile?.whatsappNumber
              ? ` · ${draft.trainerProfile.whatsappNumber}`
              : ` · ${t("whatsappNotConnected")}`}
          </p>
        </Section>
      ) : (
        <Section title={t("doctor")} stepIndex={stepIndexOf("doctor-profile")} onEditStep={onEditStep}>
          <p className="mt-1 font-heading text-lg text-foreground">
            {draft.doctorProfile?.doctorName || "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {draft.doctorProfile?.specialty || t("noSpecialtySet")}
            {draft.doctorProfile?.whatsappNumber
              ? ` · ${draft.doctorProfile.whatsappNumber}`
              : ` · ${t("whatsappNotConnected")}`}
          </p>
        </Section>
      )}

      <Section title={t("workingHours")} stepIndex={stepIndexOf("working-hours")} onEditStep={onEditStep}>
        <ul className="mt-2 flex flex-col gap-1">
          {openDays.map((day) => (
            <li key={day.dayOfWeek} className="flex justify-between gap-6 text-sm text-foreground">
              <span>{day.label}</span>
              <span className="font-mono text-muted-foreground">
                {formatTime(day.startTime)} – {formatTime(day.endTime)}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {gym && draft.classSetup ? (
        <Section title={t("classSection")} stepIndex={stepIndexOf("class-setup")} onEditStep={onEditStep}>
          <p className="mt-1 font-heading text-lg text-foreground">{draft.classSetup.className || "—"}</p>
          <p className="text-sm text-muted-foreground">
            {WEEKDAY_LABELS[draft.classSetup.dayOfWeek]}s at {formatTime(draft.classSetup.startTime)} ·{" "}
            {draft.classSetup.durationMinutes} min · {draft.classSetup.capacity} spots
          </p>
        </Section>
      ) : null}
    </div>
  );
}
