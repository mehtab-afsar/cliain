import "server-only";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import type { BookingStatus } from "@prisma/client";
import { resolveTimezone } from "@/lib/timezone";
import { getTenantById } from "@/features/appointments/services/doctor-repository";

const NO_SHOW_WINDOW_DAYS = 30;
const CONVERSION_WINDOW_DAYS = 30;
// How many of the tenant's most-recently-created customers to sample for the response-time
// proxy below — bounded so this stays a cheap dashboard read, not a full-table scan.
const RESPONSE_TIME_SAMPLE_SIZE = 50;
const UPCOMING_TODAY_PREVIEW_SIZE = 3;

// Statuses that count as "the booking actually happened (or is happening)" for the no-show
// denominator — i.e. every outcome a booking that wasn't cancelled/rescheduled could reach.
// "booked" (still in the future, outcome unknown yet) and "cancelled"/"rescheduled" (not a
// no-show question at all) are deliberately excluded.
const NO_SHOW_ELIGIBLE_STATUSES: BookingStatus[] = ["completed", "no_show", "arrived", "in_progress"];

export type BookingCounts = {
  total: number;
  byStatus: Partial<Record<BookingStatus, number>>;
};

export type UpcomingBookingSummary = {
  id: string;
  startAt: string; // ISO
  status: BookingStatus;
  customerName: string | null;
};

export type AnalyticsSummary = {
  bookingsThisWeek: BookingCounts;
  bookingsThisMonth: BookingCounts;
  /** no_show / (completed + no_show + arrived + in_progress) over the last 30 days, by
   *  startAt. Null when there's no eligible booking in the window (avoids a misleading 0%). */
  noShowRate: number | null;
  upcomingToday: { total: number; next: UpcomingBookingSummary[] };
  needsAttentionCount: number;
  /**
   * Rough p50 "how fast does the AI respond" proxy: for each of the tenant's most recently
   * created customers (see RESPONSE_TIME_SAMPLE_SIZE), the time between their first inbound
   * ("user") message and the first assistant reply that follows it, in seconds. This is a
   * per-customer "time to first response" median, not a per-message response-time
   * distribution — a customer who never got a reply, or never sent a first message, is
   * excluded rather than counted as infinite/zero. Null when the sample has no measurable pair.
   */
  medianResponseTimeSeconds: number | null;
  /**
   * Approximation, not a rigorous funnel: (customers created in the last 30 days who have at
   * least one Booking, ever) / (customers created in the last 30 days). It doesn't restrict the
   * booking itself to that window (a customer who signed up on day 1 and booked on day 29 still
   * counts), and it says nothing about customers created before the window who booked during
   * it. Good enough as a directional "are conversations turning into bookings" signal, not a
   * number to put in a board deck.
   */
  bookingConversionRate: number | null;
};

function toBookingCounts(rows: { status: BookingStatus; _count: { _all: number } }[]): BookingCounts {
  const byStatus: Partial<Record<BookingStatus, number>> = {};
  let total = 0;
  for (const row of rows) {
    byStatus[row.status] = row._count._all;
    total += row._count._all;
  }
  return { total, byStatus };
}

async function countBookingsByStatus(tenantId: string, startAt: Date, endAt: Date): Promise<BookingCounts> {
  const rows = await db.booking.groupBy({
    by: ["status"],
    where: { tenantId, startAt: { gte: startAt, lt: endAt } },
    _count: { _all: true },
  });
  return toBookingCounts(rows);
}

async function computeNoShowRate(tenantId: string, now: DateTime): Promise<number | null> {
  const windowStart = now.minus({ days: NO_SHOW_WINDOW_DAYS }).toJSDate();
  const rows = await db.booking.groupBy({
    by: ["status"],
    where: {
      tenantId,
      startAt: { gte: windowStart, lte: now.toJSDate() },
      status: { in: NO_SHOW_ELIGIBLE_STATUSES },
    },
    _count: { _all: true },
  });
  const counts = toBookingCounts(rows);
  if (counts.total === 0) return null;
  return (counts.byStatus.no_show ?? 0) / counts.total;
}

