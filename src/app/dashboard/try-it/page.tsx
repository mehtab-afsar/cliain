import { TestAssistantView } from "@/features/test-assistant";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";

export default async function TryItPage() {
  const { doctorId } = await requireCurrentDoctor();
  const { template } = await resolveTenantConfig(doctorId);

  return <TestAssistantView templateVersion={template.version} />;
}
