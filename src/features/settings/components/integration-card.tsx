"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type IntegrationField = {
  key: string;
  label: string;
  placeholder?: string;
  /** Renders as a password input and is never prefilled from `initialValues`. */
  secret?: boolean;
  multiline?: boolean;
  /** Non-secret fields can be prefilled from the current saved value, for editing. */
  initialValue?: string | null;
};

type IntegrationCardProps = {
  title: string;
  description: string;
  connected: boolean;
  fields: IntegrationField[];
  error?: string;
  isSaving: boolean;
  onSave: (values: Record<string, string>) => Promise<boolean>;
  onDisconnect: () => Promise<void>;
};

export function IntegrationCard({
  title,
  description,
  connected,
  fields,
  error,
  isSaving,
  onSave,
  onDisconnect,
}: IntegrationCardProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [justSaved, setJustSaved] = useState(false);

  // Re-seed prefillable (non-secret) fields once server status loads — not derived state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setValues((prev) => {
      const next = { ...prev };
      for (const field of fields) {
        if (!field.secret && field.initialValue && !prev[field.key]) {
          next[field.key] = field.initialValue;
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-seed when initialValues change
  }, [fields.map((f) => f.initialValue).join("|")]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nonEmptyValues = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value.trim() !== ""),
    );
    const ok = await onSave(nonEmptyValues);
    if (ok) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{title}</CardTitle>
          {connected ? (
            <Badge variant="outline" className="gap-1 text-success">
              <Check className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not connected
            </Badge>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          {fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.multiline ? (
                <Textarea
                  id={field.key}
                  placeholder={field.placeholder}
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                />
              ) : (
                <Input
                  id={field.key}
                  type={field.secret ? "password" : "text"}
                  placeholder={
                    field.secret && connected ? "•••••••• (unchanged)" : field.placeholder
                  }
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                />
              )}
            </div>
          ))}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>

        <CardFooter className="flex items-center justify-between bg-transparent border-t-0 pt-4">
          {connected ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={onDisconnect}
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
              Disconnect
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? "Saving…" : justSaved ? "Saved ✓" : "Save"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
