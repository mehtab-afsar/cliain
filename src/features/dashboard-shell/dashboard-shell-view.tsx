import type { ReactNode } from "react";
import { ProductTourProvider } from "@/features/product-tour";
import { Sidebar } from "./components/sidebar";
import { TopNav } from "./components/top-nav";
import { NotConnectedBanner } from "./components/not-connected-banner";
import type { TemplateContent } from "@/features/templates/types";

type DashboardShellViewProps = {
  children: ReactNode;
  clinicName?: string;
  doctorName?: string;
  whatsappConnected: boolean;
  labels: TemplateContent["labels"];
};

export function DashboardShellView({
  children,
  clinicName,
  doctorName,
  whatsappConnected,
  labels,
}: DashboardShellViewProps) {
  return (
    <ProductTourProvider labels={labels}>
      <div className="flex h-dvh bg-background">
        <Sidebar clinicName={clinicName} labels={labels} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav clinicName={clinicName} doctorName={doctorName} labels={labels} />
          <NotConnectedBanner whatsappConnected={whatsappConnected} />
          <main className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </ProductTourProvider>
  );
}
