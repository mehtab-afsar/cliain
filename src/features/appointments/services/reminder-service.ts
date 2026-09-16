import "server-only";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import { sendWhatsappTemplate } from "@/features/ai-agent/services/whatsapp-client";
import { placeOutboundCall } from "@/features/ai-agent/services/vapi-client";
import { getVapiConfig } from "@/lib/integration-credentials";
import { resolveTimezone } from "@/lib/timezone";
import { resolveTemplateForTenant } from "@/features/templates/registry";

// Text goes out further ahead as a heads-up; a call goes out closer to the appointment as a
// stronger nudge (and lets the customer reschedule/cancel by voice on the spot). Both are
// independently gated on their own credentials being configured — either can be added or
// removed by flipping `voiceCall` here, no other code changes needed.
//
// `template` picks the tenant's own template's `whatsappReminderTemplates.h24`/`.h2` (a Meta-
// approved WhatsApp template NAME, not the message body itself — Meta template bodies are fixed
// text approved ahead of time; this code only fills in `{{1}}..{{4}}` placeholders). Every
// vertical needs its own approved template before reminders will actually send for it — see
// TemplateContent.whatsappReminderTemplates's doc comment.
const REMINDER_WINDOWS = [
  { field: "reminder24hSentAt", hoursBefore: 24, templateKey: "h24", voiceCall: false },
  { field: "reminder2hSentAt", hoursBefore: 2, templateKey: "h2", voiceCall: true },
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

    const dueBookings = await db.booking.findMany({
      where: {
        status: "booked",
        startAt: { gte: rangeStart, lte: rangeEnd },
        [window.field]: null,
      },
      include: { customer: true, tenant: true, resource: { include: { location: true } } },
    });

    for (const booking of dueBookings) {
      const template = resolveTemplateForTenant(booking.tenant);
      const templateName = template.whatsappReminderTemplates[window.templateKey];
      const local = DateTime.fromJSDate(booking.startAt, {
        zone: resolveTimezone(booking.resource.location.timezone ?? booking.tenant.timezone),
      });
      const dateLabel = local.toFormat("cccc, LLL d");
      const timeLabel = local.toFormat("h:mm a");
      let anySucceeded = false;

      try {
        await sendWhatsappTemplate(booking.tenantId, booking.customer.phone, templateName, "en_US", [
          booking.customer.name ?? "there",
          booking.resource.name,
          dateLabel,
          timeLabel,
        ]);
        anySucceeded = true;
      } catch (error) {
        console.error(
          `[reminder-service] Failed to send ${templateName} for booking ${booking.id}:`,
          error,
        );
      }

      const vapiConfigured = window.voiceCall ? Boolean(await getVapiConfig(booking.tenantId)) : false;
      if (vapiConfigured) {
        const call = await placeOutboundCall({
          doctor: booking.tenant,
          toPhone: booking.customer.phone,
          patientName: booking.customer.name,
          callPurpose: `to confirm your ${template.terms.booking} on ${dateLabel} at ${timeLabel}`,
        });
        if (call.ok) {
          anySucceeded = true;
        } else {
          console.error(
            `[reminder-service] Failed to place reminder call for booking ${booking.id}:`,
            call.error,
          );
        }
      }

      // Mark sent if at least one channel got through — never retry a channel that already
      // succeeded just because another failed (a broken WhatsApp template shouldn't cause the
      // customer to get called again every 5 minutes).
      if (anySucceeded) {
        await db.booking.update({
          where: { id: booking.id },
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
