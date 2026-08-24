import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShellView } from "@/features/dashboard-shell";
import { getCurrentDoctor } from "@/lib/current-doctor";
import { getOnboardingDraft } from "@/features/onboarding/services/onboarding-repository";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentDoctor();
  if (!current) redirect("/onboarding");

  const draft = await getOnboardingDraft(current.doctorId);

  return (
    <DashboardShellView
      clinicName={draft?.clinicBasics.clinicName || undefined}
      doctorName={draft?.doctorProfile.doctorName || undefined}
    >
      {children}
    </DashboardShellView>
  );
}
