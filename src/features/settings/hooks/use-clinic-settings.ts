"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchClinicSettings } from "../services/settings-client";
import type { ClinicSettingsData } from "../schema";

export function useClinicSettings() {
  const [settings, setSettings] = useState<ClinicSettingsData | null>(null);

  const reload = useCallback(() => {
    fetchClinicSettings().then(setSettings);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { settings, reload };
}
