import { Building2, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GymBasics } from "../types";
import { timezoneOptions } from "./timezones";

type GymBasicsStepProps = {
  value: GymBasics;
  onChange: (patch: Partial<GymBasics>) => void;
};

export function GymBasicsStep({ value, onChange }: GymBasicsStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="gym-name" className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          Gym name
        </Label>
        <Input
          id="gym-name"
          placeholder="Riverside Fitness Studio"
          value={value.gymName}
          onChange={(event) => onChange({ gymName: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="gym-timezone" className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          Timezone
        </Label>
        <Select
          value={value.timezone}
          onValueChange={(timezone) => {
            if (typeof timezone === "string" && timezone) onChange({ timezone });
          }}
        >
          <SelectTrigger id="gym-timezone" className="w-full">
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent>
            {timezoneOptions(value.timezone).map((timezone) => (
              <SelectItem key={timezone} value={timezone}>
                {timezone.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
