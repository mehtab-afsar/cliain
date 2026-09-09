import type { AppointmentListItem } from "@/features/appointments";

export type CalendarDay = {
  date: Date;
  /** Local calendar-day key, e.g. "2026-09-10" — groups appointments by the browser's own
   *  timezone, same convention the Appointments list already uses (formatDateTime there also
   *  reads off `new Date(iso)` directly rather than the clinic's stored timezone). */
  key: string;
  inCurrentMonth: boolean;
  isToday: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** A 6-week (42-day) grid for the month containing `monthAnchor`, padded with the trailing days
 *  of the previous/next month so every week starts on Sunday — the standard month-calendar
 *  layout. */
export function buildMonthGrid(monthAnchor: Date): CalendarDay[] {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  const today = dayKey(new Date());
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart.getTime() + i * DAY_MS);
    days.push({
      date,
      key: dayKey(date),
      inCurrentMonth: date.getMonth() === month,
      isToday: dayKey(date) === today,
    });
  }
  return days;
}

/** Buckets appointments by local calendar day, sorted chronologically within each day. */
export function groupByDay(appointments: AppointmentListItem[]): Map<string, AppointmentListItem[]> {
  const map = new Map<string, AppointmentListItem[]>();
  for (const appointment of appointments) {
    const key = dayKey(new Date(appointment.startAt));
    const bucket = map.get(key);
    if (bucket) bucket.push(appointment);
    else map.set(key, [appointment]);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }
  return map;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}
