import "server-only";
import { readFileSync } from "node:fs";
import type { Doctor } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { decryptSecret, encryptSecret } from "./crypto";

// Single-clinic MVP: no auth/tenancy yet, so — like the rest of the app — this operates on
// the one Doctor row that exists. See doctor-repository.ts for the same pattern.
async function getDoctorRow(): Promise<Doctor | null> {
  return db.doctor.findFirst({ orderBy: { createdAt: "asc" } });
}

export type WhatsappConfig = { phoneNumberId: string; accessToken: string };

/** DB-stored credentials win when present; falls back to env vars (self-hosted/.env.local flow). */
export async function getWhatsappConfig(): Promise<WhatsappConfig | null> {
  const doctor = await getDoctorRow();
  const phoneNumberId = doctor?.whatsappPhoneNumberId || env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = doctor?.whatsappAccessToken
    ? decryptSecret(doctor.whatsappAccessToken)
    : env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

export async function getWhatsappVerifyToken(): Promise<string | null> {
  const doctor = await getDoctorRow();
  if (doctor?.whatsappVerifyToken) return decryptSecret(doctor.whatsappVerifyToken);
  return env.WHATSAPP_VERIFY_TOKEN ?? null;
}

export type VapiConfig = { apiKey: string; phoneNumberId: string; webhookUrl: string };

export async function getVapiConfig(): Promise<VapiConfig | null> {
  const doctor = await getDoctorRow();
  const apiKey = doctor?.vapiApiKey ? decryptSecret(doctor.vapiApiKey) : env.VAPI_API_KEY;
  const phoneNumberId = doctor?.vapiPhoneNumberId || env.VAPI_PHONE_NUMBER_ID;
  const webhookUrl = doctor?.vapiToolWebhookUrl || env.VAPI_TOOL_WEBHOOK_URL;
  if (!apiKey || !phoneNumberId || !webhookUrl) return null;
  return { apiKey, phoneNumberId, webhookUrl };
}

export type GoogleServiceAccountCredentials = { client_email: string; private_key: string };

export async function getGoogleServiceAccountCredentials(): Promise<GoogleServiceAccountCredentials | null> {
  const doctor = await getDoctorRow();
  if (doctor?.googleServiceAccountJson) {
    return JSON.parse(decryptSecret(doctor.googleServiceAccountJson));
  }
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    return JSON.parse(readFileSync(env.GOOGLE_SERVICE_ACCOUNT_FILE, "utf-8"));
  }
  return null;
}

export async function getGoogleCalendarId(): Promise<string | null> {
  const doctor = await getDoctorRow();
  return doctor?.googleCalendarId ?? null;
}

// --- Status + save, for the Settings → Integrations UI -------------------------------------

export type IntegrationsStatus = {
  whatsapp: { connected: boolean; phoneNumberId: string | null };
  vapi: { connected: boolean; phoneNumberId: string | null; webhookUrl: string | null };
  googleCalendar: { connected: boolean; calendarId: string | null };
};

export async function getIntegrationsStatus(): Promise<IntegrationsStatus> {
  const doctor = await getDoctorRow();
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

async function requireDoctorId(): Promise<string> {
  const doctor = await getDoctorRow();
  if (!doctor) {
    throw new Error("Complete onboarding before connecting integrations.");
  }
  return doctor.id;
}

export type SaveIntegrationInput =
  | { provider: "whatsapp"; phoneNumberId?: string; accessToken?: string; verifyToken?: string }
  | { provider: "vapi"; apiKey?: string; phoneNumberId?: string; webhookUrl?: string }
  | { provider: "googleCalendar"; serviceAccountJson?: string; calendarId?: string };

/** Only the fields present (non-empty) in `input` are updated — leaves the rest untouched. */
export async function saveIntegrationCredentials(
  input: SaveIntegrationInput,
): Promise<IntegrationsStatus> {
  const doctorId = await requireDoctorId();

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

  return getIntegrationsStatus();
}

export async function disconnectIntegration(
  provider: "whatsapp" | "vapi" | "googleCalendar",
): Promise<IntegrationsStatus> {
  const doctorId = await requireDoctorId();

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

  return getIntegrationsStatus();
}
