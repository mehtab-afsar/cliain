import "server-only";
import { Prisma, type Doctor } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { decryptSecret, encryptSecret } from "./crypto";
import { googleCalendarConfigured } from "./google-calendar-oauth";

async function getDoctorRow(doctorId: string): Promise<Doctor | null> {
  return db.doctor.findUnique({ where: { id: doctorId } });
}

export type WhatsappConfig = { phoneNumberId: string; accessToken: string };

/** Every clinic connects its own — no shared/env-var fallback (that would leak one clinic's credentials to every other). */
export async function getWhatsappConfig(doctorId: string): Promise<WhatsappConfig | null> {
  const doctor = await getDoctorRow(doctorId);
  if (!doctor?.whatsappPhoneNumberId || !doctor?.whatsappAccessToken) return null;
  return {
    phoneNumberId: doctor.whatsappPhoneNumberId,
    accessToken: decryptSecret(doctor.whatsappAccessToken),
  };
}

export async function getWhatsappVerifyToken(doctorId: string): Promise<string | null> {
  const doctor = await getDoctorRow(doctorId);
  return doctor?.whatsappVerifyToken ? decryptSecret(doctor.whatsappVerifyToken) : null;
}

/** Verifies Meta's `X-Hub-Signature-256` header. Null (not yet configured) skips verification. */
export async function getWhatsappAppSecret(doctorId: string): Promise<string | null> {
  const doctor = await getDoctorRow(doctorId);
  return doctor?.whatsappAppSecret ? decryptSecret(doctor.whatsappAppSecret) : null;
}

export type VapiConfig = { apiKey: string; phoneNumberId: string; webhookUrl: string };

/**
 * Phone calls are Cliain-hosted, not a per-clinic credential — the API key comes from this
 * deployment's own VAPI_API_KEY, never from the doctor row. Only the phone number (provisioned
 * via vapi-provisioning.ts) and the webhook URL are per-clinic. The webhook URL itself is
 * computed, not stored — fully deterministic (APP_URL + this doctor's id), so there's no
 * separate copy that could drift from the real thing.
 */
export async function getVapiConfig(doctorId: string): Promise<VapiConfig | null> {
  if (!env.VAPI_API_KEY || !env.APP_URL) return null;
  const doctor = await getDoctorRow(doctorId);
  if (!doctor?.vapiPhoneNumberId) return null;
  return {
    apiKey: env.VAPI_API_KEY,
    phoneNumberId: doctor.vapiPhoneNumberId,
    webhookUrl: `${env.APP_URL}/api/webhooks/vapi/${doctorId}`,
  };
}

/** Sent back by Vapi as a header on every tool-call request. Null skips verification. */
export async function getVapiWebhookSecret(doctorId: string): Promise<string | null> {
  const doctor = await getDoctorRow(doctorId);
  return doctor?.vapiWebhookSecret ? decryptSecret(doctor.vapiWebhookSecret) : null;
}

/** Set by the OAuth callback (see google-calendar-oauth.ts), not typed in by the clinic. */
export async function getGoogleCalendarRefreshToken(doctorId: string): Promise<string | null> {
  const doctor = await getDoctorRow(doctorId);
  return doctor?.googleCalendarRefreshToken ? decryptSecret(doctor.googleCalendarRefreshToken) : null;
}

export async function getGoogleCalendarId(doctorId: string): Promise<string | null> {
  const doctor = await getDoctorRow(doctorId);
  return doctor?.googleCalendarId ?? null;
}

// --- Status + save, for the Settings → Integrations UI -------------------------------------

export type IntegrationsStatus = {
  doctorId: string;
  whatsapp: { connected: boolean; phoneNumberId: string | null; hasAppSecret: boolean };
  // No phoneNumberId/hasWebhookSecret here on purpose — those are Cliain's own provisioning
  // detail now, not something a clinic reads or edits. `platformConfigured` distinguishes "this
  // clinic hasn't turned it on" from "this deployment has no VAPI_API_KEY at all yet", which
  // otherwise both look identical from the clinic's side.
  vapi: { connected: boolean; phoneNumber: string | null; platformConfigured: boolean };
  googleCalendar: {
    connected: boolean;
    calendarId: string | null;
    accountEmail: string | null;
    // Whether GOOGLE_CLIENT_ID/SECRET/APP_URL exist at all on this deployment — same
    // "clinic hasn't connected" vs. "deployment isn't set up for this" distinction as vapi's.
    platformConfigured: boolean;
  };
};

