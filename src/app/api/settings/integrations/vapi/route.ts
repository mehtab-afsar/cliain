import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { getIntegrationsStatus } from "@/lib/integration-credentials";
import { provisionVapiForDoctor, deprovisionVapiForDoctor } from "@/features/ai-agent/services/vapi-provisioning";
import { resolveSettings } from "@/features/settings/services/settings-repository";
import { businessDisplayName } from "@/features/templates/prompt-render";

/** Phone calls have no clinic-typed credentials — this is "turn it on" / "turn it off", not a
 *  form save, hence its own route rather than going through /api/settings/integrations. */
export async function POST() {
  const { doctorId } = await requireCurrentDoctor();
  const settings = await resolveSettings(doctorId);

  const result = await provisionVapiForDoctor(doctorId, businessDisplayName(settings));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const status = await getIntegrationsStatus(doctorId);
  return NextResponse.json(status);
}

export async function DELETE() {
  const { doctorId } = await requireCurrentDoctor();
  await deprovisionVapiForDoctor(doctorId);
  const status = await getIntegrationsStatus(doctorId);
  return NextResponse.json(status);
}
