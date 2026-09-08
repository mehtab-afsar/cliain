import { AppointmentDetailView } from "@/features/appointments/components/appointment-detail-view";

type AppointmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  const { id } = await params;
  return <AppointmentDetailView id={id} />;
}
