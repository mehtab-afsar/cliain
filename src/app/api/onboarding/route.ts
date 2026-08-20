import { NextResponse } from "next/server";
import {
  getOnboardingDraft,
  saveOnboardingDraft,
} from "@/features/onboarding/services/onboarding-repository";
import type { OnboardingDraft } from "@/features/onboarding/types";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createSessionToken } from "@/lib/session";

export async function GET() {
  const draft = await getOnboardingDraft();
  return NextResponse.json({ draft });
}

export async function POST(request: Request) {
  const { password, ...draft } = (await request.json()) as OnboardingDraft & {
    password?: string;
  };
  const saved = await saveOnboardingDraft(draft, password);

  const response = NextResponse.json({ draft: saved });
  // Setting a password here means the owner just proved who they are by finishing setup —
  // log them straight into the dashboard instead of making them turn around and log in.
  if (password) {
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
  }
  return response;
}
