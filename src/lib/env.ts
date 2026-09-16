import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ANTHROPIC_API_KEY: z.string().optional(),
  // OpenAI failover for the model router (src/lib/model-router) — Anthropic is primary, this
  // is only ever called when Anthropic fails or its circuit is open (see circuit-breaker.ts).
  OPENAI_API_KEY: z.string().optional(),
  // Overrides the default OpenAI model used for failover completions (see providers/openai.ts)
  // — pick whichever current model has full tool-calling support for your target cost/latency.
  OPENAI_AGENT_MODEL: z.string().optional(),
  INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  // Signs the short-lived tool session tokens the Tool Gateway mints after a webhook's own
  // signature check succeeds (see tool-token.ts) — the thing that actually binds a tool call
  // to a tenant, instead of trusting a caller-supplied id. Deliberately its own secret, not
  // reused from AUTH_SECRET or INTEGRATION_ENCRYPTION_KEY: those protect different things
  // (dashboard sessions, stored credentials), and mixing security domains means rotating one
  // for an incident silently weakens the others. Generate with `openssl rand -base64 32`.
  TOOL_TOKEN_SECRET: z.string().optional(),
  // Cliain's own Vapi account — phone calls are platform-hosted, not a per-clinic credential.
  // A clinic clicking "Enable phone calls" in Settings provisions a number on THIS key (see
  // vapi-provisioning.ts); no clinic ever sees or holds a Vapi API key of their own.
  VAPI_API_KEY: z.string().optional(),
  // Required to trigger /api/cron/reminders from an external scheduler (e.g. Vercel Cron).
  // The endpoint refuses every request when this isn't set — fails closed, not open.
  CRON_SECRET: z.string().optional(),
  // This deployment's own base URL (e.g. https://cliain.example.com) — used to build each
  // clinic's WhatsApp webhook URL and the Google Calendar OAuth callback. Both of those are
  // either browser-mediated (Calendar) or configured once directly in a dashboard you paste
  // the URL into yourself (WhatsApp), so this is safe to leave as a plain localhost URL in
  // dev. No trailing slash.
  APP_URL: z.string().optional(),
  // Where VAPI'S SERVERS reach back into this app — genuinely different from APP_URL above,
  // because this one has to be reachable from the public internet even in local dev (a real
  // tunnel like cloudflared/ngrok), while APP_URL can just be localhost. Falls back to
  // APP_URL when unset, so a real deployment (where both are the same real domain) never needs
  // to set this separately — only local dev testing a live call does. See vapiPublicUrl()
  // below.
  VAPI_PUBLIC_URL: z.string().optional(),
  // Where GOOGLE'S SERVERS reach back into this app for Calendar push notifications
  // (events.watch) — same "must be a real public HTTPS URL, not localhost" constraint as
  // VAPI_PUBLIC_URL above, and independently tunneled since Vapi and Google may be tested at
  // different times (though both can share one cloudflared tunnel, just two env vars pointed
  // at it). Falls back to APP_URL when unset, so a real deployment never needs to set this
  // separately. Google additionally requires HTTPS — a bare localhost APP_URL fallback makes
  // events.watch fail outright, which startWatchingCalendar catches and treats as "no live
  // sync available", not a crash. See calendarWebhookUrl() below.
  GOOGLE_CALENDAR_WEBHOOK_URL: z.string().optional(),
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
  OPENAI_API_KEY: undefinedIfEmpty(process.env.OPENAI_API_KEY),
  OPENAI_AGENT_MODEL: undefinedIfEmpty(process.env.OPENAI_AGENT_MODEL),
  INTEGRATION_ENCRYPTION_KEY: undefinedIfEmpty(process.env.INTEGRATION_ENCRYPTION_KEY),
  GOOGLE_CLIENT_ID: undefinedIfEmpty(process.env.GOOGLE_CLIENT_ID),
  GOOGLE_CLIENT_SECRET: undefinedIfEmpty(process.env.GOOGLE_CLIENT_SECRET),
  AUTH_SECRET: undefinedIfEmpty(process.env.AUTH_SECRET),
  TOOL_TOKEN_SECRET: undefinedIfEmpty(process.env.TOOL_TOKEN_SECRET),
  VAPI_API_KEY: undefinedIfEmpty(process.env.VAPI_API_KEY),
  CRON_SECRET: undefinedIfEmpty(process.env.CRON_SECRET),
  APP_URL: undefinedIfEmpty(process.env.APP_URL),
  VAPI_PUBLIC_URL: undefinedIfEmpty(process.env.VAPI_PUBLIC_URL),
  GOOGLE_CALENDAR_WEBHOOK_URL: undefinedIfEmpty(process.env.GOOGLE_CALENDAR_WEBHOOK_URL),
  UPSTASH_REDIS_REST_URL: undefinedIfEmpty(process.env.UPSTASH_REDIS_REST_URL),
  UPSTASH_REDIS_REST_TOKEN: undefinedIfEmpty(process.env.UPSTASH_REDIS_REST_TOKEN),
  SENTRY_DSN: undefinedIfEmpty(process.env.SENTRY_DSN),
});

/** The URL Vapi's servers must be able to reach — VAPI_PUBLIC_URL if set, otherwise APP_URL.
 *  Never import env.APP_URL directly for a Vapi webhook URL; always go through this. */
export function vapiPublicUrl(): string | undefined {
  return env.VAPI_PUBLIC_URL ?? env.APP_URL;
}

/** The URL Google's servers must be able to reach to deliver Calendar push notifications —
 *  GOOGLE_CALENDAR_WEBHOOK_URL if set, otherwise APP_URL. Same shape as vapiPublicUrl() above. */
export function calendarWebhookUrl(): string | undefined {
  return env.GOOGLE_CALENDAR_WEBHOOK_URL ?? env.APP_URL;
}
