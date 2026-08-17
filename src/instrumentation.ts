const REMINDER_POLL_CRON = "*/5 * * * *"; // every 5 minutes

declare global {
  var __cliainReminderCronStarted: boolean | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (globalThis.__cliainReminderCronStarted) return;
  globalThis.__cliainReminderCronStarted = true;

  const { default: cron } = await import("node-cron");
  const { sendDueReminders } = await import(
    "@/features/appointments/services/reminder-service"
  );

  cron.schedule(REMINDER_POLL_CRON, async () => {
    try {
      const result = await sendDueReminders();
      if (result.sent > 0 || result.failed > 0) {
        console.log(
          `[reminder-cron] sent=${result.sent} failed=${result.failed}`,
        );
      }
    } catch (error) {
      console.error("[reminder-cron] Poll run failed:", error);
    }
  });

  console.log(`[reminder-cron] Started — polling on "${REMINDER_POLL_CRON}".`);
}
