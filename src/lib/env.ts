import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ANTHROPIC_API_KEY: z.string().optional(),
  INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  // Required to trigger /api/cron/reminders from an external scheduler (e.g. Vercel Cron).
  // The endpoint refuses every request when this isn't set — fails closed, not open.
  CRON_SECRET: z.string().optional(),
  // This deployment's public base URL (e.g. https://cliain.example.com, or an ngrok/
  // cloudflared tunnel in dev) — used to build each clinic's Vapi tool webhook URL
  // (<APP_URL>/api/webhooks/vapi/<doctorId>). No trailing slash.
  APP_URL: z.string().optional(),
  // Rate limiting the public webhook routes (see src/lib/rate-limit.ts) — required on
  // serverless hosting since there's no shared memory between invocations for an in-process
  // limiter. Optional: rate limiting just fails open (disabled) without these.
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  // Error monitoring (sentry.server.config.ts / sentry.edge.config.ts). Optional: Sentry.init
  // no-ops without a DSN, so this is safe to leave unset in local dev.
  SENTRY_DSN: z.string().optional(),
});

function undefinedIfEmpty(value: string | undefined): string | undefined {
  return value ? value : undefined;
}

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ANTHROPIC_API_KEY: undefinedIfEmpty(process.env.ANTHROPIC_API_KEY),
  INTEGRATION_ENCRYPTION_KEY: undefinedIfEmpty(process.env.INTEGRATION_ENCRYPTION_KEY),
  GOOGLE_CLIENT_ID: undefinedIfEmpty(process.env.GOOGLE_CLIENT_ID),
  GOOGLE_CLIENT_SECRET: undefinedIfEmpty(process.env.GOOGLE_CLIENT_SECRET),
  AUTH_SECRET: undefinedIfEmpty(process.env.AUTH_SECRET),
  CRON_SECRET: undefinedIfEmpty(process.env.CRON_SECRET),
  APP_URL: undefinedIfEmpty(process.env.APP_URL),
  UPSTASH_REDIS_REST_URL: undefinedIfEmpty(process.env.UPSTASH_REDIS_REST_URL),
  UPSTASH_REDIS_REST_TOKEN: undefinedIfEmpty(process.env.UPSTASH_REDIS_REST_TOKEN),
  SENTRY_DSN: undefinedIfEmpty(process.env.SENTRY_DSN),
});
