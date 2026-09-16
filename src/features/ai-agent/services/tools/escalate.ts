import "server-only";
import { db } from "@/lib/db";
import { getPatientByPhone } from "@/features/patients/services/patient-service";
import { resolveSettings } from "@/features/settings/services/settings-repository";
import { sendWhatsappTemplate } from "../whatsapp-client";
import type { ToolDefinition } from "./types";

type EscalateInput = {
  reason: "emergency" | "patient_requested" | "unresolved";
  note?: string;
};

export const escalateTool: ToolDefinition<EscalateInput> = {
  name: "escalate",
  description:
    "Hand this conversation off to staff and stop automated replies until they've reviewed it. Call this for an emergency (after delivering the exact emergency guidance as your reply), when the {customer} explicitly asks for a human, or when you're unable to help after a couple of attempts.",
  input_schema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        enum: ["emergency", "patient_requested", "unresolved"],
        description: "Why this needs a human.",
      },
      note: { type: "string", description: "Optional short context for staff." },
    },
    required: ["reason"],
  },
  async execute(input, context) {
    const patient = await getPatientByPhone(context.tenantId, context.patientPhone);
    if (!patient) return { ok: false, error: "No record found to escalate." };

    await db.customer.update({
      where: { id: patient.id },
      data: {
        needsHumanReview: true,
        needsHumanReviewReason: input.note ? `${input.reason}: ${input.note}` : input.reason,
        needsHumanReviewAt: new Date(),
      },
    });

    const settings = await resolveSettings(context.tenantId);
    if (settings.safety.escalationWhatsappNumber) {
      // Never lets a missing/unapproved staff-alert template break the handoff itself — the
      // patient-side needsHumanReview flag above is what actually matters and is already set.
      await sendWhatsappTemplate(
        context.tenantId,
        settings.safety.escalationWhatsappNumber,
        "staff_escalation_alert",
        "en_US",
        [patient.name ?? patient.phone, input.reason],
      ).catch((error) => {
        console.error("[escalate] Failed to alert staff:", error);
      });
    }

    return { ok: true };
  },
};
