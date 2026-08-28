import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendDueReminders } from "@/features/appointments/services/reminder-service";

// Deployment-alternative trigger for serverless hosting (e.g. Vercel Cron) — same
// reminder-service function the in-process node-cron scheduler calls (see instrumentation.ts).
// Fails closed: with no CRON_SECRET set, this endpoint refuses every request rather than
// letting anyone on the internet trigger real outbound texts/calls. The in-process scheduler
// doesn't call this route at all, so local dev is unaffected either way.
export async function POST(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueReminders();
  return NextResponse.json(result);
}
