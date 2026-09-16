import "server-only";
import { db } from "@/lib/db";
import { runAgentTurn } from "./agent-loop";
import { mintToolToken } from "./tool-token";
import { TEST_PATIENT_PHONE } from "../test-patient";

export { TEST_PATIENT_PHONE };

/** Powers the dashboard's "Try it out" page. The caller (the API route) has already proven
 *  tenant identity via the signed-in staff session (requireCurrentDoctor()) — that session is
 *  this function's equivalent of a webhook signature, so minting a token straight from the
 *  given tenantId here is safe, unlike doing so from an unauthenticated caller-supplied id. */
export async function sendTestMessage(tenantId: string, message: string): Promise<string | null> {
  const token = mintToolToken({ tenantId, channel: "whatsapp" });
  return runAgentTurn(token, TEST_PATIENT_PHONE, message);
}

/** Wipes this tenant's test patient entirely — conversation history, bookings, the customer
 *  row itself — so "Try it out" can be replayed from a clean slate (e.g. right before a demo)
 *  instead of the AI still remembering a booking from the last time someone tested it. */
export async function resetTestPatient(tenantId: string): Promise<void> {
  const patient = await db.customer.findUnique({
    where: { tenantId_phone: { tenantId, phone: TEST_PATIENT_PHONE } },
  });
  if (!patient) return;

  await db.conversation.deleteMany({ where: { customerId: patient.id } });
  await db.booking.deleteMany({ where: { customerId: patient.id } }); // cascades BookingEvent
  await db.customer.delete({ where: { id: patient.id } });
}
