"use client";

import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSettingsField } from "../hooks/use-settings-field";

type SettingsSelectFieldProps = {
  field: string;
  label: string;
  help?: string;
  initialValue: string;
  options: { value: string; label: string }[];
  onSaved?: () => void;
};

export function SettingsSelectField({
  field,
  label,
  help,
  initialValue,
  options,
  onSaved,
}: SettingsSelectFieldProps) {
  const { value, setValue, commit, status } = useSettingsField(field, initialValue, onSaved);
  const t = useTranslations("Common");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={field}>{label}</Label>
        {status === "saved" ? <span className="text-xs text-success">{t("saved")}</span> : null}
      </div>
      <Select
        value={value}
        onValueChange={(next) => {
          if (typeof next !== "string" || !next) return;
          setValue(next);
          commit(next);
        }}
      >
        <SelectTrigger id={field}>
          <SelectValue placeholder={t("select")} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}
