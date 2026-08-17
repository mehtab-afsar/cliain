import type { PatientListItem } from "../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PatientList({ patients }: { patients: PatientListItem[] }) {
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
                {patient.name ?? "Unnamed patient"}
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
