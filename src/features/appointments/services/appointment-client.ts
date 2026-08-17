import type { AppointmentListItem } from "../types";

export async function fetchAppointments(): Promise<AppointmentListItem[]> {
  const response = await fetch("/api/appointments");
  if (!response.ok) return [];
  const { appointments } = (await response.json()) as { appointments: AppointmentListItem[] };
  return appointments;
}
