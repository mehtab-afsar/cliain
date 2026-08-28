"use client";

import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/features/dashboard-shell/components/empty-state";
import { PageHeader } from "@/features/dashboard-shell/components/page-header";
import { useAppointments } from "./hooks/use-appointments";
import { AppointmentList } from "./components/appointment-list";

export function AppointmentsView() {
  const { appointments, isLoading } = useAppointments();

  if (isLoading) return null;

  if (!appointments || appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No appointments yet"
        description="Once your AI assistant starts booking patients over WhatsApp, appointments will show up here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Appointments"
        description="Every booking made over WhatsApp or a phone call lands here automatically."
      />
      <AppointmentList appointments={appointments} />
    </div>
  );
}
