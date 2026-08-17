import { NextResponse, after } from "next/server";
import { env } from "@/lib/env";
import {
  handleInboundMessage,
  parseInboundMessage,
} from "@/features/ai-agent/services/whatsapp-webhook";

// Meta's verification handshake — GET with a challenge to echo back.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && env.WHATSAPP_VERIFY_TOKEN && token === env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Inbound messages. Returns 200 immediately; processing (Claude + DB + reply) runs after
// the response is sent so Meta doesn't retry the delivery mid-processing.
export async function POST(request: Request) {
  const payload = await request.json();
  const message = parseInboundMessage(payload);

  if (message) {
    after(() => handleInboundMessage(message).catch((error) => {
      console.error("[whatsapp-webhook] Failed to handle inbound message:", error);
    }));
  }

  return NextResponse.json({ received: true });
}
