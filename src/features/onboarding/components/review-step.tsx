import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import type { OnboardingDraft } from "../types";
import { formatTime } from "../services/format-time";

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
          Edit
        </button>
      ) : null}
    </section>
  );
}

export function ReviewStep({ draft, onEditStep }: ReviewStepProps) {
  const openDays = draft.workingHours.filter((day) => day.isOpen);

  return (
    <div className="divide-y divide-border">
      <Section title="Clinic" stepIndex={0} onEditStep={onEditStep}>
        <p className="mt-1 font-heading text-lg text-foreground">
          {draft.clinicBasics.clinicName || "—"}
        </p>
        <p className="text-sm text-muted-foreground">{draft.clinicBasics.timezone}</p>
      </Section>

      <Section title="Doctor" stepIndex={1} onEditStep={onEditStep}>
        <p className="mt-1 font-heading text-lg text-foreground">
          {draft.doctorProfile.doctorName || "—"}
        </p>
        <p className="text-sm text-muted-foreground">
          {draft.doctorProfile.specialty || "No specialty set"}
          {draft.doctorProfile.whatsappNumber
            ? ` · ${draft.doctorProfile.whatsappNumber}`
            : " · WhatsApp not connected yet"}
        </p>
      </Section>

      <Section title="Working hours" stepIndex={2} onEditStep={onEditStep}>
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
    </div>
  );
}
