import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentDoctor } from "@/lib/current-doctor";
import {
  createClinic,
  getOnboardingDraft,
  updateClinic,
} from "@/features/onboarding/services/onboarding-repository";
import type { OnboardingDraft } from "@/features/onboarding/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const current = await getCurrentDoctor();
  if (!current) return NextResponse.json({ draft: null });

  const draft = await getOnboardingDraft(current.doctorId);
  return NextResponse.json({ draft });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const draft = (await request.json()) as OnboardingDraft;
  const current = await getCurrentDoctor();

  const saved = current
    ? await updateClinic(current.doctorId, draft)
    : (await createClinic(session.user.id, draft)).draft;

  return NextResponse.json({ draft: saved });
}
