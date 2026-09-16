"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSettingsDocument } from "../services/settings-client";

/** `T` is the caller's expected document shape — a template-specific type (ClinicSettingsData,
 *  GymSettingsData) for a template-specific tab, or a small shared-shape type (see
 *  messaging-tab.tsx/safety-tab.tsx) for a tab that renders the same fields across templates. */
export function useTenantSettings<T>() {
  const [settings, setSettings] = useState<T | null>(null);

  const reload = useCallback(() => {
    fetchSettingsDocument<T>().then(setSettings);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { settings, reload };
}
