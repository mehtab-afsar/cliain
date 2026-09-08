"use client";

import Link from "next/link";
import { Check, CheckCheck, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import type { AppointmentListItem, AppointmentStatus } from "../types";
import type { TransitionInput } from "../services/appointment-client";

const ACTIVE_STATUSES: AppointmentStatus[] = ["booked", "arrived", "in_progress"];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

type RowActionsProps = {
  appointment: AppointmentListItem;
  onTransition: (id: string, input: TransitionInput) => void;
};

function RowActions({ appointment, onTransition }: RowActionsProps) {
  if (!ACTIVE_STATUSES.includes(appointment.status)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const isPastEnd = new Date(appointment.endAt) < new Date();
  if (isPastEnd) {
    return <span className="text-xs text-muted-foreground">Auto-completes soon</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {appointment.status === "booked" ? (
        <Button
          variant="ghost"
          size="icon-sm"
          title="Mark arrived"
          onClick={() => onTransition(appointment.id, { toStatus: "arrived" })}
        >
          <UserCheck className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon-sm"
        title="Mark done"
        onClick={() => onTransition(appointment.id, { toStatus: "completed" })}
      >
        <CheckCheck className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Mark no-show"
        onClick={() => onTransition(appointment.id, { toStatus: "no_show" })}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Cancel"
        className="text-destructive hover:bg-destructive/10"
        onClick={() => onTransition(appointment.id, { toStatus: "cancelled" })}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

type TableProps = {
  appointments: AppointmentListItem[];
  showActions: boolean;
  onTransition: (id: string, input: TransitionInput) => void;
  timeOnly?: boolean;
};

function AppointmentTable({ appointments, showActions, onTransition, timeOnly }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Patient</th>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Reason</th>
            <th className="px-4 py-3 font-medium">Status</th>
            {showActions ? <th className="px-4 py-3 font-medium">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <Link href={`/dashboard/appointments/${appointment.id}`} className="hover:underline">
                  <p className="font-medium text-foreground">
                    {appointment.patient.name ?? "Unnamed patient"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{appointment.patient.phone}</p>
                </Link>
              </td>
              <td className="px-4 py-3 text-foreground">
                {timeOnly ? formatTime(appointment.startAt) : formatDateTime(appointment.startAt)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{appointment.reason ?? "—"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={appointment.status} />
              </td>
              {showActions ? (
                <td className="px-4 py-3">
                  <RowActions appointment={appointment} onTransition={onTransition} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type AppointmentListProps = {
  appointments: AppointmentListItem[];
  onTransition: (id: string, input: TransitionInput) => void;
};

export function AppointmentList({ appointments, onTransition }: AppointmentListProps) {
  const today = appointments.filter((appointment) => isToday(appointment.startAt));
  const rest = appointments.filter((appointment) => !isToday(appointment.startAt));

  return (
    <div className="flex flex-col gap-8">
      {today.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-lg text-foreground">Today</h2>
          <AppointmentTable
            appointments={today}
            showActions
            onTransition={onTransition}
            timeOnly
          />
        </div>
      ) : null}

      {rest.length > 0 ? (
        <div className="flex flex-col gap-3">
          {today.length > 0 ? <h2 className="font-heading text-lg text-foreground">Upcoming</h2> : null}
          <AppointmentTable appointments={rest} showActions={false} onTransition={onTransition} />
        </div>
      ) : null}
    </div>
  );
}
