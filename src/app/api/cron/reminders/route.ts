import { NextResponse } from "next/server";
import { sendDueReminders } from "@/features/appointments/services/reminder-service";

// Deployment-alternative trigger for serverless hosting (e.g. Vercel Cron) — same
// reminder-service function the in-process node-cron scheduler calls (see instrumentation.ts).
export async function POST() {
  const result = await sendDueReminders();
  return NextResponse.json(result);
}
