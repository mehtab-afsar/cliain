"use client";

import { Users } from "lucide-react";
import { EmptyState } from "@/features/dashboard-shell/components/empty-state";
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
      <h1 className="font-heading text-2xl text-foreground">Patients</h1>
      <PatientList patients={patients} />
    </div>
  );
}
