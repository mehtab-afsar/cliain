import { requireCurrentDoctor } from "@/lib/current-doctor";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";
import { MessagingTab } from "@/features/settings/components/messaging-tab";

export default async function SettingsMessagingPage() {
  const { doctorId } = await requireCurrentDoctor();
  const { template } = await resolveTenantConfig(doctorId);

  // Pass the version string, not the resolved `template` object — TemplateDefinition carries
  // functions (toCommonSettings, buildFallback, ...) and a Zod schema instance, neither of
  // which can cross the Server->Client Component prop boundary. MessagingTab (a client
  // component) re-resolves the same template client-side instead, from this plain string.
  return <MessagingTab templateVersion={template.version} />;
}