export async function getIntegrationsStatus(doctorId: string): Promise<IntegrationsStatus> {
  const doctor = await getDoctorRow(doctorId);
  return {
    doctorId,
    whatsapp: {
      connected: Boolean(doctor?.whatsappPhoneNumberId && doctor?.whatsappAccessToken),
      phoneNumberId: doctor?.whatsappPhoneNumberId ?? null,
      hasAppSecret: Boolean(doctor?.whatsappAppSecret),
    },
    vapi: {
      connected: Boolean(doctor?.vapiPhoneNumberId),
      phoneNumber: doctor?.vapiPhoneNumber ?? null,
      platformConfigured: Boolean(env.VAPI_API_KEY && env.APP_URL),
    },
    googleCalendar: {
      connected: Boolean(doctor?.googleCalendarRefreshToken),
      calendarId: doctor?.googleCalendarId ?? null,
      accountEmail: doctor?.googleCalendarAccountEmail ?? null,
      platformConfigured: googleCalendarConfigured(),
    },
  };
}

export type SaveIntegrationInput =
  | {
      provider: "whatsapp";
      phoneNumberId?: string;
      accessToken?: string;
      verifyToken?: string;
      appSecret?: string;
    }
  | { provider: "googleCalendar"; calendarId?: string };
// No "vapi" case here — phone calls have no clinic-typed fields at all, see
// vapi-provisioning.ts's provisionVapiForDoctor/deprovisionVapiForDoctor instead. No
// "serviceAccountJson" on googleCalendar either — connecting is the OAuth flow in
// google-calendar-oauth.ts, not a form field; this input only covers editing the
// already-connected calendarId afterward.

export function isUniqueConstraintError(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    (error.meta.target as string[]).includes(field)
  );
}

/** Only the fields present (non-empty) in `input` are updated — leaves the rest untouched. */
export async function saveIntegrationCredentials(
  doctorId: string,
  input: SaveIntegrationInput,
): Promise<IntegrationsStatus> {
  const current = await getDoctorRow(doctorId);

  try {
    if (input.provider === "whatsapp") {
      const willBeConnected = Boolean(
        (input.phoneNumberId || current?.whatsappPhoneNumberId) &&
          (input.accessToken || current?.whatsappAccessToken),
      );
      const willHaveAppSecret = Boolean(input.appSecret || current?.whatsappAppSecret);
      if (willBeConnected && !willHaveAppSecret) {
        throw new Error(
          "An app secret is required to connect WhatsApp — find it in your Meta App's Basic Settings, so we can verify requests really came from Meta.",
        );
      }

      await db.doctor.update({
        where: { id: doctorId },
        data: {
          ...(input.phoneNumberId ? { whatsappPhoneNumberId: input.phoneNumberId } : {}),
          ...(input.accessToken ? { whatsappAccessToken: encryptSecret(input.accessToken) } : {}),
          ...(input.verifyToken ? { whatsappVerifyToken: encryptSecret(input.verifyToken) } : {}),
          ...(input.appSecret ? { whatsappAppSecret: encryptSecret(input.appSecret) } : {}),
        },
      });
    } else if (input.calendarId) {
      // Editing which calendar to sync to on an already-connected clinic — connecting in the
      // first place happens via the OAuth callback, not here.
      await db.doctor.update({
        where: { id: doctorId },
        data: { googleCalendarId: input.calendarId },
      });
    }
  } catch (error) {
    if (isUniqueConstraintError(error, "whatsappPhoneNumberId")) {
      throw new Error("This WhatsApp phone number is already connected to another clinic.");
    }
    throw error;
  }

  return getIntegrationsStatus(doctorId);
}

export async function disconnectIntegration(
  doctorId: string,
  provider: "whatsapp" | "googleCalendar",
): Promise<IntegrationsStatus> {
  if (provider === "whatsapp") {
    await db.doctor.update({
      where: { id: doctorId },
      data: {
        whatsappPhoneNumberId: null,
        whatsappAccessToken: null,
        whatsappVerifyToken: null,
        whatsappAppSecret: null,
      },
    });
  } else {
    await db.doctor.update({
      where: { id: doctorId },
      data: {
        googleCalendarRefreshToken: null,
        googleCalendarAccountEmail: null,
        googleCalendarId: null,
      },
    });
  }

  return getIntegrationsStatus(doctorId);
}
