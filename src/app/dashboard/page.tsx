import { AnalyticsView } from "@/features/analytics";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";

export default async function DashboardPage() {
  const { doctorId } = await requireCurrentDoctor();
  const { template } = await resolveTenantConfig(doctorId);

  return <AnalyticsView tenantId={doctorId} templateVersion={template.version} />;
}
