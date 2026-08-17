import { NextResponse } from "next/server";
import {
  getOnboardingDraft,
  saveOnboardingDraft,
} from "@/features/onboarding/services/onboarding-repository";
import type { OnboardingDraft } from "@/features/onboarding/types";

export async function GET() {
  const draft = await getOnboardingDraft();
  return NextResponse.json({ draft });
}

export async function POST(request: Request) {
  const body = (await request.json()) as OnboardingDraft;
  const saved = await saveOnboardingDraft(body);
  return NextResponse.json({ draft: saved });
}
