import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resolveSettings, updateSetting, listRecentAudit } from "./settings-repository";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";
import type { ClinicSettingsData } from "../schema";

async function createDoctor(overrides: Partial<Parameters<typeof db.tenant.create>[0]["data"]> = {}) {
  const doctor = await db.tenant.create({
    data: {
      clinicName: "Test Clinic",
      timezone: "UTC",
      emergencyScript: "Call 108 immediately.",
      escalationWhatsappNumber: "+15550001111",
      ...overrides,
    },
  });
  const location = await db.location.create({ data: { tenantId: doctor.id, timezone: "UTC" } });
  await db.resource.create({
    data: { tenantId: doctor.id, locationId: location.id, type: "practitioner", name: "Mehtab", title: "Dr." },
  });
  return doctor;
}

async function cleanup(doctorId: string) {
  await db.settingsAudit.deleteMany({ where: { tenantId: doctorId } });
  await db.clinicSettings.deleteMany({ where: { tenantId: doctorId } });
  await db.tenant.delete({ where: { id: doctorId } });
}

describe("resolveSettings (common projection)", () => {
  let doctorId: string | undefined;

  afterEach(async () => {
    if (doctorId) await cleanup(doctorId);
    doctorId = undefined;
  });

  it("falls back to Tenant/Resource columns when no ClinicSettings row exists yet", async () => {
    const doctor = await createDoctor();
    doctorId = doctor.id;

    const settings = await resolveSettings(doctor.id);

    expect(settings.business.name).toBe("Test Clinic");
    expect(settings.primaryResource.name).toBe("Mehtab");
    expect(settings.primaryResource.title).toBe("Dr.");
    // The exact backfill case: Tenant.emergencyScript migrates into safety.escalationScript.
    expect(settings.safety.escalationScript).toBe("Call 108 immediately.");
    expect(settings.safety.escalationWhatsappNumber).toBe("+15550001111");
    expect(settings.messaging.tone).toBe("friendly");
    expect(settings.messaging.disclosureEnabled).toBe(true);
  });

  it("merges a partial stored document over the defaults, section by section", async () => {
    const doctor = await createDoctor();
    doctorId = doctor.id;

    // Only messaging.tone stored — everything else should still resolve from Tenant fallback.
    await db.clinicSettings.create({
      data: { tenantId: doctor.id, data: { messaging: { tone: "formal" } } },
    });

    const settings = await resolveSettings(doctor.id);

    expect(settings.messaging.tone).toBe("formal");
    expect(settings.messaging.disclosureEnabled).toBe(true); // still the default
    expect(settings.business.name).toBe("Test Clinic"); // still from the Tenant row
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

    const updated = (await updateSetting(doctor.id, "messaging.tone", "neutral", "staff:u1")) as ClinicSettingsData;
    expect(updated.messaging.tone).toBe("neutral");

    const { settings: reread } = await resolveTenantConfig(doctor.id);
    expect((reread as ClinicSettingsData).messaging.tone).toBe("neutral");

    const audit = await listRecentAudit(doctor.id, "messaging.");
    expect(audit).toHaveLength(1);
    expect(audit[0].field).toBe("messaging.tone");
    expect(audit[0].newValue).toBe("neutral");
    expect(audit[0].actor).toBe("staff:u1");
  });

  it("title-cases name-like fields on save", async () => {
    const doctor = await createDoctor();
    doctorId = doctor.id;

    const updated = (await updateSetting(
      doctor.id,
      "clinic.name",
      "mehtab family clinic",
      "staff:u1",
    )) as ClinicSettingsData;
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
