import type { ReactNode } from "react";
import { DashboardShellView } from "@/features/dashboard-shell";
import { getOnboardingDraft } from "@/features/onboarding/services/onboarding-repository";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const draft = await getOnboardingDraft();

  return (
    <DashboardShellView
      clinicName={draft?.clinicBasics.clinicName || undefined}
      doctorName={draft?.doctorProfile.doctorName || undefined}
    >
      {children}
    </DashboardShellView>
  );
}
