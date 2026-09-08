import type { ClinicSettingsData } from "../schema";

export async function fetchClinicSettings(): Promise<ClinicSettingsData | null> {
  const response = await fetch("/api/settings/document");
  if (!response.ok) return null;
  return response.json();
}

export async function saveSetting(
  field: string,
  value: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/settings/document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, value }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? "Failed to save." };
  }
  return { ok: true };
}

export type AuditRow = {
  id: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  actor: string;
  at: string;
};

export async function fetchSettingsAudit(fieldPrefix: string): Promise<AuditRow[]> {
  const response = await fetch(`/api/settings/audit?prefix=${encodeURIComponent(fieldPrefix)}`);
  if (!response.ok) return [];
  const { rows } = (await response.json()) as { rows: AuditRow[] };
  return rows;
}
