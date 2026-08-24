import "server-only";
import { readFileSync } from "node:fs";
import type { Doctor } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { decryptSecret, encryptSecret } from "./crypto";

async function getDoctorRow(doctorId: string): Promise<Doctor | null> {
  return db.doctor.findUnique({ where: { id: doctorId } });
}

export type WhatsappConfig = { phoneNumberId: string; accessToken: string };

/** DB-stored credentials win when present; falls back to env vars (self-hosted/.env.local flow). */
export async function getWhatsappConfig(doctorId: string): Promise<WhatsappConfig | null> {
  const doctor = await getDoctorRow(doctorId);
  const phoneNumberId = doctor?.whatsappPhoneNumberId || env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = doctor?.whatsappAccessToken
    ? decryptSecret(doctor.whatsappAccessToken)
    : env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

export async function getWhatsappVerifyToken(doctorId: string): Promise<string | null> {
  const doctor = await getDoctorRow(doctorId);
  if (doctor?.whatsappVerifyToken) return decryptSecret(doctor.whatsappVerifyToken);
  return env.WHATSAPP_VERIFY_TOKEN ?? null;
}

export type VapiConfig = { apiKey: string; phoneNumberId: string; webhookUrl: string };

export async function getVapiConfig(doctorId: string): Promise<VapiConfig | null> {
  const doctor = await getDoctorRow(doctorId);
  const apiKey = doctor?.vapiApiKey ? decryptSecret(doctor.vapiApiKey) : env.VAPI_API_KEY;
  const phoneNumberId = doctor?.vapiPhoneNumberId || env.VAPI_PHONE_NUMBER_ID;
  const webhookUrl = doctor?.vapiToolWebhookUrl || env.VAPI_TOOL_WEBHOOK_URL;
  if (!apiKey || !phoneNumberId || !webhookUrl) return null;
  return { apiKey, phoneNumberId, webhookUrl };
}

export type GoogleServiceAccountCredentials = { client_email: string; private_key: string };

export async function getGoogleServiceAccountCredentials(
  doctorId: string,
): Promise<GoogleServiceAccountCredentials | null> {
  const doctor = await getDoctorRow(doctorId);
  if (doctor?.googleServiceAccountJson) {
    return JSON.parse(decryptSecret(doctor.googleServiceAccountJson));
  }
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    return JSON.parse(readFileSync(env.GOOGLE_SERVICE_ACCOUNT_FILE, "utf-8"));
  }
  return null;
}

export async function getGoogleCalendarId(doctorId: string): Promise<string | null> {
  const doctor = await getDoctorRow(doctorId);
  return doctor?.googleCalendarId ?? null;
}

// --- Status + save, for the Settings → Integrations UI -------------------------------------

export type IntegrationsStatus = {
  whatsapp: { connected: boolean; phoneNumberId: string | null };
  vapi: { connected: boolean; phoneNumberId: string | null; webhookUrl: string | null };
  googleCalendar: { connected: boolean; calendarId: string | null };
};

export async function getIntegrationsStatus(doctorId: string): Promise<IntegrationsStatus> {
  const doctor = await getDoctorRow(doctorId);
  return {
    whatsapp: {
      connected: Boolean(doctor?.whatsappPhoneNumberId && doctor?.whatsappAccessToken),
      phoneNumberId: doctor?.whatsappPhoneNumberId ?? null,
    },
    vapi: {
      connected: Boolean(doctor?.vapiApiKey && doctor?.vapiPhoneNumberId),
      phoneNumberId: doctor?.vapiPhoneNumberId ?? null,
      webhookUrl: doctor?.vapiToolWebhookUrl ?? null,
    },
    googleCalendar: {
      connected: Boolean(doctor?.googleServiceAccountJson),
      calendarId: doctor?.googleCalendarId ?? null,
    },
  };
}

export type SaveIntegrationInput =
  | { provider: "whatsapp"; phoneNumberId?: string; accessToken?: string; verifyToken?: string }
  | { provider: "vapi"; apiKey?: string; phoneNumberId?: string; webhookUrl?: string }
  | { provider: "googleCalendar"; serviceAccountJson?: string; calendarId?: string };

/** Only the fields present (non-empty) in `input` are updated — leaves the rest untouched. */
export async function saveIntegrationCredentials(
  doctorId: string,
  input: SaveIntegrationInput,
): Promise<IntegrationsStatus> {
  if (input.provider === "whatsapp") {
    await db.doctor.update({
      where: { id: doctorId },
      data: {
        ...(input.phoneNumberId ? { whatsappPhoneNumberId: input.phoneNumberId } : {}),
        ...(input.accessToken ? { whatsappAccessToken: encryptSecret(input.accessToken) } : {}),
        ...(input.verifyToken ? { whatsappVerifyToken: encryptSecret(input.verifyToken) } : {}),
      },
    });
  } else if (input.provider === "vapi") {
    await db.doctor.update({
      where: { id: doctorId },
      data: {
        ...(input.apiKey ? { vapiApiKey: encryptSecret(input.apiKey) } : {}),
        ...(input.phoneNumberId ? { vapiPhoneNumberId: input.phoneNumberId } : {}),
        ...(input.webhookUrl ? { vapiToolWebhookUrl: input.webhookUrl } : {}),
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

  return getIntegrationsStatus(doctorId);
}

export async function disconnectIntegration(
  doctorId: string,
  provider: "whatsapp" | "vapi" | "googleCalendar",
): Promise<IntegrationsStatus> {
  if (provider === "whatsapp") {
    await db.doctor.update({
      where: { id: doctorId },
      data: { whatsappPhoneNumberId: null, whatsappAccessToken: null, whatsappVerifyToken: null },
    });
  } else if (provider === "vapi") {
    await db.doctor.update({
      where: { id: doctorId },
      data: { vapiApiKey: null, vapiPhoneNumberId: null, vapiToolWebhookUrl: null },
    });
  } else {
    await db.doctor.update({
      where: { id: doctorId },
      data: { googleServiceAccountJson: null },
    });
  }

  return getIntegrationsStatus(doctorId);
}
