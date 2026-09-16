import type { PatientListItem } from "../types";
import type { TemplateContent } from "@/features/templates/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type PatientListProps = {
  patients: PatientListItem[];
  labels: TemplateContent["labels"];
};

export function PatientList({ patients, labels }: PatientListProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">First seen</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">
                {patient.name ?? `Unnamed ${labels.customerSingular.toLowerCase()}`}
              </td>
              <td className="px-4 py-3 font-mono text-muted-foreground">{patient.phone}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(patient.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
