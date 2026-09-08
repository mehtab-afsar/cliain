import type {
  IntegrationsStatus,
  SaveIntegrationInput,
} from "@/lib/integration-credentials";

export type IntegrationsStatusWithWebhooks = IntegrationsStatus & {
  /** Null when APP_URL isn't configured — never falls back to a localhost URL. */
  webhookUrls: { whatsapp: string; vapi: string } | null;
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
  provider: "whatsapp" | "vapi" | "googleCalendar",
): Promise<IntegrationsStatusWithWebhooks> {
  const response = await fetch("/api/settings/integrations", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  return response.json();
}
