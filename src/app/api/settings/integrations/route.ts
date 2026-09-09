import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { env } from "@/lib/env";
import {
  disconnectIntegration,
  getIntegrationsStatus,
  saveIntegrationCredentials,
  type SaveIntegrationInput,
} from "@/lib/integration-credentials";

/** Never falls back to request-derived origin (which would be localhost in dev) — null until
 * APP_URL is actually configured, per the "never show a localhost URL" rule. No `vapi` entry —
 * that webhook URL is Cliain's own provisioning detail now (set automatically, see
 * vapi-provisioning.ts), never something a clinic pastes anywhere. */
function webhookUrls(doctorId: string) {
  if (!env.APP_URL) return null;
  return {
    whatsapp: `${env.APP_URL}/api/webhooks/whatsapp/${doctorId}`,
  };
}

export async function GET() {
  const { doctorId } = await requireCurrentDoctor();
  const status = await getIntegrationsStatus(doctorId);
  return NextResponse.json({ ...status, webhookUrls: webhookUrls(doctorId) });
}

export async function POST(request: Request) {
  const { doctorId } = await requireCurrentDoctor();
  const body = (await request.json()) as SaveIntegrationInput;
  try {
    const status = await saveIntegrationCredentials(doctorId, body);
    return NextResponse.json({ ...status, webhookUrls: webhookUrls(doctorId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save integration.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { doctorId } = await requireCurrentDoctor();
  const { provider } = (await request.json()) as {
    provider: "whatsapp" | "googleCalendar";
  };
  const status = await disconnectIntegration(doctorId, provider);
  return NextResponse.json({ ...status, webhookUrls: webhookUrls(doctorId) });
}
