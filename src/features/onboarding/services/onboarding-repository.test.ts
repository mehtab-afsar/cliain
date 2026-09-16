import { afterEach, describe, expect, it } from "vitest";
import type { Tenant } from "@prisma/client";
import { db } from "@/lib/db";
import { createTenant, getOnboardingDraft, updateTenant } from "./onboarding-repository";
import type { OnboardingDraft } from "../types";
import { WEEKDAY_LABELS } from "../types";
import { getDraftTemplateVersion } from "../step-registry";

/** Test-only read of the real Tenant columns this suite exists to verify got written
 *  correctly by createTenant() — the one sanctioned place in this file allowed to read them
 *  directly (same composition-root role as getTenantTemplateVersion() in
 *  onboarding-repository.ts and getDraftTemplateVersion() in step-registry.ts). */
function readTenantTemplateColumns(tenant: Pick<Tenant, "vertical" | "templateVersion">) {
  // eslint-disable-next-line no-restricted-syntax -- test assertion on real Tenant columns, see doc comment above
  return { vertical: tenant.vertical, templateVersion: tenant.templateVersion };
}

function workingHours() {
  return WEEKDAY_LABELS.map((label, dayOfWeek) => ({
    dayOfWeek,
    label,
    isOpen: dayOfWeek >= 1 && dayOfWeek <= 5,
    startTime: "09:00",
    endTime: "17:00",
  }));
}

async function createUser() {
  return db.user.create({ data: { email: `onboarding-repo-${Date.now()}-${Math.random()}@example.com` } });
}

async function cleanup(tenantId: string): Promise<void> {
  await db.booking.deleteMany({ where: { tenantId } });
  await db.session.deleteMany({ where: { tenantId } });
  await db.tenant.delete({ where: { id: tenantId } });
}

