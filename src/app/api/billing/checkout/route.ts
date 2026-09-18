import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { requireCurrentDoctor } from "@/lib/current-doctor";
import { createCheckoutSession } from "@/features/billing/services/billing-service";

/**
 * POST-only, auth-gated (follows the pattern in src/app/api/settings/document/route.ts) —
 * creates a Stripe Checkout Session for the current tenant's Pro upgrade and returns its URL
 * for the client to redirect to. Never a raw 500 when Stripe isn't configured: getStripeConfig()
 * being null (no STRIPE_SECRET_KEY set — true of this deployment today) is reported as a clear,
 * translated 503, not a crash.
 */
export async function POST() {
  const { doctorId } = await requireCurrentDoctor();
  const t = await getTranslations("Billing");

  const result = await createCheckoutSession(doctorId);

  if (!result.ok) {
    return NextResponse.json({ error: t("checkoutNotConfigured") }, { status: 503 });
  }

  return NextResponse.json({ url: result.url });
}
