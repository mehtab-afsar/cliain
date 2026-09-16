import { CalendarClock, Clock, Dumbbell, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassSetup } from "../types";
import { WEEKDAY_LABELS } from "../types";
import { TimeSelect } from "./time-select";

type ClassSetupStepProps = {
  value: ClassSetup;
  onChange: (patch: Partial<ClassSetup>) => void;
};

export function ClassSetupStep({ value, onChange }: ClassSetupStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="class-name" className="flex items-center gap-1.5">
          <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
          Class name
        </Label>
        <Input
          id="class-name"
          placeholder="Sunrise Spin"
          value={value.className}
          onChange={(event) => onChange({ className: event.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="class-duration" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Duration (minutes)
          </Label>
          <Input
            id="class-duration"
            type="number"
            min={5}
            step={5}
            value={value.durationMinutes}
            onChange={(event) => onChange({ durationMinutes: Number(event.target.value) || 0 })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="class-capacity" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            Capacity
          </Label>
          <Input
            id="class-capacity"
            type="number"
            min={1}
            value={value.capacity}
            onChange={(event) => onChange({ capacity: Number(event.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="class-day" className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          When it recurs
        </Label>
        <div className="flex items-center gap-2">
          <Select
            value={String(value.dayOfWeek)}
            onValueChange={(dayOfWeek) => {
              if (typeof dayOfWeek === "string" && dayOfWeek) onChange({ dayOfWeek: Number(dayOfWeek) });
            }}
          >
            <SelectTrigger id="class-day" className="w-40">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAY_LABELS.map((label, dayOfWeek) => (
                <SelectItem key={dayOfWeek} value={String(dayOfWeek)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">at</span>
          <TimeSelect value={value.startTime} onChange={(startTime) => onChange({ startTime })} />
        </div>
        <p className="text-xs text-muted-foreground">
          Cliain books this class every week for the next few weeks — you can add more from the dashboard later.
        </p>
      </div>
    </div>
  );
}
