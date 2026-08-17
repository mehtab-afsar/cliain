import type { OnboardingDraft } from "../types";
import { formatTime } from "../services/format-time";

type ReviewStepProps = {
  draft: OnboardingDraft;
};

export function ReviewStep({ draft }: ReviewStepProps) {
  const openDays = draft.workingHours.filter((day) => day.isOpen);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground">Clinic</h3>
        <p className="mt-1 font-heading text-lg text-foreground">
          {draft.clinicBasics.clinicName || "—"}
        </p>
        <p className="text-sm text-muted-foreground">
          {draft.clinicBasics.timezone}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground">Doctor</h3>
        <p className="mt-1 font-heading text-lg text-foreground">
          {draft.doctorProfile.doctorName || "—"}
        </p>
        <p className="text-sm text-muted-foreground">
          {draft.doctorProfile.specialty || "No specialty set"}
          {draft.doctorProfile.whatsappNumber
            ? ` · ${draft.doctorProfile.whatsappNumber}`
            : " · WhatsApp not connected yet"}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground">
          Working hours
        </h3>
        <ul className="mt-2 flex flex-col gap-1">
          {openDays.map((day) => (
            <li
              key={day.dayOfWeek}
              className="flex justify-between text-sm text-foreground"
            >
              <span>{day.label}</span>
              <span className="font-mono text-muted-foreground">
                {formatTime(day.startTime)} – {formatTime(day.endTime)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
