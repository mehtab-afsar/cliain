import type { ReactNode } from "react";
import { PageHeader } from "@/features/dashboard-shell/components/page-header";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const { doctorId } = await requireCurrentDoctor();
  const { template } = await resolveTenantConfig(doctorId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="The control surface for what Cliain says and does." />
      <div className="flex flex-col gap-8 sm:flex-row">
        <SettingsTabs labels={template.labels} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
