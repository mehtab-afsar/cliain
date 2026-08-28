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
import type { ClinicBasics } from "../types";
import { timezoneOptions } from "./timezones";

type ClinicBasicsStepProps = {
  value: ClinicBasics;
  onChange: (patch: Partial<ClinicBasics>) => void;
};

export function ClinicBasicsStep({ value, onChange }: ClinicBasicsStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="clinic-name" className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          Clinic name
        </Label>
        <Input
          id="clinic-name"
          placeholder="Rivera Family Practice"
          value={value.clinicName}
          onChange={(event) => onChange({ clinicName: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="clinic-timezone" className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          Timezone
        </Label>
        <Select
          value={value.timezone}
          onValueChange={(timezone) => {
            if (typeof timezone === "string" && timezone) onChange({ timezone });
          }}
        >
          <SelectTrigger id="clinic-timezone" className="w-full">
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
