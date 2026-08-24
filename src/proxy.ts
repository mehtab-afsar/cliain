import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Gates the dashboard and its sensitive data APIs behind a signed-in Google session
// (see /login). Only checks "is there a session" here — a signed-in user with no
// clinic membership yet is a separate case (handled by dashboard/layout.tsx, since
// that needs a DB round trip this proxy shouldn't duplicate on every request). The
// public onboarding wizard (`/onboarding`, `/api/onboarding`), `/invite/[token]`, and
// the patient-facing endpoints (WhatsApp/Vapi webhooks, `/api/ai/chat`) are
// intentionally left open — they gate themselves or are protected by their own
// mechanisms (Meta/Vapi's own request shape, the webhook verify token).
export default auth((request) => {
  if (request.auth?.user) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/settings/:path*",
    "/api/appointments/:path*",
    "/api/patients/:path*",
  ],
};
