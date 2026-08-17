import { StatusBadge } from "./status-badge";
import type { AppointmentListItem } from "../types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AppointmentList({ appointments }: { appointments: AppointmentListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Patient</th>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Reason</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">
                  {appointment.patient.name ?? "Unnamed patient"}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {appointment.patient.phone}
                </p>
              </td>
              <td className="px-4 py-3 text-foreground">{formatDateTime(appointment.startAt)}</td>
              <td className="px-4 py-3 text-muted-foreground">{appointment.reason ?? "—"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={appointment.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
