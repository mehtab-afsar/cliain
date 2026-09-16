import type { ComponentType } from "react";
import { ClinicTab } from "./components/clinic-tab";
import { GymTab } from "./components/gym-tab";

/**
 * Which business-details tab component renders for a given template — the settings-page
 * equivalent of onboarding/step-registry.ts's per-template lookup tables. Adding a third
 * template means registering it here, not editing a ternary at the call site (see
 * `dashboard/settings/clinic/page.tsx`).
 */
const BUSINESS_TAB_COMPONENTS: Record<string, ComponentType> = {
  "clinic-v1": ClinicTab,
  "gym-v1": GymTab,
};

/** Throws on an unregistered template — same "fail loudly, don't guess" stance as
 *  registry.ts's resolveTemplate(): a template with no business tab registered is a real gap,
 *  not something to silently paper over with a fallback. */
export function getBusinessTabComponent(version: string): ComponentType {
  const Component = BUSINESS_TAB_COMPONENTS[version];
  if (!Component) {
    throw new Error(`No business-details tab registered for template version "${version}".`);
  }
  return Component;
}
