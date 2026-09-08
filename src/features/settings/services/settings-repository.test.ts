import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resolveSettings, updateSetting, listRecentAudit } from "./settings-repository";

async function createDoctor(overrides: Partial<Parameters<typeof db.doctor.create>[0]["data"]> = {}) {
  return db.doctor.create({
    data: {
      name: "Mehtab",
      title: "Dr.",
      clinicName: "Test Clinic",
      timezone: "UTC",
      emergencyScript: "Call 108 immediately.",
      escalationWhatsappNumber: "+15550001111",
      ...overrides,
    },
  });
}

async function cleanup(doctorId: string) {
  await db.settingsAudit.deleteMany({ where: { doctorId } });
  await db.clinicSettings.deleteMany({ where: { doctorId } });
  await db.doctor.delete({ where: { id: doctorId } });
}

describe("resolveSettings", () => {
  let doctorId: string | undefined;

  afterEach(async () => {
    if (doctorId) await cleanup(doctorId);
    doctorId = undefined;
  });

  it("falls back to Doctor columns when no ClinicSettings row exists yet", async () => {
    const doctor = await createDoctor();
    doctorId = doctor.id;

    const settings = await resolveSettings(doctor.id);

    expect(settings.clinic.name).toBe("Test Clinic");
    expect(settings.doctors[0].name).toBe("Mehtab");
    expect(settings.doctors[0].title).toBe("Dr.");
    // The exact backfill case: Doctor.emergencyScript migrates into safety.emergencyScript.
    expect(settings.safety.emergencyScript).toBe("Call 108 immediately.");
    expect(settings.safety.escalationWhatsappNumber).toBe("+15550001111");
    expect(settings.messaging.tone).toBe("friendly");
    expect(settings.messaging.disclosureEnabled).toBe(true);
  });

  it("merges a partial stored document over the defaults, section by section", async () => {
    const doctor = await createDoctor();
    doctorId = doctor.id;

    // Only messaging.tone stored — everything else should still resolve from Doctor fallback.
    await db.clinicSettings.create({
      data: { doctorId: doctor.id, data: { messaging: { tone: "formal" } } },
    });

    const settings = await resolveSettings(doctor.id);

    expect(settings.messaging.tone).toBe("formal");
    expect(settings.messaging.disclosureEnabled).toBe(true); // still the default
    expect(settings.clinic.name).toBe("Test Clinic"); // still from the Doctor row
  });
});

describe("updateSetting", () => {
  let doctorId: string | undefined;

  afterEach(async () => {
    if (doctorId) await cleanup(doctorId);
    doctorId = undefined;
  });

  it("writes the document and an audit row together", async () => {
    const doctor = await createDoctor();
    doctorId = doctor.id;

    const updated = await updateSetting(doctor.id, "messaging.tone", "neutral", "staff:u1");
    expect(updated.messaging.tone).toBe("neutral");

    const reread = await resolveSettings(doctor.id);
    expect(reread.messaging.tone).toBe("neutral");

    const audit = await listRecentAudit(doctor.id, "messaging.");
    expect(audit).toHaveLength(1);
    expect(audit[0].field).toBe("messaging.tone");
    expect(audit[0].newValue).toBe("neutral");
    expect(audit[0].actor).toBe("staff:u1");
  });

  it("title-cases name-like fields on save", async () => {
    const doctor = await createDoctor();
    doctorId = doctor.id;

    const updated = await updateSetting(doctor.id, "clinic.name", "mehtab family clinic", "staff:u1");
    expect(updated.clinic.name).toBe("Mehtab Family Clinic");
  });

  it("records the correct old value on a second change to the same field", async () => {
    const doctor = await createDoctor();
    doctorId = doctor.id;

    await updateSetting(doctor.id, "messaging.tone", "neutral", "staff:u1");
    await updateSetting(doctor.id, "messaging.tone", "formal", "staff:u1");

    const audit = await listRecentAudit(doctor.id, "messaging.tone");
    expect(audit).toHaveLength(2);
    // Most recent first.
    expect(audit[0].oldValue).toBe("neutral");
    expect(audit[0].newValue).toBe("formal");
  });
});
