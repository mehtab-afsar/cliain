import { Switch } from "@/components/ui/switch";
import type { WorkingHoursDay } from "../types";
import { TimeSelect } from "./time-select";

type WorkingHoursDayRowProps = {
  day: WorkingHoursDay;
  onChange: (patch: Partial<WorkingHoursDay>) => void;
};

export function WorkingHoursDayRow({ day, onChange }: WorkingHoursDayRowProps) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex w-32 items-center gap-3">
        <Switch
          checked={day.isOpen}
          onCheckedChange={(isOpen) => onChange({ isOpen })}
          aria-label={`${day.label} open`}
        />
        <span className="text-sm text-foreground">{day.label}</span>
      </div>

      {day.isOpen ? (
        <div className="flex flex-1 items-center gap-2">
          <TimeSelect value={day.startTime} onChange={(startTime) => onChange({ startTime })} />
          <span className="text-sm text-muted-foreground">to</span>
          <TimeSelect value={day.endTime} onChange={(endTime) => onChange({ endTime })} />
        </div>
      ) : (
        <p className="flex-1 text-sm text-muted-foreground">Closed</p>
      )}
    </div>
  );
}
