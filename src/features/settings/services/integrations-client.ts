import type {
  IntegrationsStatus,
  SaveIntegrationInput,
} from "@/lib/integration-credentials";

export type IntegrationsStatusWithWebhooks = IntegrationsStatus & {
  /** Null when APP_URL isn't configured — never falls back to a localhost URL. No `vapi` key —
   * that webhook URL is set automatically at provisioning time, never pasted by a clinic. */
  webhookUrls: { whatsapp: string } | null;
};

export async function fetchIntegrationsStatus(): Promise<IntegrationsStatusWithWebhooks | null> {
  const response = await fetch("/api/settings/integrations");
  if (!response.ok) return null;
  return response.json();
}

export async function saveIntegration(
  input: SaveIntegrationInput,
): Promise<IntegrationsStatusWithWebhooks> {
  const response = await fetch("/api/settings/integrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const { error } = (await response.json()) as { error?: string };
    throw new Error(error ?? "Failed to save integration.");
  }
  return response.json();
}

export async function disconnectIntegration(
  provider: "whatsapp" | "googleCalendar",
): Promise<IntegrationsStatusWithWebhooks> {
  const response = await fetch("/api/settings/integrations", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  return response.json();
}

/** No fields to send — phone calls are provisioned entirely server-side (see
 *  vapi-provisioning.ts). This is "turn it on", not a form save. */
export async function enableVapi(): Promise<
  { ok: true; status: IntegrationsStatusWithWebhooks } | { ok: false; error: string }
> {
  const response = await fetch("/api/settings/integrations/vapi", { method: "POST" });
  const body = await response.json();
  if (!response.ok) {
    return { ok: false, error: (body as { error?: string }).error ?? "Failed to enable phone calls." };
  }
  return { ok: true, status: body as IntegrationsStatusWithWebhooks };
}

export async function disableVapi(): Promise<IntegrationsStatusWithWebhooks> {
  const response = await fetch("/api/settings/integrations/vapi", { method: "DELETE" });
  return response.json();
}