describe("onboarding-repository", () => {
  let tenantIdToCleanup: string | null = null;

  afterEach(async () => {
    if (tenantIdToCleanup) {
      await cleanup(tenantIdToCleanup);
      tenantIdToCleanup = null;
    }
  });

  it("createTenant on a clinic-v1 draft creates an appointment-mode offering, unchanged from before gym-v1 existed", async () => {
    const user = await createUser();
    const draft: OnboardingDraft = {
      templateVersion: "clinic-v1",
      clinicBasics: { clinicName: "Test Clinic", timezone: "UTC" },
      doctorProfile: { doctorName: "Dr. Test", specialty: "Cardiology", whatsappNumber: "+15551234567" },
      workingHours: workingHours(),
      completedAt: null,
    };

    const { draft: saved, doctorId } = await createTenant(user.id, draft);
    tenantIdToCleanup = doctorId;

    expect(getDraftTemplateVersion(saved)).toBe("clinic-v1");
    expect(saved.clinicBasics?.clinicName).toBe("Test Clinic");
    expect(saved.doctorProfile?.doctorName).toBe("Dr. Test");
    expect(saved.doctorProfile?.specialty).toBe("Cardiology");

    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: doctorId } });
    expect(readTenantTemplateColumns(tenant)).toEqual({ vertical: "clinic", templateVersion: "clinic-v1" });

    const offering = await db.offering.findFirstOrThrow({ where: { tenantId: doctorId } });
    expect(offering.mode).toBe("appointment");
    expect(offering.name).toBe("Consultation");
    expect(offering.durationMinutes).toBe(30);

    const sessions = await db.session.findMany({ where: { tenantId: doctorId } });
    expect(sessions).toHaveLength(0);
  });

  it("createTenant on a gym-v1 draft creates a class-mode offering and bulk-creates upcoming Session rows", async () => {
    const user = await createUser();
    const draft: OnboardingDraft = {
      templateVersion: "gym-v1",
      gymBasics: { gymName: "Test Gym", timezone: "UTC" },
      trainerProfile: { trainerName: "Coach Test", role: "Head Coach", whatsappNumber: "+15559876543" },
      classSetup: { className: "Spin", durationMinutes: 45, capacity: 15, dayOfWeek: 2, startTime: "18:00" },
      workingHours: workingHours(),
      completedAt: null,
    };

    const { draft: saved, doctorId } = await createTenant(user.id, draft);
    tenantIdToCleanup = doctorId;

    expect(getDraftTemplateVersion(saved)).toBe("gym-v1");
    expect(saved.gymBasics?.gymName).toBe("Test Gym");
    expect(saved.trainerProfile?.trainerName).toBe("Coach Test");
    expect(saved.classSetup?.className).toBe("Spin");
    expect(saved.classSetup?.capacity).toBe(15);

    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: doctorId } });
    expect(readTenantTemplateColumns(tenant)).toEqual({ vertical: "gym", templateVersion: "gym-v1" });

    const offering = await db.offering.findFirstOrThrow({ where: { tenantId: doctorId } });
    expect(offering.mode).toBe("class");
    expect(offering.name).toBe("Spin");
    expect(offering.defaultCapacity).toBe(15);

    const sessions = await db.session.findMany({ where: { tenantId: doctorId }, orderBy: { startAt: "asc" } });
    expect(sessions).toHaveLength(4);
    for (const session of sessions) {
      expect(session.capacity).toBe(15);
      expect(session.startAt.getUTCDay()).toBe(2); // Tuesday, tenant timezone is UTC
      expect(session.endAt.getTime() - session.startAt.getTime()).toBe(45 * 60 * 1000);
    }
    // Weekly cadence, all in the future.
    const now = new Date();
    for (const session of sessions) {
      expect(session.startAt.getTime()).toBeGreaterThan(now.getTime());
    }
    for (let i = 1; i < sessions.length; i += 1) {
      const gapMs = sessions[i].startAt.getTime() - sessions[i - 1].startAt.getTime();
      expect(gapMs).toBe(7 * 24 * 60 * 60 * 1000);
    }
  });

  it("a bulk-created class Session is actually bookable end to end (proves the onboarding->booking seam works, not just each half in isolation)", async () => {
    const { checkAvailability } = await import("@/features/appointments/services/availability-service");
    const { bookAppointment } = await import("@/features/appointments/services/appointment-service");

    const user = await createUser();
    const draft: OnboardingDraft = {
      templateVersion: "gym-v1",
      gymBasics: { gymName: "Bookable Gym", timezone: "UTC" },
      trainerProfile: { trainerName: "Coach Bookable", role: "Coach", whatsappNumber: "" },
      classSetup: { className: "HIIT", durationMinutes: 30, capacity: 2, dayOfWeek: 3, startTime: "07:00" },
      workingHours: workingHours(),
      completedAt: null,
    };
    const { doctorId } = await createTenant(user.id, draft);
    tenantIdToCleanup = doctorId;

    const session = await db.session.findFirstOrThrow({ where: { tenantId: doctorId }, orderBy: { startAt: "asc" } });
    const dateStr = session.startAt.toISOString().slice(0, 10);

    const slots = await checkAvailability(doctorId, { date: dateStr });
    const matchingSlot = slots.find((slot) => slot.sessionId === session.id);
    expect(matchingSlot).toBeDefined();
    expect(matchingSlot?.remainingCapacity).toBe(2);

    const patient = await db.customer.create({ data: { tenantId: doctorId, phone: `+1555${Date.now()}` } });
    const booking = await bookAppointment(
      doctorId,
      {
        patientId: patient.id,
        startAt: session.startAt.toISOString(),
        endAt: session.endAt.toISOString(),
        sessionId: session.id,
        partySize: 1,
      },
      { actor: "test" },
    );
    expect(booking.sessionId).toBe(session.id);
    expect(booking.partySize).toBe(1);
  });

  it("getOnboardingDraft round-trips a gym tenant's draft, approximating classSetup from the earliest Session", async () => {
    const user = await createUser();
    const draft: OnboardingDraft = {
      templateVersion: "gym-v1",
      gymBasics: { gymName: "Roundtrip Gym", timezone: "UTC" },
      trainerProfile: { trainerName: "Coach Roundtrip", role: "", whatsappNumber: "" },
      classSetup: { className: "Yoga", durationMinutes: 60, capacity: 8, dayOfWeek: 5, startTime: "09:30" },
      workingHours: workingHours(),
      completedAt: null,
    };
    const { doctorId } = await createTenant(user.id, draft);
    tenantIdToCleanup = doctorId;

    const reloaded = await getOnboardingDraft(doctorId);
    expect(reloaded && getDraftTemplateVersion(reloaded)).toBe("gym-v1");
    expect(reloaded?.classSetup?.className).toBe("Yoga");
    expect(reloaded?.classSetup?.capacity).toBe(8);
    expect(reloaded?.classSetup?.durationMinutes).toBe(60);
  });

  it("updateTenant on an existing gym tenant updates the trainer resource without touching classSetup/Sessions", async () => {
    const user = await createUser();
    const draft: OnboardingDraft = {
      templateVersion: "gym-v1",
      gymBasics: { gymName: "Update Gym", timezone: "UTC" },
      trainerProfile: { trainerName: "Coach Before", role: "Coach", whatsappNumber: "" },
      classSetup: { className: "Boxing", durationMinutes: 45, capacity: 10, dayOfWeek: 1, startTime: "17:00" },
      workingHours: workingHours(),
      completedAt: null,
    };
    const { doctorId } = await createTenant(user.id, draft);
    tenantIdToCleanup = doctorId;
    const sessionCountBefore = await db.session.count({ where: { tenantId: doctorId } });

    const current = await getOnboardingDraft(doctorId);
    expect(current).not.toBeNull();
    const updated = await updateTenant(doctorId, {
      ...current!,
      trainerProfile: { trainerName: "Coach After", role: "Head Coach", whatsappNumber: "+15550001111" },
    });

    expect(updated.trainerProfile?.trainerName).toBe("Coach After");
    const resource = await db.resource.findFirstOrThrow({ where: { tenantId: doctorId } });
    expect(resource.name).toBe("Coach After");

    const sessionCountAfter = await db.session.count({ where: { tenantId: doctorId } });
    expect(sessionCountAfter).toBe(sessionCountBefore);
  });
});
