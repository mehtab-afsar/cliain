import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { bookAppointment } from "@/features/appointments/services/appointment-service";

/**
 * Regression suite for the `add_class_capacity_booking` migration (Session,
 * Offering.mode/defaultCapacity, Booking.sessionId). Migrations are already applied by the
 * time Vitest runs against the test DB, so this asserts the *effect* of the migration rather
 * than running the SQL script itself: existing appointment-mode fixtures must be unaffected by
 * the new columns/table, with no explicit backfill required.
 */
async function createTenantWithAppointmentOffering() {
  const tenant = await db.tenant.create({ data: { timezone: "UTC" } });
  const location = await db.location.create({ data: { tenantId: tenant.id, timezone: "UTC" } });
  const resource = await db.resource.create({
    data: { tenantId: tenant.id, locationId: location.id, type: "practitioner", name: "Dr. Test" },
  });
  // Deliberately NOT setting `mode` — proving the column default applies, not an explicit value.
  const offering = await db.offering.create({
    data: { tenantId: tenant.id, name: "Consultation", durationMinutes: 30, resourceType: "practitioner" },
  });
  return { tenant, resource, offering };
}

async function cleanup(tenantId: string) {
  await db.booking.deleteMany({ where: { tenantId } });
  await db.tenant.delete({ where: { id: tenantId } });
}

describe("add_class_capacity_booking migration regression", () => {
  let tenantId: string | undefined;

  afterEach(async () => {
    if (tenantId) await cleanup(tenantId);
    tenantId = undefined;
  });

  it("existing (pre-migration-shaped) offerings default to mode 'appointment' with no explicit backfill", async () => {
    const { tenant, offering } = await createTenantWithAppointmentOffering();
    tenantId = tenant.id;

    expect(offering.mode).toBe("appointment");
    expect(offering.defaultCapacity).toBeNull();
  });

  it("appointment-mode booking still uses the exclusive-slot path, unaffected by the new Session/class path", async () => {
    const { tenant } = await createTenantWithAppointmentOffering();
    tenantId = tenant.id;
    const customer = await db.customer.create({
      data: { tenantId: tenant.id, phone: `+1555${Date.now()}` },
    });

    const booking = await bookAppointment(
      tenant.id,
      { patientId: customer.id, startAt: "2026-09-01T14:00:00.000Z", endAt: "2026-09-01T14:30:00.000Z" },
      { actor: "test" },
    );

    expect(booking.mode).toBe("appointment");
    expect(booking.sessionId).toBeNull();
    expect(booking.partySize).toBe(1);

    await expect(
      bookAppointment(
        tenant.id,
        { patientId: customer.id, startAt: "2026-09-01T14:15:00.000Z", endAt: "2026-09-01T14:45:00.000Z" },
        { actor: "test" },
      ),
    ).rejects.toThrow("just booked by someone else");
  });

  it("booking a class-mode offering without a sessionId is rejected, not silently misrouted", async () => {
    const { tenant, resource } = await createTenantWithAppointmentOffering();
    tenantId = tenant.id;
    await db.offering.updateMany({ where: { tenantId: tenant.id }, data: { mode: "class", defaultCapacity: 10 } });
    const customer = await db.customer.create({
      data: { tenantId: tenant.id, phone: `+1555${Date.now()}` },
    });
    void resource;

    await expect(
      bookAppointment(
        tenant.id,
        { patientId: customer.id, startAt: "2026-09-01T14:00:00.000Z", endAt: "2026-09-01T14:30:00.000Z" },
        { actor: "test" },
      ),
    ).rejects.toThrow("sessionId is required");
  });
});
