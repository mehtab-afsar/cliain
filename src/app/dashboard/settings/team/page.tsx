import { TeamSection } from "@/features/settings/components/team-section";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";

export default async function SettingsTeamPage() {
  const { doctorId } = await requireCurrentDoctor();
  const { template } = await resolveTenantConfig(doctorId);
  return <TeamSection labels={template.labels} />;
}
