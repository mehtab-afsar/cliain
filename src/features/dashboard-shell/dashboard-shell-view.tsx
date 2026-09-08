import type { ReactNode } from "react";
import { ProductTourProvider } from "@/features/product-tour";
import { Sidebar } from "./components/sidebar";
import { TopNav } from "./components/top-nav";
import { NotConnectedBanner } from "./components/not-connected-banner";

type DashboardShellViewProps = {
  children: ReactNode;
  clinicName?: string;
  doctorName?: string;
  whatsappConnected: boolean;
};

export function DashboardShellView({
  children,
  clinicName,
  doctorName,
  whatsappConnected,
}: DashboardShellViewProps) {
  return (
    <ProductTourProvider>
      <div className="flex h-dvh bg-background">
        <Sidebar clinicName={clinicName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav clinicName={clinicName} doctorName={doctorName} />
          <NotConnectedBanner whatsappConnected={whatsappConnected} />
          <main className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </ProductTourProvider>
  );
}
