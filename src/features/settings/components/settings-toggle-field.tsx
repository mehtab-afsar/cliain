"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsField } from "../hooks/use-settings-field";

type SettingsToggleFieldProps = {
  field: string;
  label: string;
  help?: string;
  initialValue: boolean;
  onSaved?: () => void;
};

export function SettingsToggleField({ field, label, help, initialValue, onSaved }: SettingsToggleFieldProps) {
  const { value, commit, status } = useSettingsField(field, initialValue, onSaved);
  const t = useTranslations("Common");

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={field}>{label}</Label>
        {help ? <p className="mt-1 text-xs text-muted-foreground">{help}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status === "saved" ? <span className="text-xs text-success">{t("saved")}</span> : null}
        <Switch
          id={field}
          checked={value}
          onCheckedChange={(checked) => commit(checked)}
        />
      </div>
    </div>
  );
}
