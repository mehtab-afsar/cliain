import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import {
  markArrived,
  completeAppointment,
  markNoShow,
  cancelAppointment,
  rescheduleAppointment,
} from "@/features/appointments/services/appointment-service";

type RouteParams = { params: Promise<{ id: string }> };

type TransitionBody = {
  toStatus: "arrived" | "completed" | "no_show" | "cancelled" | "rescheduled";
  reason?: string;
  startAt?: string;
  endAt?: string;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { doctorId, userId } = await requireCurrentDoctor();
  const body = (await request.json()) as TransitionBody;
  const by = { actor: `staff:${userId}`, channel: "dashboard" };

  try {
    switch (body.toStatus) {
      case "arrived":
        return NextResponse.json({ appointment: await markArrived(doctorId, id, by) });
      case "completed":
        return NextResponse.json({
          appointment: await completeAppointment(doctorId, id, by, body.reason),
        });
      case "no_show":
        return NextResponse.json({ appointment: await markNoShow(doctorId, id, by, body.reason) });
      case "cancelled":
        return NextResponse.json({
          appointment: await cancelAppointment(doctorId, id, by, body.reason),
        });
      case "rescheduled": {
        if (!body.startAt || !body.endAt) {
          return NextResponse.json(
            { error: "startAt and endAt are required to reschedule." },
            { status: 400 },
          );
        }
        const appointment = await rescheduleAppointment(
          doctorId,
          { appointmentId: id, startAt: body.startAt, endAt: body.endAt },
          by,
          body.reason,
        );
        return NextResponse.json({ appointment });
      }
      default:
        return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update appointment." },
      { status: 400 },
    );
  }
}
