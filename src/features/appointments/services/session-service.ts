import "server-only";
import { db } from "@/lib/db";

export type CreateSessionInput = {
  offeringId: string;
  resourceId: string;
  startAt: Date;
  endAt: Date;
  capacity: number;
};

export async function createSession(tenantId: string, input: CreateSessionInput) {
  return db.session.create({
    data: {
      tenantId,
      offeringId: input.offeringId,
      resourceId: input.resourceId,
      startAt: input.startAt,
      endAt: input.endAt,
      capacity: input.capacity,
    },
  });
}

export type ListSessionsParams = {
  resourceId?: string;
  from: Date;
  to: Date;
};

/** Includes each session's currently-booked headcount, for a future calendar/class-list view. */
export async function listSessions(tenantId: string, params: ListSessionsParams) {
  const sessions = await db.session.findMany({
    where: {
      tenantId,
      resourceId: params.resourceId,
      startAt: { gte: params.from, lt: params.to },
    },
    include: { bookings: { where: { status: "booked" }, select: { partySize: true } } },
    orderBy: { startAt: "asc" },
  });

  return sessions.map((session) => ({
    ...session,
    bookedCount: session.bookings.reduce((sum, booking) => sum + booking.partySize, 0),
  }));
}
