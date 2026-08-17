import type { PatientListItem } from "../types";

export async function fetchPatients(): Promise<PatientListItem[]> {
  const response = await fetch("/api/patients");
  if (!response.ok) return [];
  const { patients } = (await response.json()) as { patients: PatientListItem[] };
  return patients;
}
