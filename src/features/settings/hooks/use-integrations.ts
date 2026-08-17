"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  IntegrationsStatus,
  SaveIntegrationInput,
} from "@/lib/integration-credentials";
import {
  disconnectIntegration as disconnectIntegrationRequest,
  fetchIntegrationsStatus,
  saveIntegration as saveIntegrationRequest,
} from "../services/integrations-client";

export function useIntegrations() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [errorByProvider, setErrorByProvider] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchIntegrationsStatus().then(setStatus);
  }, []);

  const save = useCallback(async (input: SaveIntegrationInput) => {
    setSavingProvider(input.provider);
    setErrorByProvider((prev) => ({ ...prev, [input.provider]: "" }));
    try {
      const next = await saveIntegrationRequest(input);
      setStatus(next);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save.";
      setErrorByProvider((prev) => ({ ...prev, [input.provider]: message }));
      return false;
    } finally {
      setSavingProvider(null);
    }
  }, []);

  const disconnect = useCallback(
    async (provider: "whatsapp" | "vapi" | "googleCalendar") => {
      setSavingProvider(provider);
      const next = await disconnectIntegrationRequest(provider);
      setStatus(next);
      setSavingProvider(null);
    },
    [],
  );

  return { status, savingProvider, errorByProvider, save, disconnect };
}
