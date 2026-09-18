import { afterEach, describe, expect, it } from "vitest";
import type { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getAnalyticsSummary } from "./analytics-service";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function uniquePhone(): string {
  return `+1555${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
}

async function createTenantFixture(overrides: { tenantVertical?: string; tenantTemplateVersion?: string }) {
  const tenant = await db.tenant.create({
    data: { timezone: "UTC", vertical: overrides.tenantVertical, templateVersion: overrides.tenantTemplateVersion },
  });
  const location = await db.location.create({ data: { tenantId: tenant.id, timezone: "UTC" } });
  const resource = await db.resource.create({
    data: { tenantId: tenant.id, locationId: location.id, type: "practitioner", name: "Resource" },
  });
  const offering = await db.offering.create({
    data: { tenantId: tenant.id, name: "Consultation", durationMinutes: 30, resourceType: "practitioner" },
  });
  return { tenant, resource, offering };
}

async function cleanup(tenantId: string): Promise<void> {
  // Conversation -> Customer has no cascading onDelete, so it must go first, or deleting the
  // tenant (which cascades to Customer) fails on the leftover FK — same reason
  // reminder-service.test.ts deletes Booking manually before the tenant.
  await db.conversation.deleteMany({ where: { customer: { tenantId } } });
  await db.booking.deleteMany({ where: { tenantId } });
  await db.tenant.delete({ where: { id: tenantId } });
}

/**
 * One tenant, seeded with a known mix of bookings/customers/conversations, then asserted
 * against by hand-computed expected numbers — run once per vertical (see the two `it`s below)
 * with identical fixture shape and identical expectations, which is the actual proof that
 * analytics-service.ts computes these purely from Booking/Customer/Conversation rows and never
 * branches on the tenant's vertical/templateVersion.
 */
async function seedAndSummarize(overrides: { tenantVertical: string; tenantTemplateVersion: string }) {
  const { tenant, resource, offering } = await createTenantFixture(overrides);
  const now = new Date();
  const outsideConversionWindow = new Date(now.getTime() - 60 * DAY_MS);

  // One customer with 8 bookings today, covering every status the metrics below care about.
  const bookingCustomer = await db.customer.create({
    data: { tenantId: tenant.id, phone: uniquePhone(), name: "Booking Customer", createdAt: now },
  });

  const bookingSpecs: { status: BookingStatus; hoursFromNow: number }[] = [
    { status: "completed", hoursFromNow: -2 },
    { status: "completed", hoursFromNow: -3 },
    { status: "completed", hoursFromNow: -4 },
    { status: "no_show", hoursFromNow: -5 },
    { status: "no_show", hoursFromNow: -6 },
    { status: "arrived", hoursFromNow: -1 },
    { status: "cancelled", hoursFromNow: -7 },
    // The one still in the future today — this is what upcomingToday should surface.
    { status: "booked", hoursFromNow: 2 },
  ];
  for (const spec of bookingSpecs) {
    const startAt = new Date(now.getTime() + spec.hoursFromNow * HOUR_MS);
    await db.booking.create({
      data: {
        tenantId: tenant.id,
        customerId: bookingCustomer.id,
        resourceId: resource.id,
        offeringId: offering.id,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
        status: spec.status,
      },
    });
  }

  // Two more customers created in-window with no bookings at all — the conversion-rate denominator.
  await db.customer.create({ data: { tenantId: tenant.id, phone: uniquePhone(), name: "No Booking 1", createdAt: now } });
  await db.customer.create({ data: { tenantId: tenant.id, phone: uniquePhone(), name: "No Booking 2", createdAt: now } });

  // Needs-attention customers — backdated outside the conversion window so they don't skew it.
  await db.customer.create({
    data: {
      tenantId: tenant.id,
      phone: uniquePhone(),
      name: "Needs Attention 1",
      createdAt: outsideConversionWindow,
      needsHumanReview: true,
      needsHumanReviewReason: "Emergency",
      needsHumanReviewAt: outsideConversionWindow,
    },
  });
  await db.customer.create({
    data: {
      tenantId: tenant.id,
      phone: uniquePhone(),
      name: "Needs Attention 2",
      createdAt: outsideConversionWindow,
      needsHumanReview: true,
      needsHumanReviewReason: "Asked for a human",
      needsHumanReviewAt: outsideConversionWindow,
    },
  });

  // Response-time customer — also backdated outside the conversion window, with a first user
  // message and a reply exactly 15 seconds later.
  const responseTimeCustomer = await db.customer.create({
    data: { tenantId: tenant.id, phone: uniquePhone(), name: "Response Time Customer", createdAt: outsideConversionWindow },
  });
  const firstMessageAt = new Date(outsideConversionWindow.getTime());
  await db.conversation.create({
    data: { customerId: responseTimeCustomer.id, role: "user", content: "Hi, can I book?", createdAt: firstMessageAt },
  });
  await db.conversation.create({
    data: {
      customerId: responseTimeCustomer.id,
      role: "assistant",
      content: "Sure — what day works?",
      createdAt: new Date(firstMessageAt.getTime() + 15_000),
    },
  });

  const summary = await getAnalyticsSummary(tenant.id);
  return { tenant, summary };
}

describe("analytics-service", () => {
  let tenantIdToCleanup: string | null = null;

  afterEach(async () => {
    if (tenantIdToCleanup) {
      await cleanup(tenantIdToCleanup);
      tenantIdToCleanup = null;
    }
  });

  it("computes correct counts for a clinic-v1 tenant from known seeded data", async () => {
    const { tenant, summary } = await seedAndSummarize({ tenantVertical: "clinic", tenantTemplateVersion: "clinic-v1" });
    tenantIdToCleanup = tenant.id;

    expect(summary.bookingsThisWeek.total).toBe(8);
    expect(summary.bookingsThisWeek.byStatus).toEqual({
      completed: 3,
      no_show: 2,
      arrived: 1,
      cancelled: 1,
      booked: 1,
    });
    expect(summary.bookingsThisMonth.total).toBe(8);

    // 2 no_show out of (3 completed + 2 no_show + 1 arrived) = 2/6.
    expect(summary.noShowRate).not.toBeNull();
    expect(summary.noShowRate!).toBeCloseTo(2 / 6, 5);

    expect(summary.upcomingToday.total).toBe(1);
    expect(summary.upcomingToday.next).toHaveLength(1);
    expect(summary.upcomingToday.next[0].status).toBe("booked");
    expect(summary.upcomingToday.next[0].customerName).toBe("Booking Customer");

    expect(summary.needsAttentionCount).toBe(2);

    expect(summary.medianResponseTimeSeconds).toBeCloseTo(15, 5);

    // 1 customer with a booking out of 3 created in-window (booking customer + 2 no-booking).
    expect(summary.bookingConversionRate).not.toBeNull();
    expect(summary.bookingConversionRate!).toBeCloseTo(1 / 3, 5);
  });

  it("computes the same metrics for a gym-v1 tenant from the identical seeded shape — proof this is template-agnostic", async () => {
    const { tenant, summary } = await seedAndSummarize({ tenantVertical: "gym", tenantTemplateVersion: "gym-v1" });
    tenantIdToCleanup = tenant.id;

    expect(summary.bookingsThisWeek.total).toBe(8);
    expect(summary.bookingsThisWeek.byStatus).toEqual({
      completed: 3,
      no_show: 2,
      arrived: 1,
      cancelled: 1,
      booked: 1,
    });
    expect(summary.bookingsThisMonth.total).toBe(8);

    expect(summary.noShowRate).not.toBeNull();
    expect(summary.noShowRate!).toBeCloseTo(2 / 6, 5);

    expect(summary.upcomingToday.total).toBe(1);
    expect(summary.upcomingToday.next).toHaveLength(1);
    expect(summary.upcomingToday.next[0].status).toBe("booked");
    expect(summary.upcomingToday.next[0].customerName).toBe("Booking Customer");

    expect(summary.needsAttentionCount).toBe(2);

    expect(summary.medianResponseTimeSeconds).toBeCloseTo(15, 5);

    expect(summary.bookingConversionRate).not.toBeNull();
    expect(summary.bookingConversionRate!).toBeCloseTo(1 / 3, 5);
  });

  it("returns null rates (not 0 or NaN) for a brand-new tenant with no bookings/customers", async () => {
    const { tenant } = await createTenantFixture({ tenantVertical: "clinic", tenantTemplateVersion: "clinic-v1" });
    tenantIdToCleanup = tenant.id;

    const summary = await getAnalyticsSummary(tenant.id);

    expect(summary.bookingsThisWeek.total).toBe(0);
    expect(summary.bookingsThisMonth.total).toBe(0);
    expect(summary.noShowRate).toBeNull();
    expect(summary.upcomingToday.total).toBe(0);
    expect(summary.upcomingToday.next).toHaveLength(0);
    expect(summary.needsAttentionCount).toBe(0);
    expect(summary.medianResponseTimeSeconds).toBeNull();
    expect(summary.bookingConversionRate).toBeNull();
  });
});
