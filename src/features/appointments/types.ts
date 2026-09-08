export type AppointmentStatus =
  | "booked"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

export type AppointmentListItem = {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  reason: string | null;
  patient: { id: string; name: string | null; phone: string };
};

export type AppointmentEventItem = {
  id: string;
  at: string;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus;
  actor: string;
  channel: string | null;
  reason: string | null;
};

export type ConversationMessageItem = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

export type AppointmentDetail = AppointmentListItem & {
  statusReason: string | null;
  rescheduledFromId: string | null;
  events: AppointmentEventItem[];
  transcript: ConversationMessageItem[];
};
