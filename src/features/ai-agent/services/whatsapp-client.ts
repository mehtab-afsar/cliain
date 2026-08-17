import "server-only";
import { env } from "@/lib/env";

const GRAPH_API_VERSION = "v21.0";

function requireWhatsappConfig() {
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
    throw new Error(
      "WhatsApp is not configured — set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env.local.",
    );
  }
  return {
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
  };
}

async function callGraphApi(phoneNumberId: string, accessToken: string, body: unknown) {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp send failed (${response.status}): ${errorBody}`);
  }
  return response.json();
}

/** Free-form reply — only valid within the 24h window opened by an inbound patient message. */
export async function sendWhatsappText(to: string, body: string) {
  const { phoneNumberId, accessToken } = requireWhatsappConfig();
  return callGraphApi(phoneNumberId, accessToken, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

/** Clinic-initiated message (e.g. a reminder) — must use a pre-approved template. */
export async function sendWhatsappTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParameters: string[],
) {
  const { phoneNumberId, accessToken } = requireWhatsappConfig();
  return callGraphApi(phoneNumberId, accessToken, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters: bodyParameters.map((text) => ({ type: "text", text })),
        },
      ],
    },
  });
}
