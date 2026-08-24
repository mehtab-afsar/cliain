import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import {
  disconnectIntegration,
  getIntegrationsStatus,
  saveIntegrationCredentials,
  type SaveIntegrationInput,
} from "@/lib/integration-credentials";

export async function GET() {
  const { doctorId } = await requireCurrentDoctor();
  const status = await getIntegrationsStatus(doctorId);
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const { doctorId } = await requireCurrentDoctor();
  const body = (await request.json()) as SaveIntegrationInput;
  try {
    const status = await saveIntegrationCredentials(doctorId, body);
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save integration.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { doctorId } = await requireCurrentDoctor();
  const { provider } = (await request.json()) as {
    provider: "whatsapp" | "vapi" | "googleCalendar";
  };
  const status = await disconnectIntegration(doctorId, provider);
  return NextResponse.json(status);
}
