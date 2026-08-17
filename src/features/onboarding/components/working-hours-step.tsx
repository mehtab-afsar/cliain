import type { WorkingHoursDay } from "../types";
import { WorkingHoursDayRow } from "./working-hours-day-row";

type WorkingHoursStepProps = {
  value: WorkingHoursDay[];
  onChangeDay: (dayOfWeek: number, patch: Partial<WorkingHoursDay>) => void;
};

export function WorkingHoursStep({ value, onChangeDay }: WorkingHoursStepProps) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card px-5">
      {value.map((day) => (
        <WorkingHoursDayRow
          key={day.dayOfWeek}
          day={day}
          onChange={(patch) => onChangeDay(day.dayOfWeek, patch)}
        />
      ))}
    </div>
  );
}
