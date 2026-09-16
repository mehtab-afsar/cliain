import { AppointmentDetailView } from "@/features/appointments/components/appointment-detail-view";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";

type AppointmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  const { id } = await params;
  const { doctorId } = await requireCurrentDoctor();
  const { template } = await resolveTenantConfig(doctorId);

  return <AppointmentDetailView id={id} templateVersion={template.version} />;
}
