"use client";

import { Users } from "lucide-react";
import { EmptyState } from "@/features/dashboard-shell/components/empty-state";
import { PageHeader } from "@/features/dashboard-shell/components/page-header";
import { usePatients } from "./hooks/use-patients";
import { PatientList } from "./components/patient-list";

export function PatientsView() {
  const { patients, isLoading } = usePatients();

  if (isLoading) return null;

  if (!patients || patients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No patients yet"
        description="Patients who message your clinic on WhatsApp will appear here automatically."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patients"
        description="Everyone who's messaged or called in, even before they've booked."
      />
      <PatientList patients={patients} />
    </div>
  );
}
