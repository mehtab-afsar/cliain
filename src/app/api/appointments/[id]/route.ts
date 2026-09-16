import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { getAppointmentDetail } from "@/features/appointments/services/appointment-service";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { doctorId } = await requireCurrentDoctor();

  try {
    const { appointment, transcript } = await getAppointmentDetail(doctorId, id);
    return NextResponse.json({
      appointment: {
        id: appointment.id,
        startAt: appointment.startAt.toISOString(),
        endAt: appointment.endAt.toISOString(),
        status: appointment.status,
        statusReason: appointment.statusReason,
        reason: appointment.reason,
        rescheduledFromId: appointment.rescheduledFromId,
        patient: {
          id: appointment.customer.id,
          name: appointment.customer.name,
          phone: appointment.customer.phone,
        },
        events: appointment.events.map((event) => ({
          id: event.id,
          at: event.at.toISOString(),
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          actor: event.actor,
          channel: event.channel,
          reason: event.reason,
        })),
        transcript: transcript.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }
}
