"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { NeedsAttentionItem } from "../types";
import type { TemplateContent } from "@/features/templates/types";

function formatWaitingSince(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type NeedsAttentionListProps = {
  patients: NeedsAttentionItem[];
  onClear: (patientId: string) => void;
  labels: TemplateContent["labels"];
};

export function NeedsAttentionList({ patients, onClear, labels }: NeedsAttentionListProps) {
  return (
    <div className="flex flex-col gap-4">
      {patients.map((patient) => (
        <div key={patient.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">
                {patient.name ?? `Unnamed ${labels.customerSingular.toLowerCase()}`}
              </p>
              <p className="font-mono text-xs text-muted-foreground">{patient.phone}</p>
              <p className="mt-2 text-sm text-foreground">
                {patient.needsHumanReviewReason ?? "Needs review"}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Waiting since {formatWaitingSince(patient.needsHumanReviewAt)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {patient.upcomingAppointmentId ? (
                <Link
                  href={`/dashboard/appointments/${patient.upcomingAppointmentId}`}
                  className="text-sm text-primary hover:underline"
                >
                  View appointment
                </Link>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => onClear(patient.id)}>
                Clear
              </Button>
            </div>
          </div>

          {patient.recentMessages.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              {patient.recentMessages.map((message, index) => (
                <p
                  key={index}
                  className={
                    message.role === "assistant"
                      ? "text-sm text-muted-foreground"
                      : "text-sm text-foreground"
                  }
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {message.role === "assistant" ? "AI: " : `${labels.customerSingular}: `}
                  </span>
                  {message.content}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
