import { NextResponse } from "next/server";
import {
  disconnectIntegration,
  getIntegrationsStatus,
  saveIntegrationCredentials,
  type SaveIntegrationInput,
} from "@/lib/integration-credentials";

export async function GET() {
  const status = await getIntegrationsStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const body = (await request.json()) as SaveIntegrationInput;
  try {
    const status = await saveIntegrationCredentials(body);
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save integration.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { provider } = (await request.json()) as {
    provider: "whatsapp" | "vapi" | "googleCalendar";
  };
  const status = await disconnectIntegration(provider);
  return NextResponse.json(status);
}
