import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShellView } from "@/features/dashboard-shell";
import { getCurrentDoctor } from "@/lib/current-doctor";
import { getIntegrationsStatus } from "@/lib/integration-credentials";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentDoctor();
  if (!current) redirect("/onboarding");

  const [integrations, { template, commonSettings }] = await Promise.all([
    getIntegrationsStatus(current.doctorId),
    resolveTenantConfig(current.doctorId),
  ]);

  return (
    <DashboardShellView
      clinicName={commonSettings.business.displayName || commonSettings.business.name}
      doctorName={commonSettings.primaryResource.name}
      whatsappConnected={integrations.whatsapp.connected}
      labels={template.labels}
    >
      {children}
    </DashboardShellView>
  );
}
