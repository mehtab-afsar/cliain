"use client";

import { useCallback, useEffect, useState } from "react";
import type { SaveIntegrationInput } from "@/lib/integration-credentials";
import {
  disconnectIntegration as disconnectIntegrationRequest,
  disableVapi,
  enableVapi,
  fetchIntegrationsStatus,
  saveIntegration as saveIntegrationRequest,
  type IntegrationsStatusWithWebhooks,
} from "../services/integrations-client";

export function useIntegrations() {
  const [status, setStatus] = useState<IntegrationsStatusWithWebhooks | null>(null);
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

  const disconnect = useCallback(async (provider: "whatsapp" | "googleCalendar") => {
    setSavingProvider(provider);
    const next = await disconnectIntegrationRequest(provider);
    setStatus(next);
    setSavingProvider(null);
  }, []);

  const enablePhoneCalls = useCallback(async () => {
    setSavingProvider("vapi");
    setErrorByProvider((prev) => ({ ...prev, vapi: "" }));
    const result = await enableVapi();
    if (result.ok) {
      setStatus(result.status);
    } else {
      setErrorByProvider((prev) => ({ ...prev, vapi: result.error }));
    }
    setSavingProvider(null);
  }, []);

  const disablePhoneCalls = useCallback(async () => {
    setSavingProvider("vapi");
    const next = await disableVapi();
    setStatus(next);
    setSavingProvider(null);
  }, []);

  return {
    status,
    savingProvider,
    errorByProvider,
    save,
    disconnect,
    enablePhoneCalls,
    disablePhoneCalls,
  };
}
