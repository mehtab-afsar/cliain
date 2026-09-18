"use client";

import { Dumbbell, MessageCircle, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TrainerProfile } from "../types";

type TrainerProfileStepProps = {
  value: TrainerProfile;
  onChange: (patch: Partial<TrainerProfile>) => void;
};

export function TrainerProfileStep({ value, onChange }: TrainerProfileStepProps) {
  const t = useTranslations("Onboarding.trainerProfile");
  const tFields = useTranslations("Onboarding.fields");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="trainer-name" className="flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
          {t("nameLabel")}
        </Label>
        <Input
          id="trainer-name"
          placeholder="Alex Rivera"
          value={value.trainerName}
          onChange={(event) => onChange({ trainerName: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="trainer-role" className="flex items-center gap-1.5">
          <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
          {t("roleLabel")}
        </Label>
        <Input
          id="trainer-role"
          placeholder="Head Coach"
          value={value.role}
          onChange={(event) => onChange({ role: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="trainer-whatsapp" className="flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
          {tFields("whatsappNumberLabel")}
        </Label>
        <Input
          id="trainer-whatsapp"
          type="tel"
          placeholder="+1 555 123 4567"
          value={value.whatsappNumber}
          onChange={(event) => onChange({ whatsappNumber: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">{tFields("whatsappHelp")}</p>
      </div>
    </div>
  );
}