async function computeUpcomingToday(
  tenantId: string,
  now: DateTime,
): Promise<{ total: number; next: UpcomingBookingSummary[] }> {
  const endOfDay = now.endOf("day").toJSDate();
  const where = {
    tenantId,
    status: "booked" as const,
    startAt: { gte: now.toJSDate(), lte: endOfDay },
  };

  const [total, upcoming] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      orderBy: { startAt: "asc" },
      take: UPCOMING_TODAY_PREVIEW_SIZE,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  return {
    total,
    next: upcoming.map((booking) => ({
      id: booking.id,
      startAt: booking.startAt.toISOString(),
      status: booking.status,
      customerName: booking.customer.name,
    })),
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function computeMedianResponseTimeSeconds(tenantId: string): Promise<number | null> {
  const recentCustomers = await db.customer.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: RESPONSE_TIME_SAMPLE_SIZE,
    select: {
      conversations: {
        orderBy: { createdAt: "asc" },
        select: { role: true, createdAt: true },
      },
    },
  });

  const responseTimesSeconds: number[] = [];
  for (const customer of recentCustomers) {
    const firstUserMessage = customer.conversations.find((message) => message.role === "user");
    if (!firstUserMessage) continue;
    const firstReply = customer.conversations.find(
      (message) => message.role === "assistant" && message.createdAt > firstUserMessage.createdAt,
    );
    if (!firstReply) continue;
    const diffSeconds = (firstReply.createdAt.getTime() - firstUserMessage.createdAt.getTime()) / 1000;
    responseTimesSeconds.push(diffSeconds);
  }

  return median(responseTimesSeconds);
}

async function computeBookingConversionRate(tenantId: string, now: DateTime): Promise<number | null> {
  const windowStart = now.minus({ days: CONVERSION_WINDOW_DAYS }).toJSDate();
  const createdWhere = { tenantId, createdAt: { gte: windowStart, lte: now.toJSDate() } };

  const [customersCreated, customersWithBooking] = await Promise.all([
    db.customer.count({ where: createdWhere }),
    db.customer.count({ where: { ...createdWhere, bookings: { some: {} } } }),
  ]);

  if (customersCreated === 0) return null;
  return customersWithBooking / customersCreated;
}

/**
 * The clinic-facing overview PRODUCT.md flags as a natural next step: response times, booking
 * conversion, and no-show rates, scoped to one tenant. Every query here is deliberately simple
 * (counts/groupBy, no window functions) — this is a dashboard summary, not a reporting engine;
 * see the doc comments on medianResponseTimeSeconds/bookingConversionRate above for the two
 * metrics that are approximations rather than precise figures.
 */
export async function getAnalyticsSummary(tenantId: string): Promise<AnalyticsSummary> {
  const tenant = await getTenantById(tenantId);
  const zone = resolveTimezone(tenant.timezone);
  const now = DateTime.now().setZone(zone);

  const [
    bookingsThisWeek,
    bookingsThisMonth,
    noShowRate,
    upcomingToday,
    needsAttentionCount,
    medianResponseTimeSeconds,
    bookingConversionRate,
  ] = await Promise.all([
    countBookingsByStatus(tenantId, now.startOf("week").toJSDate(), now.plus({ days: 1 }).toJSDate()),
    countBookingsByStatus(tenantId, now.startOf("month").toJSDate(), now.plus({ days: 1 }).toJSDate()),
    computeNoShowRate(tenantId, now),
    computeUpcomingToday(tenantId, now),
    db.customer.count({ where: { tenantId, needsHumanReview: true } }),
    computeMedianResponseTimeSeconds(tenantId),
    computeBookingConversionRate(tenantId, now),
  ]);

  return {
    bookingsThisWeek,
    bookingsThisMonth,
    noShowRate,
    upcomingToday,
    needsAttentionCount,
    medianResponseTimeSeconds,
    bookingConversionRate,
  };
}
