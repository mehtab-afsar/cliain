"use client";

import { useCallback, useRef, useState } from "react";
import { saveSetting } from "../services/settings-client";

export type FieldStatus = "idle" | "saving" | "saved" | "error";

/** Autosave-on-blur for one dot-path field in the settings document — see settings-field.tsx.
 * `onSaved` is how a live preview sitting alongside these fields learns to re-fetch and
 * re-render from the just-saved document. */
export function useSettingsField<T>(field: string, initialValue: T, onSaved?: () => void) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<FieldStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef(initialValue);

  const commit = useCallback(
    async (newValue: T) => {
      if (newValue === lastSaved.current) return;
      setStatus("saving");
      setError(null);
      const result = await saveSetting(field, newValue);
      if (result.ok) {
        lastSaved.current = newValue;
        setStatus("saved");
        onSaved?.();
        setTimeout(() => setStatus((current) => (current === "saved" ? "idle" : current)), 2000);
      } else {
        setStatus("error");
        setError(result.error);
      }
    },
    [field, onSaved],
  );

  return { value, setValue, commit, status, error };
}
