"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSettingsField } from "../hooks/use-settings-field";

const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Marathi",
  "Bengali",
  "Gujarati",
];

type LanguageChipsFieldProps = {
  field: string;
  label: string;
  help?: string;
  initialValue: string[];
};

export function LanguageChipsField({ field, label, help, initialValue }: LanguageChipsFieldProps) {
  const { value, setValue, commit, status } = useSettingsField(field, initialValue);

  function toggle(language: string) {
    const next = value.includes(language)
      ? value.filter((entry) => entry !== language)
      : [...value, language];
    // At least one language must stay selected — the AI needs a default reply language.
    if (next.length === 0) return;
    setValue(next);
    commit(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        {status === "saved" ? <span className="text-xs text-success">Saved ✓</span> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {LANGUAGE_OPTIONS.map((language) => {
          const selected = value.includes(language);
          return (
            <button
              key={language}
              type="button"
              onClick={() => toggle(language)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {language}
            </button>
          );
        })}
      </div>
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}
