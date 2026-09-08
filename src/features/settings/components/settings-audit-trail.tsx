"use client";

import { useEffect, useState } from "react";
import { fetchSettingsAudit, type AuditRow } from "../services/settings-client";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  return JSON.stringify(value);
}

function formatAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SettingsAuditTrail({ fieldPrefix }: { fieldPrefix: string }) {
  const [rows, setRows] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    fetchSettingsAudit(fieldPrefix).then(setRows);
  }, [fieldPrefix]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="mt-10 border-t border-border pt-6">
      <h3 className="text-sm font-medium text-foreground">Recent changes</h3>
      <div className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <p key={row.id} className="text-xs text-muted-foreground">
            <span className="font-mono">{row.field}</span>: {formatValue(row.oldValue)} →{" "}
            {formatValue(row.newValue)}
            <span className="ml-2">
              {row.actor} · {formatAt(row.at)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
