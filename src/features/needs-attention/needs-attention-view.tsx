"use client";

import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/features/dashboard-shell/components/empty-state";
import { PageHeader } from "@/features/dashboard-shell/components/page-header";
import { useNeedsAttention } from "./hooks/use-needs-attention";
import { NeedsAttentionList } from "./components/needs-attention-list";

export function NeedsAttentionView() {
  const { patients, isLoading, clear } = useNeedsAttention();

  if (isLoading) return null;

  if (!patients || patients.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Nothing needs attention"
        description="When the AI hands a conversation off to your team — an emergency, a request to talk to a person, or something it couldn't help with — it shows up here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Needs attention"
        description="Conversations the AI has handed off to your team. The AI stays silent on these until you clear them."
      />
      <NeedsAttentionList patients={patients} onClear={clear} />
    </div>
  );
}
