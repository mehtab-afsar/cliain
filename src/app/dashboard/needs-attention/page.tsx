import { NeedsAttentionView } from "@/features/needs-attention";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";

export default async function NeedsAttentionPage() {
  const { doctorId } = await requireCurrentDoctor();
  const { template } = await resolveTenantConfig(doctorId);

  return <NeedsAttentionView templateVersion={template.version} />;
}
