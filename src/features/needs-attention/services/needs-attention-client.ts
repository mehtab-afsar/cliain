import type { NeedsAttentionItem } from "../types";

export async function fetchNeedsAttention(): Promise<NeedsAttentionItem[]> {
  const response = await fetch("/api/needs-attention");
  if (!response.ok) return [];
  const { patients } = (await response.json()) as { patients: NeedsAttentionItem[] };
  return patients;
}

export async function clearNeedsAttention(patientId: string): Promise<boolean> {
  const response = await fetch(`/api/needs-attention/${patientId}/clear`, { method: "POST" });
  return response.ok;
}
