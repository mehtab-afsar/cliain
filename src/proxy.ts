import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, isValidSessionToken } from "@/lib/session";

// Gates the dashboard and its sensitive data APIs behind a single shared password
// (see /login). The public onboarding wizard (`/onboarding`, `/api/onboarding`) and the
// patient-facing endpoints (WhatsApp/Vapi webhooks, `/api/ai/chat`) are intentionally
// left open — they have no session to check and are protected by their own mechanisms
// (Meta/Vapi's own request shape, the webhook verify token).
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (isValidSessionToken(token)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/settings/:path*",
    "/api/appointments/:path*",
    "/api/patients/:path*",
  ],
};
