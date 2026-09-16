import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { sendDueReminders } from "./reminder-service";

const sendWhatsappTemplateMock = vi.fn().mockResolvedValue({ ok: true });

vi.mock("@/features/ai-agent/services/whatsapp-client", () => ({
  sendWhatsappTemplate: (...args: unknown[]) => sendWhatsappTemplateMock(...args),
}));

async function createTenantWithDueBooking(overrides: { tenantVertical?: string; tenantTemplateVersion?: string } = {}) {
  const tenant = await db.tenant.create({
    data: {
      timezone: "UTC",
      vertical: overrides.tenantVertical,
      templateVersion: overrides.tenantTemplateVersion,
    },
  });
  const location = await db.location.create({ data: { tenantId: tenant.id, timezone: "UTC" } });
  const resource = await db.resource.create({
    data: { tenantId: tenant.id, locationId: location.id, type: "practitioner", name: "Resource" },
  });
  const offering = await db.offering.create({
    data: { tenantId: tenant.id, name: "Consultation", durationMinutes: 30, resourceType: "practitioner" },
  });
  const customer = await db.customer.create({
    data: { tenantId: tenant.id, phone: `+1555${Date.now()}${Math.floor(Math.random() * 1000)}`, name: "Test Customer" },
  });
  // Inside the 24h reminder window's slack (target ± 5 minutes) — well clear of the 2h window.
  const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const booking = await db.booking.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      resourceId: resource.id,
      offeringId: offering.id,
      startAt,
      endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
      status: "booked",
    },
  });
  return { tenant, booking };
}

async function cleanup(tenantId: string): Promise<void> {
  await db.booking.deleteMany({ where: { tenantId } });
  await db.tenant.delete({ where: { id: tenantId } });
}

describe("reminder-service", () => {
  let tenantIdToCleanup: string | null = null;

  afterEach(async () => {
    sendWhatsappTemplateMock.mockClear();
    if (tenantIdToCleanup) {
      await cleanup(tenantIdToCleanup);
      tenantIdToCleanup = null;
    }
  });

  it("sends the clinic-v1 tenant's own approved WhatsApp template name", async () => {
    const { tenant } = await createTenantWithDueBooking({ tenantVertical: "clinic", tenantTemplateVersion: "clinic-v1" });
    tenantIdToCleanup = tenant.id;

    await sendDueReminders();

    expect(sendWhatsappTemplateMock).toHaveBeenCalledWith(
      tenant.id,
      expect.any(String),
      "appointment_reminder_24h",
      "en_US",
      expect.any(Array),
    );
  });

  it("sends the gym-v1 tenant's own (different) approved WhatsApp template name — not the clinic one", async () => {
    const { tenant } = await createTenantWithDueBooking({ tenantVertical: "gym", tenantTemplateVersion: "gym-v1" });
    tenantIdToCleanup = tenant.id;

    await sendDueReminders();

    expect(sendWhatsappTemplateMock).toHaveBeenCalledWith(
      tenant.id,
      expect.any(String),
      "class_reminder_24h",
      "en_US",
      expect.any(Array),
    );
  });
});
