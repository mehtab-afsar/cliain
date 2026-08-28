import * as Sentry from "@sentry/nextjs";

// No-ops if SENTRY_DSN isn't set (e.g. local dev) — nothing else here needs to branch on that.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
