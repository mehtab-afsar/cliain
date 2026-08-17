import "server-only";
import { runAgentTurn } from "./agent-loop";
import { sendWhatsappText } from "./whatsapp-client";
import { hasProcessedWamid } from "./conversation-store";

type InboundMessage = { from: string; wamid: string; text: string };

/** Meta's WhatsApp Cloud API webhook payload shape — only the fields we read. */
type WhatsappWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          id?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

export function parseInboundMessage(payload: WhatsappWebhookPayload): InboundMessage | null {
  const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message || message.type !== "text" || !message.from || !message.id || !message.text?.body) {
    return null;
  }
  return { from: message.from, wamid: message.id, text: message.text.body };
}

/** Runs the agent loop for an inbound message and sends the reply back. Dedups by wamid. */
export async function handleInboundMessage(message: InboundMessage): Promise<void> {
  if (await hasProcessedWamid(message.wamid)) return;

  const reply = await runAgentTurn(message.from, message.text, message.wamid);
  await sendWhatsappText(message.from, reply);
}
