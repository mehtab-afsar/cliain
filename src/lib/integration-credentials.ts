import "server-only";
import { Prisma, type Doctor } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { decryptSecret, encryptSecret } from "./crypto";

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
 * The webhook URL is computed, not stored — it's fully deterministic now that routing is
 * per-clinic (APP_URL + this doctor's id), so there's no separate copy that could drift from
 * the real thing. Requires APP_URL to be set (the deployment's public base URL).
 */
export async function getVapiConfig(doctorId: string): Promise<VapiConfig | null> {
  const doctor = await getDoctorRow(doctorId);
  if (!doctor?.vapiApiKey || !doctor?.vapiPhoneNumberId || !env.APP_URL) return null;
  return {
    apiKey: decryptSecret(doctor.vapiApiKey),
    phoneNumberId: doctor.vapiPhoneNumberId,
    webhookUrl: `${env.APP_URL}/api/webhooks/vapi/${doctorId}`,
  };
}

/** Sent back by Vapi as a header on every tool-call request. Null skips verification. */
export async function getVapiWebhookSecret(doctorId: string): Promise<string | null> {
  const doctor = await getDoctorRow(doctorId);
  return doctor?.vapiWebhookSecret ? decryptSecret(doctor.vapiWebhookSecret) : null;
}

export type GoogleServiceAccountCredentials = { client_email: string; private_key: string };

export async function getGoogleServiceAccountCredentials(
  doctorId: string,
): Promise<GoogleServiceAccountCredentials | null> {
  const doctor = await getDoctorRow(doctorId);
  if (!doctor?.googleServiceAccountJson) return null;
  return JSON.parse(decryptSecret(doctor.googleServiceAccountJson));
}

export async function getGoogleCalendarId(doctorId: string): Promise<string | null> {
  const doctor = await getDoctorRow(doctorId);
  return doctor?.googleCalendarId ?? null;
}

// --- Status + save, for the Settings → Integrations UI -------------------------------------

export type IntegrationsStatus = {
  doctorId: string;
  whatsapp: { connected: boolean; phoneNumberId: string | null; hasAppSecret: boolean };
  vapi: { connected: boolean; phoneNumberId: string | null; hasWebhookSecret: boolean };
  googleCalendar: { connected: boolean; calendarId: string | null };
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
      connected: Boolean(doctor?.vapiApiKey && doctor?.vapiPhoneNumberId),
      phoneNumberId: doctor?.vapiPhoneNumberId ?? null,
      hasWebhookSecret: Boolean(doctor?.vapiWebhookSecret),
    },
    googleCalendar: {
      connected: Boolean(doctor?.googleServiceAccountJson),
      calendarId: doctor?.googleCalendarId ?? null,
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
  | { provider: "vapi"; apiKey?: string; phoneNumberId?: string; webhookSecret?: string }
  | { provider: "googleCalendar"; serviceAccountJson?: string; calendarId?: string };

function isUniqueConstraintError(error: unknown, field: string): boolean {
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
    } else if (input.provider === "vapi") {
      const willBeConnected = Boolean(
        (input.apiKey || current?.vapiApiKey) &&
          (input.phoneNumberId || current?.vapiPhoneNumberId),
      );
      const willHaveWebhookSecret = Boolean(input.webhookSecret || current?.vapiWebhookSecret);
      if (willBeConnected && !willHaveWebhookSecret) {
        throw new Error(
          "A webhook secret is required to connect Vapi — set it to the same value as your assistant's server secret, so we can verify requests really came from Vapi.",
        );
      }

      await db.doctor.update({
        where: { id: doctorId },
        data: {
          ...(input.apiKey ? { vapiApiKey: encryptSecret(input.apiKey) } : {}),
          ...(input.phoneNumberId ? { vapiPhoneNumberId: input.phoneNumberId } : {}),
          ...(input.webhookSecret ? { vapiWebhookSecret: encryptSecret(input.webhookSecret) } : {}),
        },
      });
    } else {
      await db.doctor.update({
        where: { id: doctorId },
        data: {
          ...(input.serviceAccountJson
            ? { googleServiceAccountJson: encryptSecret(input.serviceAccountJson) }
            : {}),
          ...(input.calendarId ? { googleCalendarId: input.calendarId } : {}),
        },
      });
    }
  } catch (error) {
    if (isUniqueConstraintError(error, "whatsappPhoneNumberId")) {
      throw new Error("This WhatsApp phone number is already connected to another clinic.");
    }
    if (isUniqueConstraintError(error, "vapiPhoneNumberId")) {
      throw new Error("This Vapi phone number is already connected to another clinic.");
    }
    throw error;
  }

  return getIntegrationsStatus(doctorId);
}

export async function disconnectIntegration(
  doctorId: string,
  provider: "whatsapp" | "vapi" | "googleCalendar",
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
  } else if (provider === "vapi") {
    await db.doctor.update({
      where: { id: doctorId },
      data: {
        vapiApiKey: null,
        vapiPhoneNumberId: null,
        vapiWebhookSecret: null,
      },
    });
  } else {
    await db.doctor.update({
      where: { id: doctorId },
      data: { googleServiceAccountJson: null },
    });
  }

  return getIntegrationsStatus(doctorId);
}
