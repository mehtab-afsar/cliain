import "server-only";
import { db } from "@/lib/db";
import { runAgentTurn } from "./agent-loop";
import { TEST_PATIENT_PHONE } from "../test-patient";

export { TEST_PATIENT_PHONE };

export async function sendTestMessage(doctorId: string, message: string): Promise<string | null> {
  return runAgentTurn(doctorId, TEST_PATIENT_PHONE, message);
}

/** Wipes this clinic's test patient entirely — conversation history, appointments, the patient
 *  row itself — so "Try it out" can be replayed from a clean slate (e.g. right before a demo)
 *  instead of the AI still remembering a booking from the last time someone tested it. */
export async function resetTestPatient(doctorId: string): Promise<void> {
  const patient = await db.patient.findUnique({
    where: { doctorId_phone: { doctorId, phone: TEST_PATIENT_PHONE } },
  });
  if (!patient) return;

  await db.conversation.deleteMany({ where: { patientId: patient.id } });
  await db.appointment.deleteMany({ where: { patientId: patient.id } }); // cascades AppointmentEvent
  await db.patient.delete({ where: { id: patient.id } });
}
