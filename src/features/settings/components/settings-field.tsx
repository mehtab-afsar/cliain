"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSettingsField } from "../hooks/use-settings-field";

type SettingsFieldProps = {
  field: string;
  label: string;
  help?: string;
  initialValue: string;
  defaultValue?: string;
  multiline?: boolean;
  placeholder?: string;
  onSaved?: () => void;
};

/** A single settings-document field with autosave-on-blur, an inline "Saved" confirmation,
 * help text, and a "Reset to default" affordance — the shared pattern every settings tab uses
 * instead of a page-level Save button (see settings/schema.ts's doc comment for why). */
export function SettingsField({
  field,
  label,
  help,
  initialValue,
  defaultValue,
  multiline,
  placeholder,
  onSaved,
}: SettingsFieldProps) {
  const { value, setValue, commit, status, error } = useSettingsField(field, initialValue, onSaved);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={field}>{label}</Label>
        <div className="flex items-center gap-3 text-xs">
          {status === "saving" ? <span className="text-muted-foreground">Saving…</span> : null}
          {status === "saved" ? <span className="text-success">Saved ✓</span> : null}
          {defaultValue !== undefined && value !== defaultValue ? (
            <button
              type="button"
              className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => {
                setValue(defaultValue);
                commit(defaultValue);
              }}
            >
              Reset to default
            </button>
          ) : null}
        </div>
      </div>
      {multiline ? (
        <Textarea
          id={field}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => commit(value)}
          rows={3}
        />
      ) : (
        <Input
          id={field}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => commit(value)}
        />
      )}
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      {status === "error" && error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
