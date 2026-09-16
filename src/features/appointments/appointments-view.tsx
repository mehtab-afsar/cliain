"use client";

import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/features/dashboard-shell/components/empty-state";
import { PageHeader } from "@/features/dashboard-shell/components/page-header";
import { resolveTemplateByVersion } from "@/features/templates/registry";
import { useAppointments } from "./hooks/use-appointments";
import { AppointmentList } from "./components/appointment-list";

export function AppointmentsView({ templateVersion }: { templateVersion: string }) {
  const { labels } = resolveTemplateByVersion(templateVersion);
  const { appointments, isLoading, transition } = useAppointments();

  if (isLoading) return null;

  if (!appointments || appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title={`No ${labels.bookingPlural.toLowerCase()} yet`}
        description={`Once your AI assistant starts booking ${labels.customerPlural.toLowerCase()} over WhatsApp, ${labels.bookingPlural.toLowerCase()} will show up here.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={labels.bookingPlural}
        description="Every booking made over WhatsApp or a phone call lands here automatically."
      />
      <AppointmentList appointments={appointments} onTransition={transition} labels={labels} />
    </div>
  );
}
