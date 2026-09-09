import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { encryptSecret } from "@/lib/crypto";
import { isUniqueConstraintError } from "@/lib/integration-credentials";

const VAPI_API_BASE = "https://api.vapi.ai";

export type ProvisionResult = { ok: true; phoneNumber: string } | { ok: false; error: string };

/**
 * Provisions a phone number for this clinic on Cliain's own Vapi account (VAPI_API_KEY) — the
 * clinic never sees or holds a Vapi credential of its own, unlike WhatsApp/Google Calendar.
 *
 * The number's `server` is set at creation time, with no static `assistantId` attached — so an
 * inbound call makes Vapi send an "assistant-request" message to our webhook asking what
 * assistant to run (handled in the vapi webhook route via buildInboundAssistantConfig), rather
 * than a fixed assistant baked in at provisioning time. That's what keeps a call in sync with
 * whatever the clinic's Settings say *right now* — greeting, tone, escalation number — instead
 * of whatever was true the day the number was created.
 *
 * Not verified against a live Vapi account: `provider: "vapi"` numbers are documented as
 * free/instant, but real availability, calling-code support, and any KYC requirement varies by
 * country — confirm this against a real account (and a real inbound test call) before relying
 * on it for a launch, the same caveat already on the outbound call path in vapi-client.ts.
 */
export async function provisionVapiForDoctor(doctorId: string, clinicName: string): Promise<ProvisionResult> {
  if (!env.VAPI_API_KEY) {
    return { ok: false, error: "Phone calls aren't available on this deployment yet — Cliain hasn't connected its Vapi account." };
  }
  if (!env.APP_URL) {
    return { ok: false, error: "Phone calls aren't available on this deployment yet — APP_URL isn't configured." };
  }

  const webhookSecret = randomBytes(24).toString("hex");

  try {
    const response = await fetch(`${VAPI_API_BASE}/phone-number`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "vapi",
        name: clinicName,
        server: {
          url: `${env.APP_URL}/api/webhooks/vapi/${doctorId}`,
          secret: webhookSecret,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `Vapi rejected the request (${response.status}): ${body}` };
    }

    const data = (await response.json()) as { id: string; number: string };

    await db.doctor.update({
      where: { id: doctorId },
      data: {
        vapiPhoneNumberId: data.id,
        vapiPhoneNumber: data.number,
        vapiWebhookSecret: encryptSecret(webhookSecret),
      },
    });

    return { ok: true, phoneNumber: data.number };
  } catch (error) {
    if (isUniqueConstraintError(error, "vapiPhoneNumberId")) {
      return { ok: false, error: "That number is already connected to another clinic — try again." };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error contacting Vapi." };
  }
}

/** Best-effort — clears this clinic's own record even if Vapi's API call fails, so a clinic
 *  disabling phone calls is never stuck "connected" to a number Cliain can no longer manage. */
export async function deprovisionVapiForDoctor(doctorId: string): Promise<void> {
  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    select: { vapiPhoneNumberId: true },
  });

  if (doctor?.vapiPhoneNumberId && env.VAPI_API_KEY) {
    try {
      await fetch(`${VAPI_API_BASE}/phone-number/${doctor.vapiPhoneNumberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${env.VAPI_API_KEY}` },
      });
    } catch {
      // Vapi unreachable — still proceed to clear our own record below.
    }
  }

  await db.doctor.update({
    where: { id: doctorId },
    data: { vapiPhoneNumberId: null, vapiPhoneNumber: null, vapiWebhookSecret: null },
  });
}
