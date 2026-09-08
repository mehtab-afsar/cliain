import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { runTool } from "./index";

async function createDoctorAndPatient() {
  const doctor = await db.doctor.create({ data: { name: "Dr. Test", timezone: "UTC" } });
  const patient = await db.patient.create({
    data: { doctorId: doctor.id, phone: `+1555${Date.now()}${Math.floor(Math.random() * 1000)}` },
  });
  return { doctor, patient };
}

async function cleanup(doctorId: string) {
  await db.appointment.deleteMany({ where: { doctorId } });
  await db.doctor.delete({ where: { id: doctorId } });
}

describe("escalate + runTool", () => {
  let doctorId: string | undefined;

  afterEach(async () => {
    if (doctorId) await cleanup(doctorId);
    doctorId = undefined;
  });

  it("sets needsHumanReview on the patient", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    await runTool(
      "escalate",
      { reason: "emergency", note: "chest pain" },
      { patientPhone: patient.phone, doctorId: doctor.id, channel: "whatsapp" },
    );

    const updated = await db.patient.findUniqueOrThrow({ where: { id: patient.id } });
    expect(updated.needsHumanReview).toBe(true);
    expect(updated.needsHumanReviewReason).toContain("emergency");
    expect(updated.needsHumanReviewAt).not.toBeNull();
  });

  it("short-circuits every subsequent tool call once escalated", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    await runTool(
      "escalate",
      { reason: "patient_requested" },
      { patientPhone: patient.phone, doctorId: doctor.id, channel: "voice" },
    );

    const result = (await runTool(
      "get_patient",
      {},
      { patientPhone: patient.phone, doctorId: doctor.id, channel: "voice" },
    )) as { error?: string };

    expect(result.error).toContain("handed off to clinic staff");
  });

  it("still lets escalate itself run again once already escalated", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;

    await runTool(
      "escalate",
      { reason: "unresolved" },
      { patientPhone: patient.phone, doctorId: doctor.id, channel: "whatsapp" },
    );

    const second = (await runTool(
      "escalate",
      { reason: "emergency", note: "escalated again" },
      { patientPhone: patient.phone, doctorId: doctor.id, channel: "whatsapp" },
    )) as { ok?: boolean };

    expect(second.ok).toBe(true);
    const updated = await db.patient.findUniqueOrThrow({ where: { id: patient.id } });
    expect(updated.needsHumanReviewReason).toContain("escalated again");
  });
});
