const REMINDER_POLL_CRON = "*/5 * * * *"; // every 5 minutes

declare global {
  var __cliainReminderCronStarted: boolean | undefined;
}

export async function register() {
  // No-ops without SENTRY_DSN set — see sentry.server.config.ts / sentry.edge.config.ts.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }

  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // On Vercel (or any serverless host), every separately-warmed instance has its own
  // globalThis — the guard below wouldn't stop multiple instances from each starting their
  // own 5-minute poller, which can double-send a reminder to the same patient. Serverless
  // hosts must instead hit /api/cron/reminders from an external scheduler (see CRON_SECRET
  // in .env.example and the GitHub Actions workflow at .github/workflows/reminders.yml).
  if (process.env.VERCEL) return;
  if (globalThis.__cliainReminderCronStarted) return;
  globalThis.__cliainReminderCronStarted = true;

  const { default: cron } = await import("node-cron");
  const { runScheduledJobs } = await import(
    "@/features/appointments/services/scheduler-service"
  );

  cron.schedule(REMINDER_POLL_CRON, async () => {
    try {
      const { reminders, lifecycle } = await runScheduledJobs();
      if (reminders.sent > 0 || reminders.failed > 0 || lifecycle.completed > 0 || lifecycle.noShow > 0) {
        console.log(
          `[reminder-cron] sent=${reminders.sent} failed=${reminders.failed} completed=${lifecycle.completed} noShow=${lifecycle.noShow}`,
        );
      }
    } catch (error) {
      console.error("[reminder-cron] Poll run failed:", error);
    }
  });

  console.log(`[reminder-cron] Started — polling on "${REMINDER_POLL_CRON}".`);
}

export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) {
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);
}
