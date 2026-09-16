import { IntegrationsSection } from "@/features/settings/components/integrations-section";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";

export default async function SettingsIntegrationsPage() {
  const { doctorId } = await requireCurrentDoctor();
  const { template } = await resolveTenantConfig(doctorId);
  return <IntegrationsSection labels={template.labels} />;
}
