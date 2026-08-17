import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DoctorProfile } from "../types";

type DoctorProfileStepProps = {
  value: DoctorProfile;
  onChange: (patch: Partial<DoctorProfile>) => void;
};

export function DoctorProfileStep({ value, onChange }: DoctorProfileStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="doctor-name">Doctor name</Label>
        <Input
          id="doctor-name"
          placeholder="Dr. Alex Rivera"
          value={value.doctorName}
          onChange={(event) => onChange({ doctorName: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="doctor-specialty">Specialty</Label>
        <Input
          id="doctor-specialty"
          placeholder="Family Practice"
          value={value.specialty}
          onChange={(event) => onChange({ specialty: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="doctor-whatsapp">WhatsApp number</Label>
        <Input
          id="doctor-whatsapp"
          type="tel"
          placeholder="+1 555 123 4567"
          value={value.whatsappNumber}
          onChange={(event) => onChange({ whatsappNumber: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Don&apos;t have this yet? Leave it blank — you can connect WhatsApp
          later from Settings.
        </p>
      </div>
    </div>
  );
}
