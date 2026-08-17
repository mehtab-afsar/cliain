export type AppointmentListItem = {
  id: string;
  startAt: string;
  endAt: string;
  status: "booked" | "cancelled" | "completed" | "no_show";
  reason: string | null;
  patient: { id: string; name: string | null; phone: string };
};
