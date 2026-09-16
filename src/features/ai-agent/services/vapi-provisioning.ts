import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { env, vapiPublicUrl } from "@/lib/env";
import { encryptSecret } from "@/lib/crypto";
import { isUniqueConstraintError } from "@/lib/integration-credentials";

const VAPI_API_BASE = "https://api.vapi.ai";

// Confirmed live against a real Vapi account (2026-09): a `provider: "vapi"` (free, instant)
// number REQUIRES a `numberDesiredAreaCode`, and availability shifts constantly — 415 was
// rejected outright, 571 worked. These are tried in order, stopping at the first one that
// works; only US area codes are offered by Vapi's free tier at all, so this is a US number
// regardless of which clinic requests it — a real product gap for a non-US clinic (an Indian
// clinic's patients would be dialing a US number), not something fixable from this side alone;
// a real deployment would want a purchased/imported local number (e.g. via Twilio import)
// instead once that matters.
const CANDIDATE_AREA_CODES = ["571", "502", "585", "212", "628"];

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
 */
export async function provisionVapiForDoctor(doctorId: string, clinicName: string): Promise<ProvisionResult> {
  if (!env.VAPI_API_KEY) {
    return { ok: false, error: "Phone calls aren't available on this deployment yet — Cliain hasn't connected its Vapi account." };
  }
  const publicUrl = vapiPublicUrl();
  if (!publicUrl) {
    return { ok: false, error: "Phone calls aren't available on this deployment yet — no URL Vapi can reach is configured." };
  }

  const webhookSecret = randomBytes(24).toString("hex");

  try {
    let lastError = "Vapi has no phone numbers available right now — try again shortly.";
    let data: { id: string; number: string } | null = null;

    for (const areaCode of CANDIDATE_AREA_CODES) {
      const response = await fetch(`${VAPI_API_BASE}/phone-number`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.VAPI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "vapi",
          numberDesiredAreaCode: areaCode,
          name: clinicName,
          server: {
            url: `${publicUrl}/api/webhooks/vapi/${doctorId}`,
            secret: webhookSecret,
          },
        }),
      });

      if (response.ok) {
        data = (await response.json()) as { id: string; number: string };
        break;
      }

      const body = await response.text();
      lastError = `Vapi rejected the request (${response.status}): ${body}`;
      // Only keep trying other area codes for an availability problem — any other error
      // (auth, malformed request) will fail identically on every subsequent attempt too.
      if (!body.toLowerCase().includes("area code")) break;
    }

    if (!data) {
      return { ok: false, error: lastError };
    }

    await db.tenant.update({
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
  const doctor = await db.tenant.findUnique({
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

  await db.tenant.update({
    where: { id: doctorId },
    data: { vapiPhoneNumberId: null, vapiPhoneNumber: null, vapiWebhookSecret: null },
  });
}
