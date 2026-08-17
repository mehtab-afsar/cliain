import "server-only";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import { sendWhatsappTemplate } from "@/features/ai-agent/services/whatsapp-client";
import { placeOutboundCall } from "@/features/ai-agent/services/vapi-client";
import { env } from "@/lib/env";

// Text goes out further ahead as a heads-up; a call goes out closer to the appointment as a
// stronger nudge (and lets the patient reschedule/cancel by voice on the spot). Both are
// independently gated on their own credentials being configured — either can be added or
// removed by flipping `voiceCall` here, no other code changes needed.
const REMINDER_WINDOWS = [
  { field: "reminder24hSentAt", hoursBefore: 24, template: "appointment_reminder_24h", voiceCall: false },
  { field: "reminder2hSentAt", hoursBefore: 2, template: "appointment_reminder_2h", voiceCall: true },
] as const;

const WINDOW_SLACK_MINUTES = 5;

/** The poll job body — called on a recurring interval (see instrumentation.ts). Idempotent. */
export async function sendDueReminders(): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const window of REMINDER_WINDOWS) {
    const target = Date.now() + window.hoursBefore * 60 * 60 * 1000;
    const rangeStart = new Date(target - WINDOW_SLACK_MINUTES * 60 * 1000);
    const rangeEnd = new Date(target + WINDOW_SLACK_MINUTES * 60 * 1000);

    const dueAppointments = await db.appointment.findMany({
      where: {
        status: "booked",
        startAt: { gte: rangeStart, lte: rangeEnd },
        [window.field]: null,
      },
      include: { patient: true, doctor: true },
    });

    for (const appointment of dueAppointments) {
      const local = DateTime.fromJSDate(appointment.startAt, {
        zone: appointment.doctor.timezone,
      });
      const dateLabel = local.toFormat("cccc, LLL d");
      const timeLabel = local.toFormat("h:mm a");
      let anySucceeded = false;

      try {
        await sendWhatsappTemplate(appointment.patient.phone, window.template, "en_US", [
          appointment.patient.name ?? "there",
          appointment.doctor.name,
          dateLabel,
          timeLabel,
        ]);
        anySucceeded = true;
      } catch (error) {
        console.error(
          `[reminder-service] Failed to send ${window.template} for appointment ${appointment.id}:`,
          error,
        );
      }

      if (window.voiceCall && env.VAPI_API_KEY) {
        const call = await placeOutboundCall({
          doctor: appointment.doctor,
          toPhone: appointment.patient.phone,
          patientName: appointment.patient.name,
          callPurpose: `to confirm your appointment on ${dateLabel} at ${timeLabel}`,
        });
        if (call.ok) {
          anySucceeded = true;
        } else {
          console.error(
            `[reminder-service] Failed to place reminder call for appointment ${appointment.id}:`,
            call.error,
          );
        }
      }

      // Mark sent if at least one channel got through — never retry a channel that already
      // succeeded just because another failed (a broken WhatsApp template shouldn't cause the
      // patient to get called again every 5 minutes).
      if (anySucceeded) {
        await db.appointment.update({
          where: { id: appointment.id },
          data: { [window.field]: new Date() },
        });
        sent += 1;
      } else {
        failed += 1;
      }
    }
  }

  return { sent, failed };
}
