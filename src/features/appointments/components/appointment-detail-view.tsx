"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppointmentDetail } from "../hooks/use-appointment-detail";
import { StatusBadge } from "./status-badge";
import type { AppointmentStatus } from "../types";

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

/** For a native datetime-local input's value attribute — local time, no timezone suffix. */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppointmentDetailView({ id }: { id: string }) {
  const { appointment, isLoading, transition } = useAppointmentDetail(id);
  const [cancelReason, setCancelReason] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return null;
  if (!appointment) {
    return <p className="text-sm text-muted-foreground">Appointment not found.</p>;
  }

  const isActive = ACTIVE_STATUSES.includes(appointment.status);

  async function run(input: Parameters<typeof transition>[0]) {
    setError(null);
    const result = await transition(input);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/appointments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to appointments
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground">
            {appointment.patient.name ?? "Unnamed patient"}
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{appointment.patient.phone}</p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">When</dt>
            <dd className="mt-1 text-foreground">{formatDateTime(appointment.startAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reason</dt>
            <dd className="mt-1 text-foreground">{appointment.reason ?? "—"}</dd>
          </div>
          {appointment.statusReason ? (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Status note</dt>
              <dd className="mt-1 text-foreground">{appointment.statusReason}</dd>
            </div>
          ) : null}
          {appointment.rescheduledFromId ? (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Rescheduled from</dt>
              <dd className="mt-1">
                <Link
                  href={`/dashboard/appointments/${appointment.rescheduledFromId}`}
                  className="text-primary hover:underline"
                >
                  View original booking
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {isActive ? (
        <div className="flex flex-wrap items-center gap-2">
          {appointment.status === "booked" ? (
            <Button variant="outline" size="sm" onClick={() => run({ toStatus: "arrived" })}>
              Mark arrived
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => run({ toStatus: "completed" })}>
            Mark done
          </Button>
          <Button variant="outline" size="sm" onClick={() => run({ toStatus: "no_show" })}>
            Mark no-show
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowReschedule((v) => !v)}>
            Reschedule
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => run({ toStatus: "cancelled", reason: cancelReason || undefined })}
          >
            Cancel
          </Button>
          <Input
            placeholder="Cancellation reason (optional)"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            className="w-56"
          />
        </div>
      ) : null}

      {showReschedule ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reschedule-start">New start</Label>
            <Input
              id="reschedule-start"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(appointment.startAt)}
              onChange={(event) => setNewStart(event.target.value)}
              className="w-56"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reschedule-end">New end</Label>
            <Input
              id="reschedule-end"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(appointment.endAt)}
              onChange={(event) => setNewEnd(event.target.value)}
              className="w-56"
            />
          </div>
          <Button
            size="sm"
            onClick={() =>
              run({
                toStatus: "rescheduled",
                startAt: new Date(newStart || appointment.startAt).toISOString(),
                endAt: new Date(newEnd || appointment.endAt).toISOString(),
              })
            }
          >
            Confirm reschedule
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-foreground">History</h2>
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {appointment.events.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No events yet.</p>
          ) : (
            appointment.events.map((event) => (
              <div key={event.id} className="p-4 text-sm">
                <p className="text-foreground">
                  {event.fromStatus ? `${event.fromStatus} → ${event.toStatus}` : `Created as ${event.toStatus}`}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {event.actor}
                    {event.channel ? ` · ${event.channel}` : ""}
                  </span>
                </p>
                {event.reason ? <p className="mt-1 text-muted-foreground">{event.reason}</p> : null}
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {formatDateTime(event.at)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-foreground">Conversation</h2>
        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4">
          {appointment.transcript.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            appointment.transcript.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "assistant"
                    ? "self-start rounded-xl rounded-bl-sm border border-border bg-secondary px-3.5 py-2.5 text-sm text-foreground"
                    : "self-end rounded-xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground"
                }
              >
                {message.content}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
