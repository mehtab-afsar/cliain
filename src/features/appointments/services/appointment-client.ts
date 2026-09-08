import type { AppointmentDetail, AppointmentListItem, AppointmentStatus } from "../types";

export async function fetchAppointments(): Promise<AppointmentListItem[]> {
  const response = await fetch("/api/appointments");
  if (!response.ok) return [];
  const { appointments } = (await response.json()) as { appointments: AppointmentListItem[] };
  return appointments;
}

export async function fetchAppointmentDetail(id: string): Promise<AppointmentDetail | null> {
  const response = await fetch(`/api/appointments/${id}`);
  if (!response.ok) return null;
  const { appointment } = (await response.json()) as { appointment: AppointmentDetail };
  return appointment;
}

export type TransitionInput = {
  toStatus: AppointmentStatus;
  reason?: string;
  startAt?: string;
  endAt?: string;
};

export async function transitionAppointment(
  id: string,
  input: TransitionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`/api/appointments/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? "Failed to update appointment." };
  }
  return { ok: true };
}
