import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { mintToolToken } from "../tool-token";
import { runTool } from "./index";

async function createDoctorAndPatient() {
  const doctor = await db.tenant.create({ data: { timezone: "UTC" } });
  const location = await db.location.create({ data: { tenantId: doctor.id, timezone: "UTC" } });
  await db.resource.create({
    data: { tenantId: doctor.id, locationId: location.id, type: "practitioner", name: "Dr. Test" },
  });
  const patient = await db.customer.create({
    data: { tenantId: doctor.id, phone: `+1555${Date.now()}${Math.floor(Math.random() * 1000)}` },
  });
  return { doctor, patient };
}

async function cleanup(tenantId: string) {
  await db.booking.deleteMany({ where: { tenantId } });
  await db.tenant.delete({ where: { id: tenantId } });
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
    const token = mintToolToken({ tenantId: doctor.id, channel: "whatsapp" });

    await runTool("escalate", { reason: "emergency", note: "chest pain" }, token, patient.phone);

    const updated = await db.customer.findUniqueOrThrow({ where: { id: patient.id } });
    expect(updated.needsHumanReview).toBe(true);
    expect(updated.needsHumanReviewReason).toContain("emergency");
    expect(updated.needsHumanReviewAt).not.toBeNull();
  });

  it("short-circuits every subsequent tool call once escalated", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;
    const token = mintToolToken({ tenantId: doctor.id, channel: "voice" });

    await runTool("escalate", { reason: "patient_requested" }, token, patient.phone);

    const result = (await runTool("get_patient", {}, token, patient.phone)) as { error?: string };

    expect(result.error).toContain("handed off to clinic staff");
  });

  it("still lets escalate itself run again once already escalated", async () => {
    const { doctor, patient } = await createDoctorAndPatient();
    doctorId = doctor.id;
    const token = mintToolToken({ tenantId: doctor.id, channel: "whatsapp" });

    await runTool("escalate", { reason: "unresolved" }, token, patient.phone);

    const second = (await runTool(
      "escalate",
      { reason: "emergency", note: "escalated again" },
      token,
      patient.phone,
    )) as { ok?: boolean };

    expect(second.ok).toBe(true);
    const updated = await db.customer.findUniqueOrThrow({ where: { id: patient.id } });
    expect(updated.needsHumanReviewReason).toContain("escalated again");
  });
});
