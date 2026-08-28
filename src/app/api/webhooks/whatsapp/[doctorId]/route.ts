import { NextResponse, after } from "next/server";
import { getWhatsappAppSecret, getWhatsappVerifyToken } from "@/lib/integration-credentials";
import { verifyMetaSignature } from "@/lib/webhook-signatures";
import {
  handleInboundMessage,
  parseInboundMessage,
} from "@/features/ai-agent/services/whatsapp-webhook";

type RouteParams = { params: Promise<{ doctorId: string }> };

// Meta's verification handshake — GET with a challenge to echo back. Per-clinic URL means
// the doctorId in the path picks which clinic's verify token to check, so every clinic can
// complete its own handshake independently (this used to only work for the first clinic ever
// onboarded, back when there was one shared webhook URL for everyone).
export async function GET(request: Request, { params }: RouteParams) {
  const { doctorId } = await params;
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = await getWhatsappVerifyToken(doctorId);

  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Inbound messages. Returns 200 immediately; processing (Claude + DB + reply) runs after
// the response is sent so Meta doesn't retry the delivery mid-processing.
export async function POST(request: Request, { params }: RouteParams) {
  const { doctorId } = await params;
  const rawBody = await request.text();

  // Signature verification is skipped (not skippable) once a clinic has set an app secret —
  // until then, connecting WhatsApp at all still works, just without this extra check.
  const appSecret = await getWhatsappAppSecret(doctorId);
  if (appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, signature, appSecret)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  const payload = JSON.parse(rawBody);
  const message = parseInboundMessage(payload);

  if (message) {
    after(() =>
      handleInboundMessage(doctorId, message).catch((error) => {
        console.error("[whatsapp-webhook] Failed to handle inbound message:", error);
      }),
    );
  }

  return NextResponse.json({ received: true });
}
