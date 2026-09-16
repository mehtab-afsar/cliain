import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { updateSetting } from "@/features/settings/services/settings-repository";
import { resolveTenantConfig } from "@/features/templates/services/config-resolver";

// The tenant's exact per-template settings document (doctors array and all) — the Settings
// business-details tab needs the real shape to edit, not the common cross-template projection
// resolveSettings() returns.
export async function GET() {
  const { doctorId } = await requireCurrentDoctor();
  const { settings } = await resolveTenantConfig(doctorId);
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const { doctorId, userId } = await requireCurrentDoctor();
  const { field, value } = (await request.json()) as { field?: string; value?: unknown };

  if (!field) {
    return NextResponse.json({ error: "field is required" }, { status: 400 });
  }

  try {
    const settings = await updateSetting(doctorId, field, value, `staff:${userId}`);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save setting." },
      { status: 400 },
    );
  }
}
