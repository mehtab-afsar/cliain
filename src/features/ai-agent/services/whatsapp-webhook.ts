import "server-only";
import { runAgentTurn } from "./agent-loop";
import { sendWhatsappText } from "./whatsapp-client";
import { hasProcessedWamid } from "./conversation-store";
import { verifyToolToken } from "./tool-token";

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

/**
 * Runs the agent loop for an inbound message and sends the reply back. Dedups by wamid.
 *
 * `token` must have been minted by the calling route (see tool-token.ts) only after Meta's
 * signature on this delivery was verified — tenantId is derived from it here, not trusted from
 * any other source.
 */
export async function handleInboundMessage(token: string, message: InboundMessage): Promise<void> {
  const session = verifyToolToken(token);
  if (!session) throw new Error("handleInboundMessage called with an invalid or expired tool token.");

  if (await hasProcessedWamid(message.wamid)) return;

  const reply = await runAgentTurn(token, message.from, message.text, message.wamid);
  // null means this patient has been handed off to staff — send nothing (see agent-loop.ts).
  if (reply !== null) {
    await sendWhatsappText(session.tenantId, message.from, reply);
  }
}
