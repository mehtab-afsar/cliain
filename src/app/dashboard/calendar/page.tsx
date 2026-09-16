import { CalendarView } from "@/features/calendar";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";

export default async function CalendarPage() {
  const { doctorId } = await requireCurrentDoctor();
  const { template } = await resolveTenantConfig(doctorId);

  return <CalendarView templateVersion={template.version} />;
}
