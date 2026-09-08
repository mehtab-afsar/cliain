import type { ReactNode } from "react";
import { PageHeader } from "@/features/dashboard-shell/components/page-header";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="The control surface for what Cliain says and does." />
      <div className="flex flex-col gap-8 sm:flex-row">
        <SettingsTabs />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
