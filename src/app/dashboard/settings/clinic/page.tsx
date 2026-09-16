import { requireCurrentDoctor } from "@/lib/current-doctor";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";
import { getBusinessTabComponent } from "@/features/settings/business-tab-registry";

export default async function SettingsClinicPage() {
  const { doctorId } = await requireCurrentDoctor();
  const { template } = await resolveTenantConfig(doctorId);
  // BusinessTab is a stable reference selected from a module-level map (ClinicTab/GymTab
  // themselves never change identity), not a new component defined during render — the
  // react-hooks/static-components heuristic can't tell those apart from the AST alone, and
  // doesn't apply anyway since this is a Server Component with no client-side re-render/state
  // to lose in the first place.
  const BusinessTab = getBusinessTabComponent(template.version);

  // eslint-disable-next-line react-hooks/static-components -- registry-selected stable component, see comment above
  return <BusinessTab />;
}
