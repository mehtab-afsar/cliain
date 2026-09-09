"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/features/dashboard-shell/components/empty-state";
import { PageHeader } from "@/features/dashboard-shell/components/page-header";
import { useAppointments, StatusBadge, type AppointmentStatus } from "@/features/appointments";
import {
  buildMonthGrid,
  dayKey,
  formatDayLabel,
  formatMonthLabel,
  formatTime,
  groupByDay,
  WEEKDAY_LABELS,
} from "./utils";

// A compact dot per status for the month grid, where a full StatusBadge doesn't fit — same
// semantics as status-badge.tsx's STATUS_STYLES, just condensed to one color each.
const STATUS_DOT: Record<AppointmentStatus, string> = {
  booked: "bg-primary",
  arrived: "bg-primary",
  in_progress: "bg-primary",
  completed: "bg-muted-foreground/50",
  cancelled: "bg-destructive",
  no_show: "bg-warning",
  rescheduled: "bg-muted-foreground/50",
};

const MAX_CHIPS_PER_DAY = 3;

export function CalendarView() {
  const { appointments, isLoading } = useAppointments();
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const byDay = useMemo(() => groupByDay(appointments ?? []), [appointments]);
  const grid = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const todayKey = dayKey(new Date());
  const selected = selectedKey ?? todayKey;
  const selectedAppointments = byDay.get(selected) ?? [];

  if (isLoading) return null;

  if (!appointments || appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="Your calendar will appear here"
        description="Once appointments start coming in, they'll sync here and to your connected Google Calendar."
      />
    );
  }

  function shiftMonth(delta: number) {
    setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        description="Every booking, laid out by day. Click a chip to open it, or a day to see the full list."
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg text-foreground">{formatMonthLabel(monthAnchor)}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => { setMonthAnchor(new Date()); setSelectedKey(null); }}>
              Today
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => shiftMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-2 py-2 text-center">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((day) => {
              const dayAppointments = byDay.get(day.key) ?? [];
              const overflow = dayAppointments.length - MAX_CHIPS_PER_DAY;
              const isSelected = day.key === selected;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedKey(day.key)}
                  className={`flex min-h-[104px] flex-col gap-1 border-b border-r border-border p-1.5 text-left last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                    day.inCurrentMonth ? "bg-card" : "bg-muted/20"
                  } ${isSelected ? "ring-2 ring-inset ring-ring" : "hover:bg-muted/40"}`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      day.isToday
                        ? "bg-primary font-medium text-primary-foreground"
                        : day.inCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground/60"
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {dayAppointments.slice(0, MAX_CHIPS_PER_DAY).map((appointment) => (
                      <span
                        key={appointment.id}
                        className="flex items-center gap-1 truncate text-[11px] text-foreground"
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[appointment.status]}`} />
                        <span className="truncate">
                          {formatTime(appointment.startAt)} {appointment.patient.name ?? appointment.patient.phone}
                        </span>
                      </span>
                    ))}
                    {overflow > 0 ? (
                      <span className="text-[11px] text-muted-foreground">+{overflow} more</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-lg text-foreground">
            {formatDayLabel(grid.find((d) => d.key === selected)?.date ?? new Date())}
          </h2>
          {selectedAppointments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing booked this day.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {selectedAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={`/dashboard/appointments/${appointment.id}`}
                  className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                      {formatTime(appointment.startAt)}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">
                        {appointment.patient.name ?? "Unnamed patient"}
                      </p>
                      <p className="text-xs text-muted-foreground">{appointment.reason ?? "No reason given"}</p>
                    </div>
                  </div>
                  <StatusBadge status={appointment.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
