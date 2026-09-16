import { requireCurrentDoctor } from "@/lib/current-doctor";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";
import { SafetyTab } from "@/features/settings/components/safety-tab";

export default async function SettingsSafetyPage() {
  const { doctorId } = await requireCurrentDoctor();
  const { template } = await resolveTenantConfig(doctorId);

  // Pass the version string, not the resolved `template` object — see messaging/page.tsx's
  // comment; SafetyTab re-resolves the same template client-side from this plain string.
  return <SafetyTab templateVersion={template.version} />;
}
