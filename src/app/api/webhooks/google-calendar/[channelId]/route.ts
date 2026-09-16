import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyGoogleChannelToken } from "@/lib/webhook-signatures";
import { reconcileCalendarChanges } from "@/features/appointments/services/calendar-watch-service";

type RouteParams = { params: Promise<{ channelId: string }> };

// Google's push notification carries no body and no doctorId — the callback URL itself (set
// at events.watch registration time, see calendar-watch-service.ts) is keyed by channelId, and
// the owning doctor is looked up by it rather than trusted from a header alone. Returns 200
// first, does the real work (paging through events.list) after — same pattern as the WhatsApp
// webhook, since Google will retry a slow/failed delivery and there's no benefit to blocking
// the response on it.
export async function POST(request: Request, { params }: RouteParams) {
  const { channelId } = await params;

  const { success } = await checkRateLimit(`google-calendar-webhook:${channelId}`);
  if (!success) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const doctor = await db.tenant.findUnique({ where: { googleCalendarWatchChannelId: channelId } });
  if (!doctor) {
    // A stopped/rotated/renewed channel can still get a stray in-flight notification — not an
    // error, just tell Google to stop retrying (a 404 is treated as "channel gone").
    return new NextResponse("Not found", { status: 404 });
  }

  const expectedToken = doctor.googleCalendarWatchToken ? decryptSecret(doctor.googleCalendarWatchToken) : null;
  const channelToken = request.headers.get("x-goog-channel-token");
  const resourceId = request.headers.get("x-goog-resource-id");

  if (!expectedToken || !verifyGoogleChannelToken(channelToken, expectedToken) || resourceId !== doctor.googleCalendarWatchResourceId) {
    return new NextResponse("Invalid channel", { status: 401 });
  }

  // "sync" is the one-time confirmation ping sent immediately when a watch is registered — no
  // actual change to reconcile yet.
  const resourceState = request.headers.get("x-goog-resource-state");
  if (resourceState && resourceState !== "sync") {
    after(() =>
      reconcileCalendarChanges(doctor.id).catch((error) => {
        console.error("[google-calendar-webhook] reconcile failed:", error);
      }),
    );
  }

  return new NextResponse(null, { status: 200 });
}
