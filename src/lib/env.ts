import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ANTHROPIC_API_KEY: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_FILE: z.string().optional(),
  VAPI_API_KEY: z.string().optional(),
  VAPI_PHONE_NUMBER_ID: z.string().optional(),
  VAPI_TOOL_WEBHOOK_URL: z.string().optional(),
  INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
});

function undefinedIfEmpty(value: string | undefined): string | undefined {
  return value ? value : undefined;
}

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ANTHROPIC_API_KEY: undefinedIfEmpty(process.env.ANTHROPIC_API_KEY),
  WHATSAPP_PHONE_NUMBER_ID: undefinedIfEmpty(process.env.WHATSAPP_PHONE_NUMBER_ID),
  WHATSAPP_ACCESS_TOKEN: undefinedIfEmpty(process.env.WHATSAPP_ACCESS_TOKEN),
  WHATSAPP_VERIFY_TOKEN: undefinedIfEmpty(process.env.WHATSAPP_VERIFY_TOKEN),
  GOOGLE_SERVICE_ACCOUNT_JSON: undefinedIfEmpty(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  GOOGLE_SERVICE_ACCOUNT_FILE: undefinedIfEmpty(process.env.GOOGLE_SERVICE_ACCOUNT_FILE),
  VAPI_API_KEY: undefinedIfEmpty(process.env.VAPI_API_KEY),
  VAPI_PHONE_NUMBER_ID: undefinedIfEmpty(process.env.VAPI_PHONE_NUMBER_ID),
  VAPI_TOOL_WEBHOOK_URL: undefinedIfEmpty(process.env.VAPI_TOOL_WEBHOOK_URL),
  INTEGRATION_ENCRYPTION_KEY: undefinedIfEmpty(process.env.INTEGRATION_ENCRYPTION_KEY),
  GOOGLE_CLIENT_ID: undefinedIfEmpty(process.env.GOOGLE_CLIENT_ID),
  GOOGLE_CLIENT_SECRET: undefinedIfEmpty(process.env.GOOGLE_CLIENT_SECRET),
  AUTH_SECRET: undefinedIfEmpty(process.env.AUTH_SECRET),
});
