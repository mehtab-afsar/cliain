import { NextResponse } from "next/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { listRecentAudit } from "@/features/settings/services/settings-repository";

export async function GET(request: Request) {
  const { doctorId } = await requireCurrentDoctor();
  const prefix = new URL(request.url).searchParams.get("prefix") ?? "";
  const rows = await listRecentAudit(doctorId, prefix);

  return NextResponse.json({
    rows: rows.map((row) => ({
      id: row.id,
      field: row.field,
      oldValue: row.oldValue,
      newValue: row.newValue,
      actor: row.actor,
      at: row.at.toISOString(),
    })),
  });
}
