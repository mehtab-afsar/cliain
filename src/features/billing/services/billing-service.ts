import "server-only";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStripeConfig } from "@/lib/stripe";
import { resolveTimezone } from "@/lib/timezone";
import { getTenantById } from "@/features/appointments/services/doctor-repository";

export type UsageSummary = {
  /** e.g. "September 2026" — the calendar month this summary covers, in the tenant's own timezone. */
  monthLabel: string;
  inputTokens: number;
  outputTokens: number;
  llmCallCount: number;
  /**
   * Derived from UsageEvent.costUsdMicros (see usage-ledger.ts's estimateCostUsdMicros) — a
   * static per-model price table, not live provider billing data. Always present it to the
   * clinic as an ESTIMATE, never as an exact charge.
   */
  estimatedCostUsd: number;
};

/**
 * Aggregates the existing usage-metering ledger (UsageEvent, written by
 * src/lib/model-router/usage-ledger.ts's recordLlmUsage) for the current calendar month,
 * scoped to one tenant — the real signal this dashboard surfaces, not a duplicate of it.
 * House style follows getAnalyticsSummary() in analytics/services/analytics-service.ts:
 * resolve the tenant's timezone before computing "this month" boundaries, simple aggregate
 * queries, no window functions.
 */
export async function getUsageSummary(tenantId: string): Promise<UsageSummary> {
  const tenant = await getTenantById(tenantId);
  const zone = resolveTimezone(tenant.timezone);
  const now = DateTime.now().setZone(zone);
  const startOfMonth = now.startOf("month").toJSDate();
  const startOfNextMonth = now.plus({ months: 1 }).startOf("month").toJSDate();

  const result = await db.usageEvent.aggregate({
    where: {
      tenantId,
      kind: "llm_call",
      createdAt: { gte: startOfMonth, lt: startOfNextMonth },
    },
    _sum: { inputTokens: true, outputTokens: true, costUsdMicros: true },
    _count: { _all: true },
  });

  return {
    monthLabel: now.toFormat("LLLL yyyy"),
    inputTokens: result._sum.inputTokens ?? 0,
    outputTokens: result._sum.outputTokens ?? 0,
    llmCallCount: result._count._all,
    estimatedCostUsd: Number(result._sum.costUsdMicros ?? BigInt(0)) / 1_000_000,
  };
}

export type CheckoutSessionResult =
  | { ok: true; url: string }
  // "not_configured": getStripeConfig() is null (no STRIPE_SECRET_KEY at all).
  // "no_price": Stripe is configured but STRIPE_PRICE_ID_PRO isn't set yet.
  // "no_app_url": APP_URL isn't set, so there's nowhere to send Stripe's success/cancel redirect.
  | { ok: false; reason: "not_configured" | "no_price" | "no_app_url" };

/**
 * Creates (or reuses) this tenant's Stripe Customer, then a Checkout Session for the Pro
 * plan's recurring price — redirecting back to Settings → Billing either way. Every failure
 * mode is a typed `reason`, never a thrown error a route handler has to guess at translating;
 * see PLACEHOLDER_PRO_PLAN_PRICE_USD in src/lib/stripe.ts for the (unconfirmed) price this
 * assumes.
 */
export async function createCheckoutSession(tenantId: string): Promise<CheckoutSessionResult> {
  const stripeConfig = getStripeConfig();
  if (!stripeConfig) return { ok: false, reason: "not_configured" };
  if (!stripeConfig.priceIdPro) return { ok: false, reason: "no_price" };
  if (!env.APP_URL) return { ok: false, reason: "no_app_url" };

  const tenant = await getTenantById(tenantId);

  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripeConfig.client.customers.create({
      metadata: { tenantId },
    });
    customerId = customer.id;
    // Persisted immediately (not only once checkout completes) so a tenant who abandons
    // checkout and retries reuses the same Stripe Customer instead of accumulating orphans.
    await db.tenant.update({ where: { id: tenantId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripeConfig.client.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: stripeConfig.priceIdPro, quantity: 1 }],
    success_url: `${env.APP_URL}/dashboard/settings/billing?checkout=success`,
    cancel_url: `${env.APP_URL}/dashboard/settings/billing?checkout=cancelled`,
    client_reference_id: tenantId,
    // Belt-and-suspenders alongside customer.metadata — the webhook handler reads tenantId
    // off whichever of these it finds first, so a tenant already resolvable from the
    // customer/subscription record isn't lost if one metadata write is ever missed.
    subscription_data: { metadata: { tenantId } },
  });

  if (!session.url) return { ok: false, reason: "not_configured" };
  return { ok: true, url: session.url };
}
